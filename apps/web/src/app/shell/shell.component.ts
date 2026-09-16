import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'pi pi-home' },
  { label: 'Biblioteca', path: '/library', icon: 'pi pi-book' },
  { label: 'Colecciones', path: '/collections', icon: 'pi pi-th-large' },
  { label: 'Estadísticas', path: '/stats', icon: 'pi pi-chart-bar' },
  { label: 'Ajustes', path: '/settings', icon: 'pi pi-cog' },
];

const ROUTE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  library: 'Biblioteca',
  collections: 'Colecciones',
  stats: 'Estadísticas',
  settings: 'Ajustes',
  import: 'Importar',
  books: 'Libro',
  read: 'Lector',
};

function titleFromUrl(url: string): string {
  const segment = url.split('/').filter(Boolean)[0] ?? 'dashboard';
  return ROUTE_TITLES[segment] ?? segment;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);

  readonly navItems = NAV_ITEMS;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isReader = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/read')),
    ),
    { initialValue: this.router.url.includes('/read') },
  );

  pageTitle(): string {
    return titleFromUrl(this.currentUrl());
  }
}
