import { Injectable, signal } from '@angular/core';
import {
  THEME_TOKENS,
  ThemeConfig,
  ThemePalette,
  ThemeMode,
} from './theme.tokens.js';

const STORAGE_KEY = 'librarium-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<ThemeConfig>({
    palette: 'teal',
    mode: 'dark',
  });

  private _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private _systemListener = (e: MediaQueryListEvent) => {
    this.setTheme(this.currentTheme().palette, e.matches ? 'dark' : 'light');
  };

  constructor() {
    this._init();
  }

  setTheme(palette: ThemePalette, mode: ThemeMode): void {
    const config: ThemeConfig = { palette, mode };
    this.currentTheme.set(config);
    this._applyTokens(palette, mode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  followSystem(): void {
    const mode: ThemeMode = this._mediaQuery.matches ? 'dark' : 'light';
    this._mediaQuery.removeEventListener('change', this._systemListener);
    this._mediaQuery.addEventListener('change', this._systemListener);
    this.setTheme(this.currentTheme().palette, mode);
  }

  private _init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved) as ThemeConfig;
        this.setTheme(config.palette, config.mode);
        return;
      } catch {
        // fall through to system preference
      }
    }
    this.followSystem();
  }

  private _applyTokens(palette: ThemePalette, mode: ThemeMode): void {
    const tokens = THEME_TOKENS[palette][mode];
    const root = document.documentElement;

    root.style.setProperty('--color-accent', tokens.accent);
    root.style.setProperty('--color-accent-sec', tokens.accentSec);
    root.style.setProperty('--color-accent-soft', tokens.accentSoft);
    root.style.setProperty('--color-bg-page', tokens.bgPage);
    root.style.setProperty('--color-bg-card', tokens.bgCard);
    root.style.setProperty('--color-bg-sidebar', tokens.bgSidebar);
    root.style.setProperty('--color-text-primary', tokens.textPrimary);
    root.style.setProperty('--color-text-secondary', tokens.textSecondary);
    root.style.setProperty('--color-border', tokens.border);

    // Ionic variable mapping — keeps mobile in sync without extra config
    root.style.setProperty('--ion-color-primary', tokens.accent);
    root.style.setProperty('--ion-background-color', tokens.bgPage);
    root.style.setProperty('--ion-card-background', tokens.bgCard);
    root.style.setProperty('--ion-text-color', tokens.textPrimary);
    root.style.setProperty('--ion-border-color', tokens.border);
    root.style.setProperty('--ion-toolbar-background', tokens.bgSidebar);
  }
}
