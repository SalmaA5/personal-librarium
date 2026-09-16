export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string | null;
}
