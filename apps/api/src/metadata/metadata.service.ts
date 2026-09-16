import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import {
  author,
  bookAuthor,
  bookGenre,
  bookTag,
  genre,
  tag,
} from '../db/schema';

@Injectable()
export class MetadataService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async getGenres() {
    return this.db
      .select({
        id: genre.id,
        name: genre.name,
        count: sql<number>`cast(count(${bookGenre.bookId}) as integer)`,
      })
      .from(genre)
      .leftJoin(bookGenre, eq(genre.id, bookGenre.genreId))
      .groupBy(genre.id)
      .orderBy(asc(genre.name));
  }

  async getTags() {
    return this.db
      .select({
        id: tag.id,
        name: tag.name,
        count: sql<number>`cast(count(${bookTag.bookId}) as integer)`,
      })
      .from(tag)
      .leftJoin(bookTag, eq(tag.id, bookTag.tagId))
      .groupBy(tag.id)
      .orderBy(asc(tag.name));
  }

  async getAuthors() {
    return this.db
      .select({
        id: author.id,
        name: author.name,
        count: sql<number>`cast(count(${bookAuthor.bookId}) as integer)`,
      })
      .from(author)
      .leftJoin(bookAuthor, eq(author.id, bookAuthor.authorId))
      .groupBy(author.id)
      .orderBy(asc(author.name));
  }
}
