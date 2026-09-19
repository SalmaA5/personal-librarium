import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LibraryStats } from '@libs/types';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

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
