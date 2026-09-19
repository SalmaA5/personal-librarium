import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { appRoutes } from './app.routes';
import { initTheme } from './core/theme/theme.initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideAngularQuery(new QueryClient()),
    provideAppInitializer(initTheme),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none',
          cssLayer: {
            name: 'primeng',
            order: 'primeng',
          },
        },
      },
    }),
  ],
};
