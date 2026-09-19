import { SlicePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BooksService } from '@libs/api-client';
import { Book, UpdateBookDto } from '@libs/types';
import { BookCardComponent, ROUTER_IMPORTS } from '@libs/ui-shared';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [ROUTER_IMPORTS, SlicePipe, BookCardComponent],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.scss',
})
export default class BookDetailComponent {
  private readonly booksService = inject(BooksService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryClient = injectQueryClient();

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
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['book', this.id()] });
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

  readonly stars = [1, 2, 3, 4, 5];
  readonly hoverRating = signal(0);

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
    if (confirm('¿Eliminar este libro? Esta acción no se puede deshacer.')) {
      this.deleteMutation.mutate();
    }
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
