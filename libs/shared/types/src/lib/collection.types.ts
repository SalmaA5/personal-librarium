import { Book } from './book.types.js';

export type CollectionType = 'series' | 'anthology' | 'thematic';

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  type: CollectionType;
}

export interface CollectionDetail extends Collection {
  books: Book[];
}

export interface CreateCollectionDto {
  name: string;
  description?: string;
  type: CollectionType;
}

export interface UpdateCollectionDto extends Partial<CreateCollectionDto> {}

export interface AddBookDto {
  bookId: number;
  order?: number;
}
