import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { google } from 'googleapis';

const BOOK_MIMETYPES = [
  'application/epub+zip',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-cbz',
];

const MIME_FILTER = BOOK_MIMETYPES.map((m) => `mimeType = '${m}'`).join(' or ');

@Injectable()
export class DriveService {
  constructor(private readonly config: ConfigService) {}

  getClient() {
    const auth = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
    );
    auth.setCredentials({
      refresh_token: this.config.getOrThrow<string>('GOOGLE_REFRESH_TOKEN'),
    });
    return google.drive({ version: 'v3', auth });
  }

  async listFolders(parentId?: string) {
    const drive = this.getClient();
    const q = parentId
      ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      : `mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;

    const res = await drive.files.list({
      q,
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'name',
    });

    return res.data.files ?? [];
  }

  async listFiles(folderId: string) {
    const drive = this.getClient();
    const res = await drive.files.list({
      q: `'${folderId}' in parents and (${MIME_FILTER}) and trashed = false`,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'name',
    });

    return res.data.files ?? [];
  }

  async searchFiles(query: string) {
    const drive = this.getClient();
    const res = await drive.files.list({
      q: `name contains '${query.replace(/'/g, "\\'")}' and (${MIME_FILTER}) and trashed = false`,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'name',
    });

    return res.data.files ?? [];
  }

  async getFile(fileId: string) {
    const drive = this.getClient();
    const res = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime',
    });

    return res.data;
  }

  async streamFile(fileId: string): Promise<Readable> {
    const drive = this.getClient();
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );

    return res.data as Readable;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = this.getClient();
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );

    return Buffer.from(res.data as ArrayBuffer);
  }
}
