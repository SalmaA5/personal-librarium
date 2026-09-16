import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component'),
  },
  {
    path: 'library',
    loadComponent: () => import('./pages/library/library.component'),
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/collections/collections.component'),
  },
  {
    path: 'collections/:id',
    loadComponent: () =>
      import('./pages/collection-detail/collection-detail.component'),
  },
  {
    path: 'books/new',
    loadComponent: () => import('./pages/book-form/book-form.component'),
  },
  {
    path: 'books/:id',
    loadComponent: () => import('./pages/book-detail/book-detail.component'),
  },
  {
    path: 'books/:id/edit',
    loadComponent: () => import('./pages/book-form/book-form.component'),
  },
  {
    path: 'books/:id/read',
    loadComponent: () => import('./pages/reader/reader.component'),
  },
  {
    path: 'import',
    loadComponent: () => import('./pages/import/import.component'),
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats/stats.component'),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component'),
  },
];
