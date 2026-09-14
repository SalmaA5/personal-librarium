import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import { book, bookGenre, genre, readingProgress } from '../db/schema';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async getStats() {
    const [counts, byGenre, byFormat, recentlyRead] = await Promise.all([
      this.db
        .select({
          total: sql<number>`cast(count(*) as integer)`,
          read: sql<number>`cast(sum(case when ${book.status} = 'read' then 1 else 0 end) as integer)`,
          reading: sql<number>`cast(sum(case when ${book.status} = 'reading' then 1 else 0 end) as integer)`,
          unread: sql<number>`cast(sum(case when ${book.status} = 'unread' then 1 else 0 end) as integer)`,
        })
        .from(book),

      this.db
        .select({
          name: genre.name,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(bookGenre)
        .innerJoin(genre, eq(genre.id, bookGenre.genreId))
        .groupBy(genre.name)
        .orderBy(desc(sql`count(*)`)),

      this.db
        .select({
          format: book.format,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(book)
        .groupBy(book.format)
        .orderBy(desc(sql`count(*)`)),

      this.db
        .select({
          id: book.id,
          title: book.title,
          coverUrl: book.coverUrl,
          lastReadAt: readingProgress.lastReadAt,
        })
        .from(readingProgress)
        .innerJoin(book, eq(book.id, readingProgress.bookId))
        .orderBy(desc(readingProgress.lastReadAt))
        .limit(5),
    ]);

    const [row] = counts;

    return {
      totalBooks: row?.total ?? 0,
      readBooks: row?.read ?? 0,
      readingBooks: row?.reading ?? 0,
      unreadBooks: row?.unread ?? 0,
      byGenre,
      byFormat,
      recentlyRead: recentlyRead.map((r) => ({
        id: r.id,
        title: r.title,
        coverUrl: r.coverUrl ?? null,
        lastReadAt: r.lastReadAt,
      })),
    };
  }
}
