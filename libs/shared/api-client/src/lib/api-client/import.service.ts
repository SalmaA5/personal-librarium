import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookDetail } from '@librarium/types';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  importFromDrive(driveFileId: string): Observable<BookDetail> {
    return this.http.post<BookDetail>(this.url('/import/drive'), {
      driveFileId,
    });
  }
}
