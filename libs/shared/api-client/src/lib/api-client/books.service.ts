import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Book,
  BookDetail,
  BookFilters,
  CreateBookDto,
  UpdateBookDto,
  ReadingProgress,
  UpdateProgressDto,
  PaginatedResponse,
} from '@librarium/types';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  getAll(filters?: BookFilters): Observable<PaginatedResponse<Book>> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<Book>>(this.url('/books'), {
      params,
    });
  }

  getOne(id: number): Observable<BookDetail> {
    return this.http.get<BookDetail>(this.url(`/books/${id}`));
  }

  create(dto: CreateBookDto): Observable<BookDetail> {
    return this.http.post<BookDetail>(this.url('/books'), dto);
  }

  update(id: number, dto: UpdateBookDto): Observable<BookDetail> {
    return this.http.patch<BookDetail>(this.url(`/books/${id}`), dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/books/${id}`));
  }

  getCoverUrl(id: number): string {
    return this.url(`/books/${id}/cover`);
  }

  getProgress(id: number): Observable<ReadingProgress> {
    return this.http.get<ReadingProgress>(this.url(`/books/${id}/progress`));
  }

  updateProgress(
    id: number,
    dto: UpdateProgressDto,
  ): Observable<ReadingProgress> {
    return this.http.patch<ReadingProgress>(
      this.url(`/books/${id}/progress`),
      dto,
    );
  }
}
