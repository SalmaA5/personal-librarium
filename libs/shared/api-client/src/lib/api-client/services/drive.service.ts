import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DriveFile, DriveFolder } from '@libs/types';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class DriveService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}/api${path}`;
  }

  listFolders(parentId?: string): Observable<DriveFolder[]> {
    let params = new HttpParams();
    if (parentId) params = params.set('parentId', parentId);
    return this.http.get<DriveFolder[]>(this.url('/drive/folders'), { params });
  }

  listFiles(folderId: string): Observable<DriveFile[]> {
    return this.http.get<DriveFile[]>(this.url(`/drive/folders/${folderId}`));
  }

  searchFiles(query: string): Observable<DriveFile[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<DriveFile[]>(this.url('/drive/search'), { params });
  }
}
