import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import {
  author,
  book,
  bookAuthor,
  bookCollection,
  collection,
  collectionType,
  readingProgress,
} from '../db/schema';
import { AddBookDto } from './dto/add-book.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { ReorderBooksDto } from './dto/reorder-books.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findAll(typeId?: number) {
    const rows = await this.db
      .select({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        typeId: collection.typeId,
        typeName: collectionType.name,
      })
      .from(collection)
      .innerJoin(collectionType, eq(collectionType.id, collection.typeId))
      .where(typeId ? eq(collection.typeId, typeId) : undefined)
      .orderBy(asc(collection.name));

    if (rows.length === 0) return [];

    const collectionIds = rows.map((c) => c.id);

    const [counts, covers] = await Promise.all([
      this.db
        .select({
          collectionId: bookCollection.collectionId,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(bookCollection)
        .where(inArray(bookCollection.collectionId, collectionIds))
        .groupBy(bookCollection.collectionId),

      this.db
        .select({
          collectionId: bookCollection.collectionId,
          bookId: bookCollection.bookId,
          order: bookCollection.order,
          coverUrl: book.coverUrl,
        })
        .from(bookCollection)
        .innerJoin(book, eq(book.id, bookCollection.bookId))
        .where(inArray(bookCollection.collectionId, collectionIds))
        .orderBy(asc(bookCollection.collectionId), asc(bookCollection.order)),
    ]);

    const coversByCollection = new Map<number, string[]>();
    for (const row of covers) {
      const existing = coversByCollection.get(row.collectionId) ?? [];
      if (existing.length < 4 && row.coverUrl) {
        existing.push(row.coverUrl);
        coversByCollection.set(row.collectionId, existing);
      }
    }

    return rows.map((c) => ({
      ...c,
      bookCount: counts.find((cnt) => cnt.collectionId === c.id)?.count ?? 0,
      covers: coversByCollection.get(c.id) ?? [],
    }));
  }

  async findOne(id: number) {
    const [found] = await this.db
      .select({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        typeId: collection.typeId,
        typeName: collectionType.name,
      })
      .from(collection)
      .innerJoin(collectionType, eq(collectionType.id, collection.typeId))
      .where(eq(collection.id, id))
      .limit(1);

    if (!found) throw new NotFoundException(`Collection ${id} not found`);

    const bookRows = await this.db
      .select({
        bookId: bookCollection.bookId,
        order: bookCollection.order,
        title: book.title,
        coverUrl: book.coverUrl,
      })
      .from(bookCollection)
      .innerJoin(book, eq(book.id, bookCollection.bookId))
      .where(eq(bookCollection.collectionId, id))
      .orderBy(asc(bookCollection.order));

    if (bookRows.length === 0) return { ...found, books: [] };

    const bookIds = bookRows.map((r) => r.bookId);

    const [authors, progress] = await Promise.all([
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
        .select()
        .from(readingProgress)
        .where(inArray(readingProgress.bookId, bookIds)),
    ]);

    const books = bookRows.map((r) => ({
      bookId: r.bookId,
      order: r.order,
      title: r.title,
      coverUrl: r.coverUrl,
      authors: authors
        .filter((a) => a.bookId === r.bookId)
        .map((a) => ({ id: a.id, name: a.name })),
      progress: progress.find((p) => p.bookId === r.bookId) ?? null,
    }));

    return { ...found, books };
  }

  async create(dto: CreateCollectionDto) {
    const [created] = await this.db
      .insert(collection)
      .values({
        name: dto.name,
        description: dto.description,
        typeId: dto.typeId,
      })
      .returning();
    return created;
  }

  async update(id: number, dto: UpdateCollectionDto) {
    const [existing] = await this.db
      .select({ id: collection.id })
      .from(collection)
      .where(eq(collection.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Collection ${id} not found`);

    const [updated] = await this.db
      .update(collection)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.typeId !== undefined && { typeId: dto.typeId }),
      })
      .where(eq(collection.id, id))
      .returning();

    return updated;
  }

  async remove(id: number) {
    const [existing] = await this.db
      .select({ id: collection.id })
      .from(collection)
      .where(eq(collection.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Collection ${id} not found`);

    await this.db.delete(collection).where(eq(collection.id, id));
  }

  async addBook(collectionId: number, dto: AddBookDto) {
    const [col] = await this.db
      .select({ id: collection.id })
      .from(collection)
      .where(eq(collection.id, collectionId))
      .limit(1);

    if (!col)
      throw new NotFoundException(`Collection ${collectionId} not found`);

    const [b] = await this.db
      .select({ id: book.id })
      .from(book)
      .where(eq(book.id, dto.bookId))
      .limit(1);

    if (!b) throw new NotFoundException(`Book ${dto.bookId} not found`);

    const [existing] = await this.db
      .select()
      .from(bookCollection)
      .where(
        and(
          eq(bookCollection.collectionId, collectionId),
          eq(bookCollection.bookId, dto.bookId),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db
        .update(bookCollection)
        .set({ order: dto.order ?? existing.order })
        .where(
          and(
            eq(bookCollection.collectionId, collectionId),
            eq(bookCollection.bookId, dto.bookId),
          ),
        );
    } else {
      await this.db
        .insert(bookCollection)
        .values({ collectionId, bookId: dto.bookId, order: dto.order });
    }
  }

  async removeBook(collectionId: number, bookId: number) {
    const [existing] = await this.db
      .select()
      .from(bookCollection)
      .where(
        and(
          eq(bookCollection.collectionId, collectionId),
          eq(bookCollection.bookId, bookId),
        ),
      )
      .limit(1);

    if (!existing)
      throw new NotFoundException(
        `Book ${bookId} not in collection ${collectionId}`,
      );

    await this.db
      .delete(bookCollection)
      .where(
        and(
          eq(bookCollection.collectionId, collectionId),
          eq(bookCollection.bookId, bookId),
        ),
      );
  }

  async reorderBooks(collectionId: number, dto: ReorderBooksDto) {
    const [col] = await this.db
      .select({ id: collection.id })
      .from(collection)
      .where(eq(collection.id, collectionId))
      .limit(1);

    if (!col)
      throw new NotFoundException(`Collection ${collectionId} not found`);

    await this.db.transaction(async (tx) => {
      for (const { bookId, order } of dto.books) {
        await tx
          .update(bookCollection)
          .set({ order })
          .where(
            and(
              eq(bookCollection.collectionId, collectionId),
              eq(bookCollection.bookId, bookId),
            ),
          );
      }
    });
  }
}
