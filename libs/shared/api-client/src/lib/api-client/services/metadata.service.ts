import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MetadataItem } from '@libs/types';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class MetadataService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  // ── Genres ─────────────────────────────────────────────────────────────────
  getGenres(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/genres'));
  }

  createGenre(name: string): Observable<MetadataItem> {
    return this.http.post<MetadataItem>(this.url('/genres'), { name });
  }

  updateGenre(id: number, name: string): Observable<MetadataItem> {
    return this.http.patch<MetadataItem>(this.url(`/genres/${id}`), { name });
  }

  deleteGenre(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/genres/${id}`));
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  getTags(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/tags'));
  }

  createTag(name: string): Observable<MetadataItem> {
    return this.http.post<MetadataItem>(this.url('/tags'), { name });
  }

  updateTag(id: number, name: string): Observable<MetadataItem> {
    return this.http.patch<MetadataItem>(this.url(`/tags/${id}`), { name });
  }

  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/tags/${id}`));
  }

  // ── Authors ────────────────────────────────────────────────────────────────
  getAuthors(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/authors'));
  }

  createAuthor(name: string): Observable<MetadataItem> {
    return this.http.post<MetadataItem>(this.url('/authors'), { name });
  }

  updateAuthor(id: number, name: string): Observable<MetadataItem> {
    return this.http.patch<MetadataItem>(this.url(`/authors/${id}`), { name });
  }

  deleteAuthor(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/authors/${id}`));
  }
}
