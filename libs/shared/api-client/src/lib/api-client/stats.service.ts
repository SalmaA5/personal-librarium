import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryStats } from '@librarium/types';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  getStats(): Observable<LibraryStats> {
    return this.http.get<LibraryStats>(this.url('/stats'));
  }
}
