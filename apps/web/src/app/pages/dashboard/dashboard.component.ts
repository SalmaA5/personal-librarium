import { Component, computed, inject } from '@angular/core';
import { BooksService, StatsService } from '@libs/api-client';
import { Book } from '@libs/types';
import { ROUTER_IMPORTS } from '@libs/ui-shared';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ROUTER_IMPORTS],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export default class DashboardComponent {
  private readonly booksService = inject(BooksService);
  private readonly statsService = inject(StatsService);

  readonly statsQuery = injectQuery(() => ({
    queryKey: ['stats'],
    queryFn: () => firstValueFrom(this.statsService.getStats()),
  }));

  readonly readingBooksQuery = injectQuery(() => ({
    queryKey: ['books', { status: 'reading' }],
    queryFn: () =>
      firstValueFrom(
        this.booksService.getAll({
          status: 'reading',
          sort: 'lastRead',
          order: 'desc',
          limit: 3,
        })
      ),
  }));

  readonly recentBooksQuery = injectQuery(() => ({
    queryKey: ['books', { sort: 'createdAt' }],
    queryFn: () =>
      firstValueFrom(
        this.booksService.getAll({
          sort: 'createdAt',
          order: 'desc',
          limit: 8,
        })
      ),
  }));

  // Individual progress queries for up to 3 reading books
  readonly readingProgress0 = injectQuery(() => {
    const id = this.readingBooksQuery.data()?.data[0]?.id;
    return {
      queryKey: ['progress', id ?? 0],
      queryFn: () => firstValueFrom(this.booksService.getProgress(id!)),
      enabled: !!id,
    };
  });

  readonly readingProgress1 = injectQuery(() => {
    const id = this.readingBooksQuery.data()?.data[1]?.id;
    return {
      queryKey: ['progress', id ?? 0],
      queryFn: () => firstValueFrom(this.booksService.getProgress(id!)),
      enabled: !!id,
    };
  });

  readonly readingProgress2 = injectQuery(() => {
    const id = this.readingBooksQuery.data()?.data[2]?.id;
    return {
      queryKey: ['progress', id ?? 0],
      queryFn: () => firstValueFrom(this.booksService.getProgress(id!)),
      enabled: !!id,
    };
  });

  readonly readingProgresses = computed(() => [
    this.readingProgress0.data(),
    this.readingProgress1.data(),
    this.readingProgress2.data(),
  ]);

  coverUrl(book: Book): string {
    return this.booksService.getCoverUrl(book.coverUrl);
  }
}
