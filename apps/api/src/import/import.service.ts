import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'html',
  'application/x-cbz': 'cbz',
};

@Injectable()
export class ImportService {
  constructor(
    private readonly driveService: DriveService,
    private readonly booksService: BooksService,
  ) {}

  async importFromDrive(driveFileId: string) {
    // Step 1 — file metadata
    let fileMeta: Awaited<ReturnType<DriveService['getFile']>>;
    try {
      fileMeta = await this.driveService.getFile(driveFileId);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 1 failed — could not fetch Drive metadata: ${String(e)}`,
      );
    }

    const mimeType = fileMeta.mimeType ?? '';
    const format = MIME_TO_FORMAT[mimeType];
    if (!format) {
      throw new InternalServerErrorException(
        `Step 1 failed — unsupported mimeType: ${mimeType}`,
      );
    }
    const fileName = fileMeta.name ?? driveFileId;

    // Step 2 — download
    let buffer: Buffer;
    try {
      buffer = await this.driveService.downloadFile(driveFileId);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 2 failed — could not download file: ${String(e)}`,
      );
    }

    // Step 3 — extract metadata
    let title = fileName.replace(/\.[^.]+$/, '');
    let authors: string[] = [];
    let coverBuffer: Buffer | null = null;
    let htmlContent: string | null = null;

    try {
      if (format === 'epub') {
        ({ title, authors, coverBuffer } = await this.extractEpubMeta(buffer));
      } else if (format === 'pdf') {
        ({ title, authors } = await this.extractPdfMeta(buffer, title));
      } else if (format === 'html') {
        const result = await mammoth.convertToHtml({ buffer });
        htmlContent = result.value;
      }
      // cbz — title is filename, first image could be cover but we skip for now
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 3 failed — metadata extraction error: ${String(e)}`,
      );
    }

    // Step 4 — thumbnail
    let coverUrl: string | undefined;
    try {
      coverUrl = await this.generateThumbnail(coverBuffer, title);
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 4 failed — thumbnail generation error: ${String(e)}`,
      );
    }

    // Save HTML to disk if DOCX
    let cachedPath: string | undefined;
    if (format === 'html' && htmlContent !== null) {
      try {
        fs.mkdirSync(HTML_DIR, { recursive: true });
        const htmlFilename = `${randomUUID()}.html`;
        const htmlDest = path.join(HTML_DIR, htmlFilename);
        fs.writeFileSync(htmlDest, htmlContent, 'utf-8');
        cachedPath = `/uploads/html/${htmlFilename}`;
      } catch (e) {
        throw new InternalServerErrorException(
          `Step 4 failed — HTML write error: ${String(e)}`,
        );
      }
    }

    // Step 5 — save to DB
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

      // Step 6 — return
      return created;
    } catch (e) {
      throw new InternalServerErrorException(
        `Step 5 failed — database insert error: ${String(e)}`,
      );
    }
  }

  // --- private helpers ---

  private async extractEpubMeta(buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer);

    // locate OPF
    const containerXml = await zip
      .file('META-INF/container.xml')
      ?.async('string');
    const opfPath = containerXml?.match(/full-path="([^"]+\.opf)"/)?.[1];
    const opfContent = opfPath
      ? await zip.file(opfPath)?.async('string')
      : null;

    const title =
      opfContent?.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)?.[1]?.trim() ??
      '';
    const authorsRaw =
      opfContent?.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/g) ?? [];
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
    const title =
      (data.info?.Title as string | undefined)?.trim() || fallbackTitle;
    const authorRaw = (data.info?.Author as string | undefined)?.trim();
    const authors = authorRaw ? [authorRaw] : [];
    return { title, authors };
  }

  private async generateThumbnail(
    coverBuffer: Buffer | null,
    title: string,
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
        (c) =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c,
      );
      const svg = Buffer.from(
        `<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="450" fill="#3d5a80"/>
          <text x="150" y="225" font-family="sans-serif" font-size="20" fill="white"
            text-anchor="middle" dominant-baseline="middle"
            style="word-spacing:2px">${safeTitle}</text>
        </svg>`,
      );
      await sharp(svg).jpeg({ quality: 85 }).toFile(dest);
    }

    return `/uploads/covers/${filename}`;
  }
}
