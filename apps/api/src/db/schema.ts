import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

export const author = sqliteTable('author', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const genre = sqliteTable('genre', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const tag = sqliteTable('tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const collection = sqliteTable('collection', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['series', 'anthology', 'thematic'] }).notNull(),
});

export const book = sqliteTable('book', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  synopsis: text('synopsis'),
  coverUrl: text('cover_url'),
  driveFileId: text('drive_file_id'),
  format: text('format', { enum: ['epub', 'pdf', 'html', 'cbz'] }).notNull(),
  fileStatus: text('file_status', {
    enum: ['drive_only', 'cached', 'downloaded'],
  })
    .notNull()
    .default('drive_only'),
  cachedPath: text('cached_path'),
  status: text('status', { enum: ['unread', 'reading', 'read'] })
    .notNull()
    .default('unread'),
  totalChapters: integer('total_chapters'),
  totalVolumes: integer('total_volumes'),
  year: integer('year'),
  publisher: text('publisher'),
  rating: real('rating'),
  review: text('review'),
  originalFormat: text('original_format'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const readingProgress = sqliteTable('reading_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id')
    .notNull()
    .references(() => book.id, { onDelete: 'cascade' }),
  currentPage: integer('current_page'),
  totalPages: integer('total_pages'),
  epubCfi: text('epub_cfi'),
  percentage: real('percentage'),
  lastReadAt: text('last_read_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const bookAuthor = sqliteTable(
  'book_author',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => author.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.authorId] })],
);

export const bookGenre = sqliteTable(
  'book_genre',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genre.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.genreId] })],
);

export const bookTag = sqliteTable(
  'book_tag',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.tagId] })],
);

export const bookCollection = sqliteTable(
  'book_collection',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.collectionId] })],
);

export const relatedBook = sqliteTable(
  'related_book',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    relatedBookId: integer('related_book_id')
      .notNull()
      .references(() => book.id, { onDelete: 'cascade' }),
    relationType: text('relation_type', {
      enum: ['sequel', 'prequel', 'spinoff', 'companion'],
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.relatedBookId] })],
);
