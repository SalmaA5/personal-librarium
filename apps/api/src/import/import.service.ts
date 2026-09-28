import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';
import { BooksService } from '../books/books.service';
import { DriveService } from '../drive/drive.service';

const COVERS_DIR = path.resolve(process.cwd(), 'uploads', 'covers');
const HTML_DIR = path.resolve(process.cwd(), 'uploads', 'html');

const MIME_TO_FORMAT: Record<string, 'epub' | 'pdf' | 'html' | 'cbz'> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'html',
  'application/x-cbz': 'cbz',
};

@Injectable()
export class ImportService {
  private readonly logger = new Logger('ImportService');

  constructor(
    private readonly driveService: DriveService,
    private readonly booksService: BooksService
  ) {}

  async importFromDrive(driveFileId: string) {
    this.logger.log(`[import] START driveFileId=${driveFileId}`);

    // Step 1 — file metadata
    let fileMeta: Awaited<ReturnType<DriveService['getFile']>>;
    try {
      fileMeta = await this.driveService.getFile(driveFileId);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 1 failed — could not fetch Drive metadata: ${String(e)}`
      );
    }

    const mimeType = fileMeta.mimeType ?? '';
    const format = MIME_TO_FORMAT[mimeType];
    if (!format) {
      throw new InternalServerErrorException(
        `Step 1 failed — unsupported mimeType: ${mimeType}`
      );
    }
    const fileName = fileMeta.name ?? driveFileId;
    this.logger.log(
      `[import] Step 1 OK — name="${fileName}" mimeType="${mimeType}" format="${format}" size=${fileMeta.size ?? 'unknown'}`
    );

    // Step 2 — download
    let buffer: Buffer;
    try {
      buffer = await this.driveService.downloadFile(driveFileId);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 2 failed — could not download file: ${String(e)}`
      );
    }
    this.logger.log(`[import] Step 2 OK — downloaded ${buffer.length} bytes`);

    // Step 3 — extract metadata
    let title = fileName.replace(/\.[^.]+$/, '');
    let authors: string[] = [];
    let coverBuffer: Buffer | null = null;
    let htmlContent: string | null = null;

    try {
      if (format === 'epub') {
        this.logger.log(`[import] Step 3 — extracting EPUB metadata`);
        ({ title, authors, coverBuffer } = await this.extractEpubMeta(buffer));
      } else if (format === 'pdf') {
        this.logger.log(`[import] Step 3 — extracting PDF metadata`);
        ({ title, authors } = await this.extractPdfMeta(buffer, title));
      } else if (format === 'html') {
        this.logger.log(
          `[import] Step 3 — converting DOCX to HTML via mammoth (buffer size=${buffer.length})`
        );
        const result = await mammoth.convertToHtml({ buffer });
        htmlContent = result.value;
        if (result.messages?.length) {
          this.logger.warn(
            `[import] Step 3 mammoth messages: ${JSON.stringify(result.messages)}`
          );
        }
        this.logger.log(
          `[import] Step 3 OK — mammoth htmlContent length=${htmlContent.length}`
        );

        // Fallback: if mammoth produced nothing (e.g. w:altChunk DOCX), extract embedded HTML from ZIP
        if (!htmlContent) {
          this.logger.log(
            `[import] Step 3 — mammoth returned empty, trying altChunk extraction`
          );
          const rawChunk = await this.extractAltChunkHtml(buffer);
          htmlContent = this.cleanHtmlToBody(rawChunk);
          this.logger.log(
            `[import] Step 3 altChunk extraction — htmlContent length=${htmlContent.length}`
          );
        }
      }
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 3 failed — metadata extraction error: ${String(e)}`
      );
    }
    this.logger.log(
      `[import] Step 3 OK — title="${title}" authors=${JSON.stringify(authors)} hasCover=${!!coverBuffer}`
    );

    // Step 4 — thumbnail
    let coverUrl: string | undefined;
    try {
      this.logger.log(
        `[import] Step 4a — generating thumbnail (hasCoverBuffer=${!!coverBuffer})`
      );
      coverUrl = await this.generateThumbnail(coverBuffer, title);
      this.logger.log(`[import] Step 4a OK — coverUrl="${coverUrl}"`);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 4 failed — thumbnail generation error: ${String(e)}`
      );
    }

    // Save HTML to disk if DOCX
    let cachedPath: string | undefined;
    if (format === 'html') {
      if (htmlContent === null) {
        this.logger.warn(
          `[import] Step 4b WARN — htmlContent is null, skipping HTML write`
        );
      } else if (htmlContent.length === 0) {
        this.logger.warn(
          `[import] Step 4b WARN — htmlContent is EMPTY STRING, mammoth produced no output`
        );
      }
      if (htmlContent !== null) {
        try {
          this.logger.log(
            `[import] Step 4b — writing HTML to disk (length=${htmlContent.length})`
          );
          fs.mkdirSync(HTML_DIR, { recursive: true });
          const htmlFilename = `${randomUUID()}.html`;
          const htmlDest = path.join(HTML_DIR, htmlFilename);
          fs.writeFileSync(htmlDest, htmlContent, 'utf-8');
          cachedPath = `/uploads/html/${htmlFilename}`;
          this.logger.log(`[import] Step 4b OK — wrote HTML to ${htmlDest}`);
        } catch (e) {
          throw new InternalServerErrorException(
            `Step 4 failed — HTML write error: ${String(e)}`
          );
        }
      }
    }

    // Step 5 — save to DB
    this.logger.log(`[import] Step 5 — saving to DB (cachedPath="${cachedPath}")`);
    try {
      const created = await this.booksService.create({
        title,
        authors,
        format,
        fileStatus: format === 'html' ? 'cached' : 'drive_only',
        driveFileId,
        coverUrl,
        cachedPath,
      });

      this.logger.log(`[import] Step 5 OK — book created id=${created.id}`);
      this.logger.log(`[import] DONE driveFileId=${driveFileId}`);
      return created;
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 5 failed — database insert error: ${String(e)}`
      );
    }
  }

  // --- private helpers ---

  private async extractEpubMeta(buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer);

    // locate OPF
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    const opfPath = containerXml?.match(/full-path="([^"]+\.opf)"/)?.[1];
    const opfContent = opfPath ? await zip.file(opfPath)?.async('string') : null;

    const title =
      opfContent?.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)?.[1]?.trim() ?? '';
    const authorsRaw = opfContent?.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/g) ?? [];
    const authors = authorsRaw.map((a) => a.replace(/<[^>]+>/g, '').trim());

    // cover image
    const coverId = opfContent?.match(/name="cover"\s+content="([^"]+)"/)?.[1];
    const coverHref = coverId
      ? opfContent?.match(new RegExp(`id="${coverId}"[^>]+href="([^"]+)"`))?.[1]
      : opfContent?.match(/media-type="image\/[^"]+"\s+href="([^"]+)"/)?.[1];

    let coverBuffer: Buffer | null = null;
    if (coverHref && opfPath) {
      const opfDir = opfPath.includes('/')
        ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
        : '';
      const coverPath = opfDir + coverHref;
      const coverData = await zip.file(coverPath)?.async('nodebuffer');
      coverBuffer = coverData ?? null;
    }

    return { title, authors, coverBuffer };
  }

  private async extractPdfMeta(buffer: Buffer, fallbackTitle: string) {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getInfo();
    await parser.destroy();
    const title = (data.info?.Title as string | undefined)?.trim() || fallbackTitle;
    const authorRaw = (data.info?.Author as string | undefined)?.trim();
    const authors = authorRaw ? [authorRaw] : [];
    return { title, authors };
  }

  private cleanHtmlToBody(raw: string): string {
    // Strip MHT wrapper headers (everything before the first <html tag)
    const html = raw.includes('MIME-Version')
      ? raw.replace(/^[\s\S]*?<html/i, '<html')
      : raw;
    // Extract only body content so the stored file is clean HTML fragments
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1].trim() : html.trim();
  }

  private async extractAltChunkHtml(buffer: Buffer): Promise<string> {
    const zip = await JSZip.loadAsync(buffer);

    const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
    if (!relsXml) return '';

    // Split on <Relationship and find entries with aFChunk type
    const targets: string[] = [];
    for (const segment of relsXml.split('<Relationship')) {
      if (/afchunk/i.test(segment)) {
        const m = /Target="([^"]+)"/i.exec(segment);
        if (m) {
          const target = m[1];
          // Target is relative to word/ unless it starts with /
          targets.push(target.startsWith('/') ? target.slice(1) : `word/${target}`);
        }
      }
    }

    if (targets.length === 0) {
      this.logger.warn(
        `[import] altChunk — no aFChunk relationships found in word/_rels/document.xml.rels`
      );
      return '';
    }

    this.logger.log(
      `[import] altChunk — found ${targets.length} chunk(s): ${targets.join(', ')}`
    );
    const parts: string[] = [];
    for (const target of targets) {
      const content = await zip.file(target)?.async('string');
      if (content) {
        this.logger.log(
          `[import] altChunk — extracted ${content.length} chars from ${target}`
        );
        parts.push(content);
      } else {
        this.logger.warn(`[import] altChunk — file not found in ZIP: ${target}`);
      }
    }

    return parts.join('\n');
  }

  private async generateThumbnail(
    coverBuffer: Buffer | null,
    title: string
  ): Promise<string> {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    const filename = `${randomUUID()}.jpg`;
    const dest = path.join(COVERS_DIR, filename);

    if (coverBuffer) {
      await sharp(coverBuffer)
        .resize(300, 450, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(dest);
    } else {
      // solid-color placeholder with title text via SVG
      const safeTitle = title.replace(
        /[<>&"]/g,
        (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c
      );
      const svg = Buffer.from(
        `<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="450" fill="#3d5a80"/>
          <text x="150" y="225" font-family="sans-serif" font-size="20" fill="white"
            text-anchor="middle" dominant-baseline="middle"
            style="word-spacing:2px">${safeTitle}</text>
        </svg>`
      );
      await sharp(svg).jpeg({ quality: 85 }).toFile(dest);
    }

    return `/uploads/covers/${filename}`;
  }
}
