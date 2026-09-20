import { SlicePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BooksService } from '@libs/api-client';
import { Book, UpdateBookDto } from '@libs/types';
import {
  BookCardComponent,
  FORM_IMPORTS,
  PRIMENG_IMPORTS,
  ROUTER_IMPORTS,
} from '@libs/ui-shared';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [ROUTER_IMPORTS, FORM_IMPORTS, PRIMENG_IMPORTS, SlicePipe, BookCardComponent],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.scss',
})
export default class BookDetailComponent {
  private readonly booksService = inject(BooksService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryClient = inject(QueryClient);

  readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), {
    initialValue: Number(this.route.snapshot.paramMap.get('id') ?? 0),
  });

  readonly bookQuery = injectQuery(() => ({
    queryKey: ['book', this.id()],
    queryFn: () => firstValueFrom(this.booksService.getOne(this.id())),
    enabled: this.id() > 0,
  }));

  readonly updateMutation = injectMutation(() => ({
    mutationFn: (dto: UpdateBookDto) =>
      firstValueFrom(this.booksService.update(this.id(), dto)),
    onSuccess: (_, variables) => {
      this.queryClient.invalidateQueries({ queryKey: ['book', this.id()] });
      if (variables.rating !== undefined) {
        this.messageService.add({ severity: 'success', summary: 'Valoración guardada' });
      } else if (variables.review !== undefined) {
        this.messageService.add({ severity: 'success', summary: 'Reseña guardada' });
      }
    },
    onError: (err: unknown) => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err instanceof Error ? err.message : 'Error al guardar',
      });
    },
  }));

  readonly deleteMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.booksService.remove(this.id())),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['books'] });
      this.router.navigate(['/library']);
    },
  }));

  readonly latestProgress = computed(() => this.bookQuery.data()?.progress?.[0] ?? null);
  readonly percentage = computed(() => this.latestProgress()?.percentage ?? 0);

  currentRating = 0;

  constructor() {
    effect(() => {
      this.currentRating = this.bookQuery.data()?.rating ?? 0;
    });
  }

  coverUrl(url: string | null): string {
    return this.booksService.getCoverUrl(url);
  }

  setRating(rating: number): void {
    this.updateMutation.mutate({ rating });
  }

  saveReview(event: Event): void {
    const review = (event.target as HTMLTextAreaElement).value;
    this.updateMutation.mutate({ review });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      message: '¿Eliminar este libro? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteMutation.mutate(),
    });
  }

  toBookCard(related: { id: number; title: string; coverUrl: string | null }): Book {
    return {
      id: related.id,
      title: related.title,
      coverUrl: related.coverUrl,
      status: 'unread',
      fileStatus: 'drive_only',
      format: null,
      synopsis: null,
      driveFileId: null,
      totalChapters: null,
      totalVolumes: null,
      year: null,
      publisher: null,
      rating: null,
      review: null,
      originalFormat: null,
      createdAt: '',
      updatedAt: '',
    };
  }
}
