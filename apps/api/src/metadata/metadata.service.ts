import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import { author, bookAuthor, bookGenre, bookTag, genre, tag } from '../db/schema';

@Injectable()
export class MetadataService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  // ── Genres ─────────────────────────────────────────────────────────────────
  getGenres() {
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

  async createGenre(name: string) {
    const [created] = await this.db.insert(genre).values({ name }).returning();
    return { ...created, count: 0 };
  }

  async updateGenre(id: number, name: string) {
    const [existing] = await this.db
      .select({ id: genre.id })
      .from(genre)
      .where(eq(genre.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Genre ${id} not found`);
    const [updated] = await this.db
      .update(genre)
      .set({ name })
      .where(eq(genre.id, id))
      .returning();
    return updated;
  }

  async deleteGenre(id: number) {
    const [existing] = await this.db
      .select({ id: genre.id })
      .from(genre)
      .where(eq(genre.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Genre ${id} not found`);
    const [inUse] = await this.db
      .select({ id: bookGenre.bookId })
      .from(bookGenre)
      .where(eq(bookGenre.genreId, id))
      .limit(1);
    if (inUse) throw new ConflictException(`Genre ${id} has associated books`);
    await this.db.delete(genre).where(eq(genre.id, id));
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  getTags() {
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

  async createTag(name: string) {
    const [created] = await this.db.insert(tag).values({ name }).returning();
    return { ...created, count: 0 };
  }

  async updateTag(id: number, name: string) {
    const [existing] = await this.db
      .select({ id: tag.id })
      .from(tag)
      .where(eq(tag.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Tag ${id} not found`);
    const [updated] = await this.db
      .update(tag)
      .set({ name })
      .where(eq(tag.id, id))
      .returning();
    return updated;
  }

  async deleteTag(id: number) {
    const [existing] = await this.db
      .select({ id: tag.id })
      .from(tag)
      .where(eq(tag.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Tag ${id} not found`);
    const [inUse] = await this.db
      .select({ id: bookTag.bookId })
      .from(bookTag)
      .where(eq(bookTag.tagId, id))
      .limit(1);
    if (inUse) throw new ConflictException(`Tag ${id} has associated books`);
    await this.db.delete(tag).where(eq(tag.id, id));
  }

  // ── Authors ────────────────────────────────────────────────────────────────
  getAuthors() {
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

  async createAuthor(name: string) {
    const [created] = await this.db.insert(author).values({ name }).returning();
    return { ...created, count: 0 };
  }

  async updateAuthor(id: number, name: string) {
    const [existing] = await this.db
      .select({ id: author.id })
      .from(author)
      .where(eq(author.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Author ${id} not found`);
    const [updated] = await this.db
      .update(author)
      .set({ name })
      .where(eq(author.id, id))
      .returning();
    return updated;
  }

  async deleteAuthor(id: number) {
    const [existing] = await this.db
      .select({ id: author.id })
      .from(author)
      .where(eq(author.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Author ${id} not found`);
    const [inUse] = await this.db
      .select({ id: bookAuthor.bookId })
      .from(bookAuthor)
      .where(eq(bookAuthor.authorId, id))
      .limit(1);
    if (inUse) throw new ConflictException(`Author ${id} has associated books`);
    await this.db.delete(author).where(eq(author.id, id));
  }
}
