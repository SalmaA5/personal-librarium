export interface GenreStat {
  name: string;
  count: number;
}

export interface FormatStat {
  format: string;
  count: number;
}

export interface RecentlyRead {
  id: number;
  title: string;
  coverUrl: string | null;
  lastReadAt: string;
}

export interface LibraryStats {
  totalBooks: number;
  readBooks: number;
  readingBooks: number;
  unreadBooks: number;
  byGenre: GenreStat[];
  byFormat: FormatStat[];
  recentlyRead: RecentlyRead[];
}
