import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BooksService, DriveService, ImportService } from '@libs/api-client';
import { BookDetail, DriveFile, DriveFolder } from '@libs/types';
import { FORM_IMPORTS, PRIMENG_IMPORTS, ROUTER_IMPORTS } from '@libs/ui-shared';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { debounceTime, firstValueFrom } from 'rxjs';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const IMPORT_STEPS = [
  'Obteniendo metadatos de Drive',
  'Descargando fichero',
  'Extrayendo metadatos',
  'Generando portada',
  'Guardando en biblioteca',
];

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [FORM_IMPORTS, ROUTER_IMPORTS, PRIMENG_IMPORTS],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
})
export default class ImportComponent implements OnDestroy {
  private readonly driveService = inject(DriveService);
  private readonly booksService = inject(BooksService);
  private readonly importService = inject(ImportService);
  private readonly router = inject(Router);

  readonly STEPS = IMPORT_STEPS;
  readonly skeletonRows = [1, 2, 3];

  // ── Navigation ──────────────────────────────────────────────────────────
  readonly breadcrumb = signal<BreadcrumbItem[]>([{ id: null, name: 'Mi Drive' }]);
  readonly currentFolderId = computed(() => {
    const bc = this.breadcrumb();
    return bc[bc.length - 1].id;
  });

  // ── Search ───────────────────────────────────────────────────────────────
  readonly searchInput = signal('');
  readonly debouncedSearch = toSignal(
    toObservable(this.searchInput).pipe(debounceTime(500)),
    { initialValue: '' }
  );
  readonly isSearchMode = computed(() => this.debouncedSearch().trim().length > 0);

  // ── Import dialog state ──────────────────────────────────────────────────
  readonly importing = signal(false);
  readonly importingFile = signal<DriveFile | null>(null);
  readonly importCurrentStep = signal(0);
  readonly importState = signal<'loading' | 'success' | 'error'>('loading');
  readonly importedBook = signal<BookDetail | null>(null);
  readonly importError = signal('');

  // ── Imported files cache ─────────────────────────────────────────────────
  // driveFileId → bookId (number) | false (not imported)
  readonly importedMap = signal<Record<string, number | false>>({});
  private readonly checkingIds = new Set<string>();
  private importTimers: ReturnType<typeof setTimeout>[] = [];

  // ── Queries ──────────────────────────────────────────────────────────────
  readonly foldersQuery = injectQuery(() => ({
    queryKey: ['drive', 'folders', this.currentFolderId()],
    queryFn: () =>
      firstValueFrom(this.driveService.listFolders(this.currentFolderId() ?? undefined)),
    enabled: !this.isSearchMode(),
    staleTime: 2 * 60 * 1000,
  }));

  readonly filesQuery = injectQuery(() => ({
    queryKey: ['drive', 'files', this.currentFolderId()],
    queryFn: () => firstValueFrom(this.driveService.listFiles(this.currentFolderId()!)),
    enabled: !this.isSearchMode() && this.currentFolderId() !== null,
    staleTime: 2 * 60 * 1000,
  }));

  readonly searchQuery = injectQuery(() => ({
    queryKey: ['drive', 'search', this.debouncedSearch()],
    queryFn: () => firstValueFrom(this.driveService.searchFiles(this.debouncedSearch())),
    enabled: this.isSearchMode(),
    staleTime: 60 * 1000,
  }));

  readonly displayedFiles = computed(() =>
    this.isSearchMode() ? (this.searchQuery.data() ?? []) : (this.filesQuery.data() ?? [])
  );

  constructor() {
    // Check import status for every file that appears in the view
    effect(() => {
      const files = this.displayedFiles();
      const currentMap = this.importedMap();
      for (const file of files) {
        if (!(file.id in currentMap) && !this.checkingIds.has(file.id)) {
          this.checkingIds.add(file.id);
          firstValueFrom(this.booksService.getByDriveFileId(file.id)).then(
            (book) => {
              this.checkingIds.delete(file.id);
              this.importedMap.update((m) => ({ ...m, [file.id]: book.id }));
            },
            () => {
              this.checkingIds.delete(file.id);
              this.importedMap.update((m) => ({ ...m, [file.id]: false }));
            }
          );
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.importTimers.forEach((t) => clearTimeout(t));
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  openFolder(folder: DriveFolder): void {
    this.breadcrumb.update((bc) => [...bc, { id: folder.id, name: folder.name }]);
  }

  navigateTo(item: BreadcrumbItem): void {
    const bc = this.breadcrumb();
    const idx = bc.findIndex((b) => b.id === item.id);
    if (idx >= 0) this.breadcrumb.set(bc.slice(0, idx + 1));
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSearchChange(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchInput.set('');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getFormatIcon(file: DriveFile): string {
    const name = file.name.toLowerCase();
    if (name.endsWith('.epub')) return '📗';
    if (name.endsWith('.pdf')) return '📕';
    if (name.endsWith('.cbz') || name.endsWith('.cbr')) return '🖼️';
    return '📄';
  }

  isAlreadyImported(driveFileId: string): boolean {
    return typeof this.importedMap()[driveFileId] === 'number';
  }

  // ── Import ────────────────────────────────────────────────────────────────
  startImport(file: DriveFile): void {
    this.importingFile.set(file);
    this.importing.set(true);
    this.importCurrentStep.set(0);
    this.importState.set('loading');
    this.importedBook.set(null);
    this.importError.set('');

    this.importTimers.forEach((t) => clearTimeout(t));
    this.importTimers = [];

    // Simulate step progression while waiting for the API
    const delays = [0, 1200, 2800, 4500, 6500];
    delays.forEach((delay, idx) => {
      const t = setTimeout(() => {
        if (this.importState() === 'loading') {
          this.importCurrentStep.set(idx);
        }
      }, delay);
      this.importTimers.push(t);
    });

    firstValueFrom(this.importService.importFromDrive(file.id)).then(
      (book) => {
        this.importTimers.forEach((t) => clearTimeout(t));
        this.importTimers = [];
        // Advance to "all done" then show success
        this.importCurrentStep.set(IMPORT_STEPS.length);
        setTimeout(() => {
          this.importState.set('success');
          this.importedBook.set(book);
          this.importedMap.update((m) => ({ ...m, [file.id]: book.id }));
        }, 500);
      },
      (err: { error?: { message?: string } }) => {
        this.importTimers.forEach((t) => clearTimeout(t));
        this.importTimers = [];
        this.importState.set('error');
        this.importError.set(err?.error?.message ?? 'Error al importar el fichero');
      }
    );
  }

  closeDialog(): void {
    if (this.importState() === 'loading') return;
    this.importing.set(false);
    this.importingFile.set(null);
  }

  retryImport(): void {
    const file = this.importingFile();
    if (file) this.startImport(file);
  }

  viewBook(): void {
    const book = this.importedBook();
    if (book) {
      this.importing.set(false);
      this.router.navigate(['/books', book.id]);
    }
  }
}
