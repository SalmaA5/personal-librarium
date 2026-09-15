import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import type { Response } from 'express';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import { book } from '../db/schema';
import { DriveService } from '../drive/drive.service';

const FORMAT_CONTENT_TYPE: Record<string, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  html: 'text/html; charset=utf-8',
  cbz: 'application/x-cbz',
};

@Injectable()
export class ReaderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    private readonly driveService: DriveService,
  ) {}

  async getReadContent(bookId: number) {
    const [found] = await this.db
      .select({
        id: book.id,
        format: book.format,
        fileStatus: book.fileStatus,
        cachedPath: book.cachedPath,
        driveFileId: book.driveFileId,
      })
      .from(book)
      .where(eq(book.id, bookId))
      .limit(1);

    if (!found) throw new NotFoundException(`Book ${bookId} not found`);

    if (found.format === 'html' && found.fileStatus === 'cached') {
      if (!found.cachedPath) {
        throw new NotFoundException(
          `Book ${bookId} is cached but cachedPath is missing`,
        );
      }
      const content = fs.readFileSync(
        found.cachedPath.startsWith('/')
          ? found.cachedPath
          : process.cwd() + found.cachedPath,
        'utf-8',
      );
      return { type: 'html' as const, content };
    }

    if (!found.driveFileId) {
      throw new NotFoundException(`Book ${bookId} has no Drive file attached`);
    }

    return { type: 'stream' as const, driveFileId: found.driveFileId };
  }

  async streamBook(bookId: number, res: Response) {
    const [found] = await this.db
      .select({
        id: book.id,
        format: book.format,
        driveFileId: book.driveFileId,
      })
      .from(book)
      .where(eq(book.id, bookId))
      .limit(1);

    if (!found) throw new NotFoundException(`Book ${bookId} not found`);
    if (!found.driveFileId) {
      throw new NotFoundException(`Book ${bookId} has no Drive file attached`);
    }

    const contentType =
      FORMAT_CONTENT_TYPE[found.format] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = await this.driveService.streamFile(found.driveFileId);
    stream.pipe(res);
  }
}
