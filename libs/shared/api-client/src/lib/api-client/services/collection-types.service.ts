import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CollectionType } from '@libs/types';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class CollectionTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  getAll(): Observable<CollectionType[]> {
    return this.http.get<CollectionType[]>(this.url('/collection-types'));
  }

  create(name: string): Observable<CollectionType> {
    return this.http.post<CollectionType>(this.url('/collection-types'), {
      name,
    });
  }

  update(id: number, name: string): Observable<CollectionType> {
    return this.http.patch<CollectionType>(this.url(`/collection-types/${id}`), { name });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/collection-types/${id}`));
  }
}
