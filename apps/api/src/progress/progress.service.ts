import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import { book, readingProgress } from '../db/schema';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findOne(bookId: number) {
    const [row] = await this.db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.bookId, bookId))
      .limit(1);

    if (!row) {
      return {
        bookId,
        percentage: 0,
        currentPage: null,
        epubCfi: null,
        lastReadAt: null,
      };
    }

    return row;
  }

  async upsert(bookId: number, dto: UpdateProgressDto) {
    const [found] = await this.db
      .select({ id: book.id })
      .from(book)
      .where(eq(book.id, bookId))
      .limit(1);

    if (!found) throw new NotFoundException(`Book ${bookId} not found`);

    const [existing] = await this.db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.bookId, bookId))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(readingProgress)
        .set({
          ...(dto.currentPage !== undefined && { currentPage: dto.currentPage }),
          ...(dto.totalPages !== undefined && { totalPages: dto.totalPages }),
          ...(dto.epubCfi !== undefined && { epubCfi: dto.epubCfi }),
          ...(dto.percentage !== undefined && { percentage: dto.percentage }),
          lastReadAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(readingProgress.bookId, bookId))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(readingProgress)
      .values({
        bookId,
        currentPage: dto.currentPage,
        totalPages: dto.totalPages,
        epubCfi: dto.epubCfi,
        percentage: dto.percentage,
      })
      .returning();

    return created;
  }
}
