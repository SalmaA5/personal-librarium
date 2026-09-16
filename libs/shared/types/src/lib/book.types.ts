export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type BookFormat = 'epub' | 'pdf' | 'html' | 'cbz';
export type BookStatus = 'unread' | 'reading' | 'read';
export type FileStatus = 'drive_only' | 'cached' | 'downloaded';

export interface Book {
  id: number;
  title: string;
  synopsis: string | null;
  coverUrl: string | null;
  driveFileId: string | null;
  format: BookFormat | null;
  fileStatus: FileStatus;
  status: BookStatus;
  totalChapters: number | null;
  totalVolumes: number | null;
  year: number | null;
  publisher: string | null;
  rating: number | null;
  review: string | null;
  originalFormat: string | null;
  createdAt: string;
  updatedAt: string;
  authors?: Author[];
}

export interface Author {
  id: number;
  name: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface BookDetail extends Book {
  authors: Author[];
  genres: Genre[];
  tags: Tag[];
}

export interface BookFilters {
  search?: string;
  genre?: string;
  tag?: string;
  status?: BookStatus;
  collection?: number;
  format?: BookFormat;
  sort?: 'title' | 'author' | 'createdAt' | 'lastRead';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateBookDto {
  title: string;
  synopsis?: string;
  coverUrl?: string;
  driveFileId?: string;
  format?: BookFormat;
  fileStatus?: FileStatus;
  cachedPath?: string;
  status?: BookStatus;
  totalChapters?: number;
  totalVolumes?: number;
  year?: number;
  publisher?: string;
  rating?: number;
  review?: string;
  originalFormat?: string;
  authors?: string[];
  genres?: string[];
  tags?: string[];
}

export interface UpdateBookDto extends Partial<CreateBookDto> {}

export interface ReadingProgress {
  id: number;
  bookId: number;
  currentPage: number | null;
  totalPages: number | null;
  epubCfi: string | null;
  percentage: number | null;
  lastReadAt: string;
}

export interface UpdateProgressDto {
  currentPage?: number;
  totalPages?: number;
  epubCfi?: string;
  percentage?: number;
}
