import type { Author, ReadingProgress } from './book.types.js';

export interface CollectionType {
  id: number;
  name: string;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  typeId: number;
  typeName: string;
  bookCount: number;
  covers: string[];
}

export interface CollectionBook {
  bookId: number;
  order: number | null;
  title: string;
  coverUrl: string | null;
  authors: Author[];
  progress: ReadingProgress | null;
}

export interface CollectionDetail {
  id: number;
  name: string;
  description: string | null;
  typeId: number;
  typeName: string;
  books: CollectionBook[];
}

export interface CreateCollectionDto {
  name: string;
  description?: string;
  typeId: number;
}

export interface UpdateCollectionDto extends Partial<CreateCollectionDto> {}

export interface AddBookDto {
  bookId: number;
  order?: number;
}
