import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, firstValueFrom } from 'rxjs';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BookFormat, BookStatus } from '@librarium/types';
import { BooksService, MetadataService } from '@librarium/api-client';
import { BookCardComponent } from '@librarium/ui-shared';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [RouterLink, BookCardComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
})
export default class LibraryComponent {
  private readonly booksService = inject(BooksService);
  private readonly metadataService = inject(MetadataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly searchInput = signal('');
  readonly genreFilter = signal('');
  readonly formatFilter = signal('');
  readonly statusFilter = signal('');
  readonly sortBy = signal<'title' | 'author' | 'createdAt' | 'lastRead'>(
    'createdAt',
  );
  readonly orderDir = signal<'asc' | 'desc'>('desc');
  readonly currentPage = signal(1);

  readonly debouncedSearch = toSignal(
    toObservable(this.searchInput).pipe(debounceTime(300)),
    { initialValue: '' },
  );

  readonly hasActiveFilters = computed(
    () =>
      !!(
        this.searchInput() ||
        this.genreFilter() ||
        this.formatFilter() ||
        this.statusFilter()
      ),
  );

  readonly totalPages = computed(() => {
    const total = this.booksQuery.data()?.total ?? 0;
    return Math.max(1, Math.ceil(total / 20));
  });

  readonly genresQuery = injectQuery(() => ({
    queryKey: ['genres'],
    queryFn: () => firstValueFrom(this.metadataService.getGenres()),
    staleTime: 5 * 60 * 1000,
  }));

  readonly booksQuery = injectQuery(() => ({
    queryKey: [
      'books',
      {
        search: this.debouncedSearch(),
        genre: this.genreFilter(),
        format: this.formatFilter(),
        status: this.statusFilter(),
        sort: this.sortBy(),
        order: this.orderDir(),
        page: this.currentPage(),
      },
    ],
    queryFn: () =>
      firstValueFrom(
        this.booksService.getAll({
          search: this.debouncedSearch() || undefined,
          genre: this.genreFilter() || undefined,
          format: (this.formatFilter() as BookFormat) || undefined,
          status: (this.statusFilter() as BookStatus) || undefined,
          sort: this.sortBy(),
          order: this.orderDir(),
          page: this.currentPage(),
          limit: 20,
        }),
      ),
  }));

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.searchInput.set(params.get('search') ?? '');
    this.genreFilter.set(params.get('genre') ?? '');
    this.formatFilter.set(params.get('format') ?? '');
    this.statusFilter.set(params.get('status') ?? '');
    const sort = params.get('sort');
    if (sort)
      this.sortBy.set(sort as 'title' | 'author' | 'createdAt' | 'lastRead');
    const order = params.get('order');
    if (order) this.orderDir.set(order as 'asc' | 'desc');
    const page = params.get('page');
    if (page) this.currentPage.set(Number(page));

    effect(() => {
      const queryParams: Record<string, string | number> = {};
      const search = this.debouncedSearch();
      const genre = this.genreFilter();
      const format = this.formatFilter();
      const status = this.statusFilter();
      const sort = this.sortBy();
      const order = this.orderDir();
      const pg = this.currentPage();

      if (search) queryParams['search'] = search;
      if (genre) queryParams['genre'] = genre;
      if (format) queryParams['format'] = format;
      if (status) queryParams['status'] = status;
      if (sort !== 'createdAt') queryParams['sort'] = sort;
      if (order !== 'desc') queryParams['order'] = order;
      if (pg > 1) queryParams['page'] = pg;

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        replaceUrl: true,
      });
    });
  }

  onSearchChange(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onFilterChange(
    filter: 'genre' | 'format' | 'status' | 'sort' | 'order',
    value: string,
  ): void {
    if (filter === 'genre') this.genreFilter.set(value);
    else if (filter === 'format') this.formatFilter.set(value);
    else if (filter === 'status') this.statusFilter.set(value);
    else if (filter === 'sort')
      this.sortBy.set(value as 'title' | 'author' | 'createdAt' | 'lastRead');
    else if (filter === 'order') this.orderDir.set(value as 'asc' | 'desc');
    if (filter !== 'sort' && filter !== 'order') this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.genreFilter.set('');
    this.formatFilter.set('');
    this.statusFilter.set('');
    this.currentPage.set(1);
  }
}
