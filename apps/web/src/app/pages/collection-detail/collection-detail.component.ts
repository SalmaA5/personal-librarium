import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BooksService,
  CollectionTypesService,
  CollectionsService,
} from '@libs/api-client';
import { CollectionBook } from '@libs/types';
import { FORM_IMPORTS, PRIMENG_IMPORTS } from '@libs/ui-shared';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { firstValueFrom, map } from 'rxjs';

@Component({
  selector: 'app-collection-detail',
  standalone: true,
  imports: [FORM_IMPORTS, PRIMENG_IMPORTS],
  templateUrl: './collection-detail.component.html',
  styleUrl: './collection-detail.component.scss',
})
export default class CollectionDetailComponent {
  private readonly collectionsService = inject(CollectionsService);
  private readonly collectionTypesService = inject(CollectionTypesService);
  private readonly booksService = inject(BooksService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly queryClient = injectQueryClient();

  readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id') ?? 0))), {
    initialValue: Number(this.route.snapshot.paramMap.get('id') ?? 0),
  });

  readonly detailQuery = injectQuery(() => ({
    queryKey: ['collection', this.id()],
    queryFn: () => firstValueFrom(this.collectionsService.getOne(this.id())),
    enabled: this.id() > 0,
  }));

  readonly typesQuery = injectQuery(() => ({
    queryKey: ['collection-types'],
    queryFn: () => firstValueFrom(this.collectionTypesService.getAll()),
  }));

  readonly localBooks = signal<CollectionBook[]>([]);
  private dragFromIndex = -1;
  readonly draggingIndex = signal(-1);

  readonly showEditForm = signal(false);
  readonly editForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    typeId: [0],
  });

  readonly showAddBook = signal(false);
  readonly addBookSearch = signal('');
  readonly debouncedSearch = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly searchQuery = injectQuery(() => ({
    queryKey: ['books-search', this.debouncedSearch()],
    queryFn: () =>
      firstValueFrom(
        this.booksService.getAll({ search: this.debouncedSearch(), limit: 8 })
      ),
    enabled: this.debouncedSearch().trim().length > 1,
  }));

  readonly updateMutation = injectMutation(() => ({
    mutationFn: (dto: { name: string; description?: string; typeId: number }) =>
      firstValueFrom(this.collectionsService.update(this.id(), dto)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({
        queryKey: ['collection', this.id()],
      });
      this.queryClient.invalidateQueries({ queryKey: ['collections'] });
      this.showEditForm.set(false);
    },
  }));

  readonly removeMutation = injectMutation(() => ({
    mutationFn: (bookId: number) =>
      firstValueFrom(this.collectionsService.removeBook(this.id(), bookId)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({
        queryKey: ['collection', this.id()],
      });
      this.queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  }));

  readonly addMutation = injectMutation(() => ({
    mutationFn: (bookId: number) =>
      firstValueFrom(
        this.collectionsService.addBook(this.id(), {
          bookId,
          order: this.localBooks().length + 1,
        })
      ),
    onSuccess: () => {
      this.queryClient.invalidateQueries({
        queryKey: ['collection', this.id()],
      });
      this.queryClient.invalidateQueries({ queryKey: ['collections'] });
      this.showAddBook.set(false);
      this.addBookSearch.set('');
      this.debouncedSearch.set('');
    },
  }));

  readonly reorderMutation = injectMutation(() => ({
    mutationFn: (books: { bookId: number; order: number }[]) =>
      firstValueFrom(this.collectionsService.reorderBooks(this.id(), { books })),
  }));

  readonly deleteMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.collectionsService.remove(this.id())),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['collections'] });
      this.router.navigate(['/collections']);
    },
  }));

  constructor() {
    effect(() => {
      const data = this.detailQuery.data();
      if (data) this.localBooks.set([...data.books]);
    });
  }

  getCoverUrl(coverUrl: string | null): string {
    return this.booksService.getCoverUrl(coverUrl);
  }

  progressLabel(book: CollectionBook): string {
    const p = book.progress?.percentage;
    if (!p) return '';
    if (p >= 100) return '✓ Leído';
    return `${p}%`;
  }

  progressClass(book: CollectionBook): string {
    const p = book.progress?.percentage;
    if (!p) return '';
    return p >= 100 ? 'read' : 'reading';
  }

  openEdit(): void {
    const data = this.detailQuery.data();
    if (!data) return;
    this.editForm.patchValue({
      name: data.name,
      description: data.description ?? '',
      typeId: data.typeId,
    });
    this.showEditForm.set(true);
  }

  cancelEdit(): void {
    this.showEditForm.set(false);
  }

  submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const raw = this.editForm.getRawValue();
    this.updateMutation.mutate({
      name: raw.name!,
      ...(raw.description ? { description: raw.description } : {}),
      typeId: Number(raw.typeId),
    });
  }

  deleteCollection(): void {
    if (confirm('¿Eliminar esta colección? Esta acción no se puede deshacer.')) {
      this.deleteMutation.mutate();
    }
  }

  removeBook(bookId: number): void {
    if (confirm('¿Quitar este libro de la colección?')) {
      this.removeMutation.mutate(bookId);
    }
  }

  onDragStart(index: number): void {
    this.dragFromIndex = index;
    this.draggingIndex.set(index);
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragFromIndex === index) return;
    const books = [...this.localBooks()];
    const [moved] = books.splice(this.dragFromIndex, 1);
    books.splice(index, 0, moved);
    this.localBooks.set(books);
    this.dragFromIndex = index;
  }

  onDrop(): void {
    this.draggingIndex.set(-1);
    const reorderDto = this.localBooks().map((b, i) => ({
      bookId: b.bookId,
      order: i + 1,
    }));
    this.reorderMutation.mutate(reorderDto);
  }

  setSearch(val: string): void {
    this.addBookSearch.set(val);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.debouncedSearch.set(val), 300);
  }

  toggleAddBook(): void {
    this.showAddBook.update((v) => !v);
    if (!this.showAddBook()) {
      this.addBookSearch.set('');
      this.debouncedSearch.set('');
    }
  }

  addBook(bookId: number): void {
    this.addMutation.mutate(bookId);
  }

  isBookInCollection(bookId: number): boolean {
    return this.localBooks().some((b) => b.bookId === bookId);
  }

  goBack(): void {
    this.router.navigate(['/collections']);
  }
}
