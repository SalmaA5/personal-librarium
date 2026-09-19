import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, inArray, like, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import {
  author,
  book,
  bookAuthor,
  bookCollection,
  bookGenre,
  bookTag,
  collection,
  genre,
  readingProgress,
  relatedBook,
  tag,
} from '../db/schema';
import { BookFiltersDto } from './dto/book-filters.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const DEFAULT_COVER = '/assets/default-cover.png';

@Injectable()
export class BooksService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findAll(filters: BookFiltersDto) {
    const {
      search,
      genre: genreFilter,
      tag: tagFilter,
      status,
      format,
      collection: collectionFilter,
      sort = 'title',
      order = 'asc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(book.title, `%${search}%`),
          inArray(
            book.id,
            this.db
              .select({ id: bookAuthor.bookId })
              .from(bookAuthor)
              .innerJoin(author, eq(author.id, bookAuthor.authorId))
              .where(like(author.name, `%${search}%`))
          )
        )
      );
    }

    if (status) conditions.push(eq(book.status, status as 'unread' | 'reading' | 'read'));
    if (format)
      conditions.push(eq(book.format, format as 'epub' | 'pdf' | 'html' | 'cbz'));

    if (genreFilter) {
      conditions.push(
        inArray(
          book.id,
          this.db
            .select({ id: bookGenre.bookId })
            .from(bookGenre)
            .innerJoin(genre, eq(genre.id, bookGenre.genreId))
            .where(eq(genre.name, genreFilter))
        )
      );
    }

    if (tagFilter) {
      conditions.push(
        inArray(
          book.id,
          this.db
            .select({ id: bookTag.bookId })
            .from(bookTag)
            .innerJoin(tag, eq(tag.id, bookTag.tagId))
            .where(eq(tag.name, tagFilter))
        )
      );
    }

    if (collectionFilter) {
      conditions.push(
        inArray(
          book.id,
          this.db
            .select({ id: bookCollection.bookId })
            .from(bookCollection)
            .innerJoin(collection, eq(collection.id, bookCollection.collectionId))
            .where(eq(collection.name, collectionFilter))
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await this.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(book)
      .where(where);

    const bookCols = getTableColumns(book);
    let books: (typeof book.$inferSelect)[];

    if (sort === 'lastRead') {
      const lp = this.db
        .select({
          bookId: readingProgress.bookId,
          lastReadAt: sql<string>`max(${readingProgress.lastReadAt})`.as('last_read_at'),
        })
        .from(readingProgress)
        .groupBy(readingProgress.bookId)
        .as('lp');

      books = await this.db
        .select(bookCols)
        .from(book)
        .leftJoin(lp, eq(lp.bookId, book.id))
        .where(where)
        .orderBy(order === 'asc' ? asc(lp.lastReadAt) : desc(lp.lastReadAt))
        .limit(limit)
        .offset(offset);
    } else if (sort === 'author') {
      const fa = this.db
        .select({
          bookId: bookAuthor.bookId,
          name: sql<string>`min(${author.name})`.as('author_name'),
        })
        .from(bookAuthor)
        .innerJoin(author, eq(author.id, bookAuthor.authorId))
        .groupBy(bookAuthor.bookId)
        .as('fa');

      books = await this.db
        .select(bookCols)
        .from(book)
        .leftJoin(fa, eq(fa.bookId, book.id))
        .where(where)
        .orderBy(order === 'asc' ? asc(fa.name) : desc(fa.name))
        .limit(limit)
        .offset(offset);
    } else {
      const sortCol = sort === 'createdAt' ? book.createdAt : book.title;
      books = await this.db
        .select()
        .from(book)
        .where(where)
        .orderBy(order === 'asc' ? asc(sortCol) : desc(sortCol))
        .limit(limit)
        .offset(offset);
    }

    if (books.length === 0) return { data: [], total, page, limit };

    const bookIds = books.map((b) => b.id);

    const [authors, genres, tags, progress] = await Promise.all([
      this.db
        .select({
          bookId: bookAuthor.bookId,
          id: author.id,
          name: author.name,
        })
        .from(bookAuthor)
        .innerJoin(author, eq(author.id, bookAuthor.authorId))
        .where(inArray(bookAuthor.bookId, bookIds)),
      this.db
        .select({ bookId: bookGenre.bookId, id: genre.id, name: genre.name })
        .from(bookGenre)
        .innerJoin(genre, eq(genre.id, bookGenre.genreId))
        .where(inArray(bookGenre.bookId, bookIds)),
      this.db
        .select({ bookId: bookTag.bookId, id: tag.id, name: tag.name })
        .from(bookTag)
        .innerJoin(tag, eq(tag.id, bookTag.tagId))
        .where(inArray(bookTag.bookId, bookIds)),
      this.db
        .select()
        .from(readingProgress)
        .where(inArray(readingProgress.bookId, bookIds)),
    ]);

    const data = books.map((b) => ({
      ...b,
      authors: authors.filter((a) => a.bookId === b.id),
      genres: genres.filter((g) => g.bookId === b.id),
      tags: tags.filter((t) => t.bookId === b.id),
      progress: progress.find((p) => p.bookId === b.id) ?? null,
    }));

    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const [found] = await this.db.select().from(book).where(eq(book.id, id)).limit(1);

    if (!found) throw new NotFoundException(`Book ${id} not found`);

    const [authors, genres, tags, collections, related, progress] = await Promise.all([
      this.db
        .select({ id: author.id, name: author.name })
        .from(bookAuthor)
        .innerJoin(author, eq(author.id, bookAuthor.authorId))
        .where(eq(bookAuthor.bookId, id)),
      this.db
        .select({ id: genre.id, name: genre.name })
        .from(bookGenre)
        .innerJoin(genre, eq(genre.id, bookGenre.genreId))
        .where(eq(bookGenre.bookId, id)),
      this.db
        .select({ id: tag.id, name: tag.name })
        .from(bookTag)
        .innerJoin(tag, eq(tag.id, bookTag.tagId))
        .where(eq(bookTag.bookId, id)),
      this.db
        .select({
          id: collection.id,
          name: collection.name,
          typeId: collection.typeId,
          order: bookCollection.order,
        })
        .from(bookCollection)
        .innerJoin(collection, eq(collection.id, bookCollection.collectionId))
        .where(eq(bookCollection.bookId, id)),
      this.db
        .select({
          id: book.id,
          title: book.title,
          coverUrl: book.coverUrl,
          relationType: relatedBook.relationType,
        })
        .from(relatedBook)
        .innerJoin(book, eq(book.id, relatedBook.relatedBookId))
        .where(eq(relatedBook.bookId, id)),
      this.db.select().from(readingProgress).where(eq(readingProgress.bookId, id)),
    ]);

    return { ...found, authors, genres, tags, collections, related, progress };
  }

  async create(dto: CreateBookDto) {
    const {
      authors: authorNames = [],
      genres: genreNames = [],
      tags: tagNames = [],
      ...bookData
    } = dto;

    return this.db.transaction(async (tx) => {
      const [newBook] = await tx
        .insert(book)
        .values({
          title: bookData.title,
          synopsis: bookData.synopsis,
          coverUrl: bookData.coverUrl,
          driveFileId: bookData.driveFileId,
          format: bookData.format ?? 'epub',
          fileStatus: bookData.fileStatus ?? 'drive_only',
          cachedPath: bookData.cachedPath,
          status: bookData.status ?? 'unread',
          totalChapters: bookData.totalChapters,
          totalVolumes: bookData.totalVolumes,
          year: bookData.year,
          publisher: bookData.publisher,
          rating: bookData.rating,
          review: bookData.review,
          originalFormat: bookData.originalFormat,
        })
        .returning();

      await this.syncAuthors(tx, newBook.id, authorNames);
      await this.syncGenres(tx, newBook.id, genreNames);
      await this.syncTags(tx, newBook.id, tagNames);

      return newBook;
    });
  }

  async update(id: number, dto: UpdateBookDto) {
    const [existing] = await this.db
      .select({ id: book.id })
      .from(book)
      .where(eq(book.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Book ${id} not found`);

    const { authors: authorNames, genres: genreNames, tags: tagNames, ...bookData } = dto;

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(book)
        .set({
          ...bookData,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(book.id, id))
        .returning();

      if (authorNames !== undefined) await this.syncAuthors(tx, id, authorNames);
      if (genreNames !== undefined) await this.syncGenres(tx, id, genreNames);
      if (tagNames !== undefined) await this.syncTags(tx, id, tagNames);

      return updated;
    });
  }

  async remove(id: number) {
    const [existing] = await this.db
      .select({ id: book.id })
      .from(book)
      .where(eq(book.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Book ${id} not found`);

    await this.db.delete(book).where(eq(book.id, id));
  }

  async getCover(id: number) {
    const [found] = await this.db
      .select({ coverUrl: book.coverUrl })
      .from(book)
      .where(eq(book.id, id))
      .limit(1);

    if (!found) throw new NotFoundException(`Book ${id} not found`);

    return { coverUrl: found.coverUrl ?? DEFAULT_COVER };
  }

  // --- private helpers ---

  private async syncAuthors(
    tx: Parameters<Parameters<DrizzleClient['transaction']>[0]>[0],
    bookId: number,
    names: string[]
  ) {
    await tx.delete(bookAuthor).where(eq(bookAuthor.bookId, bookId));
    for (const name of names) {
      const existing = await tx
        .select({ id: author.id })
        .from(author)
        .where(eq(author.name, name))
        .limit(1);
      const authorId =
        existing.length > 0
          ? existing[0].id
          : (await tx.insert(author).values({ name }).returning({ id: author.id }))[0].id;
      await tx.insert(bookAuthor).values({ bookId, authorId });
    }
  }

  private async syncGenres(
    tx: Parameters<Parameters<DrizzleClient['transaction']>[0]>[0],
    bookId: number,
    names: string[]
  ) {
    await tx.delete(bookGenre).where(eq(bookGenre.bookId, bookId));
    for (const name of names) {
      const existing = await tx
        .select({ id: genre.id })
        .from(genre)
        .where(eq(genre.name, name))
        .limit(1);
      const genreId =
        existing.length > 0
          ? existing[0].id
          : (await tx.insert(genre).values({ name }).returning({ id: genre.id }))[0].id;
      await tx.insert(bookGenre).values({ bookId, genreId });
    }
  }

  private async syncTags(
    tx: Parameters<Parameters<DrizzleClient['transaction']>[0]>[0],
    bookId: number,
    names: string[]
  ) {
    await tx.delete(bookTag).where(eq(bookTag.bookId, bookId));
    for (const name of names) {
      const existing = await tx
        .select({ id: tag.id })
        .from(tag)
        .where(eq(tag.name, name))
        .limit(1);
      const tagId =
        existing.length > 0
          ? existing[0].id
          : (await tx.insert(tag).values({ name }).returning({ id: tag.id }))[0].id;
      await tx.insert(bookTag).values({ bookId, tagId });
    }
  }
}
