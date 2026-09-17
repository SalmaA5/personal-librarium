import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { CreateBookDto } from '@librarium/types';
import { BooksService, MetadataService } from '@librarium/api-client';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './book-form.component.html',
  styleUrl: './book-form.component.scss',
})
export default class BookFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly booksService = inject(BooksService);
  private readonly metadataService = inject(MetadataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryClient = injectQueryClient();

  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('id') ?? 0))),
    { initialValue: Number(this.route.snapshot.paramMap.get('id') ?? 0) },
  );

  readonly isEditMode = computed(() => this.id() > 0);

  readonly form = this.fb.group({
    title: ['', Validators.required],
    synopsis: [''],
    driveFileId: [''],
    format: ['' as string],
    status: ['unread' as string],
    year: [null as number | null, [Validators.min(1000), Validators.max(2100)]],
    publisher: [''],
    totalChapters: [null as number | null],
    totalVolumes: [null as number | null],
  });

  readonly authors = signal<string[]>([]);
  readonly tags = signal<string[]>([]);
  readonly selectedGenres = signal<string[]>([]);
  readonly originalStatus = signal<string>('');

  readonly authorInput = signal('');
  readonly tagInput = signal('');
  readonly genreInput = signal('');
  readonly saveError = signal('');

  // Union of API genres + locally added ones
  readonly allGenreNames = computed(() => {
    const fromApi = (this.genresQuery.data() ?? []).map((g) => g.name);
    const extra = this.localGenres();
    return [...new Set([...fromApi, ...extra])];
  });

  readonly localGenres = signal<string[]>([]);

  readonly genresQuery = injectQuery(() => ({
    queryKey: ['genres'],
    queryFn: () => firstValueFrom(this.metadataService.getGenres()),
  }));

  readonly bookQuery = injectQuery(() => ({
    queryKey: ['book', this.id()],
    queryFn: () => firstValueFrom(this.booksService.getOne(this.id())),
    enabled: this.isEditMode(),
  }));

  readonly saveMutation = injectMutation(() => ({
    mutationFn: (dto: CreateBookDto) =>
      this.isEditMode()
        ? firstValueFrom(this.booksService.update(this.id(), dto))
        : firstValueFrom(this.booksService.create(dto)),
    onSuccess: async (book) => {
      this.queryClient.invalidateQueries({ queryKey: ['books'] });
      if (this.isEditMode()) {
        this.queryClient.invalidateQueries({ queryKey: ['book', this.id()] });
        if (
          this.form.get('status')?.value === 'unread' &&
          this.originalStatus() !== 'unread'
        ) {
          await firstValueFrom(this.booksService.resetProgress(this.id()));
          this.queryClient.invalidateQueries({
            queryKey: ['progress', this.id()],
          });
        }
      }
      this.router.navigate(['/books', book.id]);
    },
    onError: (err: unknown) => {
      this.saveError.set(
        err instanceof Error ? err.message : 'Error al guardar',
      );
    },
  }));

  readonly formats = [
    { value: 'epub', label: 'EPUB' },
    { value: 'pdf', label: 'PDF' },
    { value: 'html', label: 'HTML' },
    { value: 'cbz', label: 'CBZ' },
  ];

  readonly statuses = [
    { value: 'unread', label: 'Sin leer' },
    { value: 'reading', label: 'Leyendo' },
    { value: 'read', label: 'Leído' },
  ];

  constructor() {
    effect(() => {
      const data = this.bookQuery.data();
      if (data && this.isEditMode()) {
        this.form.patchValue({
          title: data.title,
          synopsis: data.synopsis ?? '',
          driveFileId: data.driveFileId ?? '',
          format: data.format ?? '',
          status: data.status,
          year: data.year,
          publisher: data.publisher ?? '',
          totalChapters: data.totalChapters,
          totalVolumes: data.totalVolumes,
        });
        this.authors.set(data.authors.map((a) => a.name));
        this.tags.set((data.tags ?? []).map((t) => t.name));
        this.selectedGenres.set((data.genres ?? []).map((g) => g.name));
        this.originalStatus.set(data.status);
      }
    });
  }

  addAuthor(): void {
    const val = this.authorInput().trim();
    if (val && !this.authors().includes(val)) {
      this.authors.update((arr) => [...arr, val]);
    }
    this.authorInput.set('');
  }

  removeAuthor(name: string): void {
    this.authors.update((arr) => arr.filter((a) => a !== name));
  }

  addTag(): void {
    const val = this.tagInput().trim();
    if (val && !this.tags().includes(val)) {
      this.tags.update((arr) => [...arr, val]);
    }
    this.tagInput.set('');
  }

  removeTag(name: string): void {
    this.tags.update((arr) => arr.filter((t) => t !== name));
  }

  toggleGenre(name: string): void {
    this.selectedGenres.update((arr) =>
      arr.includes(name) ? arr.filter((g) => g !== name) : [...arr, name],
    );
  }

  isGenreSelected(name: string): boolean {
    return this.selectedGenres().includes(name);
  }

  addGenre(): void {
    const val = this.genreInput().trim();
    if (val && !this.allGenreNames().includes(val)) {
      this.localGenres.update((arr) => [...arr, val]);
      this.selectedGenres.update((arr) => [...arr, val]);
    } else if (val && !this.isGenreSelected(val)) {
      this.selectedGenres.update((arr) => [...arr, val]);
    }
    this.genreInput.set('');
  }

  onChipInputKeydown(
    event: KeyboardEvent,
    field: 'author' | 'tag' | 'genre',
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (field === 'author') this.addAuthor();
      else if (field === 'tag') this.addTag();
      else this.addGenre();
    }
  }

  cancel(): void {
    if (this.isEditMode()) {
      this.router.navigate(['/books', this.id()]);
    } else {
      this.router.navigate(['/library']);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveError.set('');
    const raw = this.form.getRawValue();
    const dto: CreateBookDto = {
      title: raw.title!,
      ...(raw.synopsis ? { synopsis: raw.synopsis } : {}),
      ...(raw.driveFileId ? { driveFileId: raw.driveFileId } : {}),
      ...(raw.format
        ? { format: raw.format as 'epub' | 'pdf' | 'html' | 'cbz' }
        : {}),
      ...(raw.status
        ? { status: raw.status as 'unread' | 'reading' | 'read' }
        : {}),
      ...(raw.year != null ? { year: Number(raw.year) } : {}),
      ...(raw.publisher ? { publisher: raw.publisher } : {}),
      ...(raw.totalChapters != null
        ? { totalChapters: Number(raw.totalChapters) }
        : {}),
      ...(raw.totalVolumes != null
        ? { totalVolumes: Number(raw.totalVolumes) }
        : {}),
      authors: this.authors(),
      tags: this.tags(),
      genres: this.selectedGenres(),
    };
    this.saveMutation.mutate(dto);
  }
}
