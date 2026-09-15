import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { AuthService } from '../auth/auth.service';

interface GaxiosError {
  status?: number;
  response?: { data?: { error?: string } };
}

function isAuthError(err: unknown): err is GaxiosError {
  const e = err as GaxiosError;
  return e?.status === 401 || e?.response?.data?.error === 'invalid_grant';
}

const BOOK_MIMETYPES = [
  'application/epub+zip',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-cbz',
];

const MIME_FILTER = BOOK_MIMETYPES.map((m) => `mimeType = '${m}'`).join(' or ');

@Injectable()
export class DriveService {
  private readonly drive: ReturnType<typeof google.drive>;

  constructor(private readonly authService: AuthService) {
    this.drive = google.drive({
      version: 'v3',
      auth: authService.oauth2Client,
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isAuthError(err)) {
        await this.authService.clearCredentials();
        throw new UnauthorizedException(
          'Google authorization expired. Visit /api/auth/google to re-authorize.',
        );
      }
      throw err;
    }
  }

  async listFolders(parentId?: string) {
    return this.run(async () => {
      const q = parentId
        ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        : `mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;
      const res = await this.drive.files.list({
        q,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'name',
      });
      return res.data.files ?? [];
    });
  }

  async listFiles(folderId: string) {
    return this.run(async () => {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and (${MIME_FILTER}) and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        orderBy: 'name',
      });
      return res.data.files ?? [];
    });
  }

  async searchFiles(query: string) {
    return this.run(async () => {
      const res = await this.drive.files.list({
        q: `name contains '${query.replace(/'/g, "\\'")}' and (${MIME_FILTER}) and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        orderBy: 'name',
      });
      return res.data.files ?? [];
    });
  }

  async getFile(fileId: string) {
    return this.run(async () => {
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime',
      });
      return res.data;
    });
  }

  async streamFile(fileId: string): Promise<Readable> {
    return this.run(async () => {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      );
      return res.data as Readable;
    });
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    return this.run(async () => {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' },
      );
      return Buffer.from(res.data as ArrayBuffer);
    });
  }
}
