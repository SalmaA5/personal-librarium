import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Collection,
  CollectionDetail,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddBookDto,
} from '@librarium/types';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  getAll(filter?: { typeId?: number }): Observable<Collection[]> {
    let params = new HttpParams();
    if (filter?.typeId) params = params.set('typeId', filter.typeId.toString());
    return this.http.get<Collection[]>(this.url('/collections'), { params });
  }

  getOne(id: number): Observable<CollectionDetail> {
    return this.http.get<CollectionDetail>(this.url(`/collections/${id}`));
  }

  create(dto: CreateCollectionDto): Observable<Collection> {
    return this.http.post<Collection>(this.url('/collections'), dto);
  }

  update(id: number, dto: UpdateCollectionDto): Observable<Collection> {
    return this.http.patch<Collection>(this.url(`/collections/${id}`), dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/collections/${id}`));
  }

  addBook(id: number, dto: AddBookDto): Observable<void> {
    return this.http.post<void>(this.url(`/collections/${id}/books`), dto);
  }

  removeBook(collectionId: number, bookId: number): Observable<void> {
    return this.http.delete<void>(
      this.url(`/collections/${collectionId}/books/${bookId}`),
    );
  }

  reorderBooks(
    id: number,
    dto: { books: { bookId: number; order: number }[] },
  ): Observable<void> {
    return this.http.patch<void>(
      this.url(`/collections/${id}/books/reorder`),
      dto,
    );
  }
}
