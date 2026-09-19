import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { ThemeService } from '@libs/utils';
import Aura from '@primeng/themes/aura';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideTanStackQuery(new QueryClient()),
    // initTheme runs before Angular bootstraps to prevent a flash of unstyled theme.
    // Currently disabled because the default CSS tokens in styles.scss already match
    // the teal-dark theme, so no visible flash occurs on load.
    // Re-enable if the default theme in styles.scss diverges from the user's saved preference.
    // provideAppInitializer(initTheme),
    // provideAppInitializer(initTheme),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none',
          cssLayer: false,
        },
      },
    }),
  ],
};
