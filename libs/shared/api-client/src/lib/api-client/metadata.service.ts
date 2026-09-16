import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MetadataItem } from '@librarium/types';
import { API_BASE_URL } from './api.config.js';

@Injectable({ providedIn: 'root' })
export class MetadataService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  getGenres(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/genres'));
  }

  getTags(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/tags'));
  }

  getAuthors(): Observable<MetadataItem[]> {
    return this.http.get<MetadataItem[]>(this.url('/authors'));
  }
}
