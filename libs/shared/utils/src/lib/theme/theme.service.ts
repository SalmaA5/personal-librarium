import { Injectable, signal } from '@angular/core';
import { defaultStyles, mobileStyles, webStyles } from './theme.styles.js';
import { THEME_TOKENS } from './theme.tokens.js';
import { ThemeConfig, ThemeMode, ThemePalette } from './theme.types.js';

const STORAGE_KEY = 'librarium-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<ThemeConfig>({ palette: 'teal', mode: 'dark' });

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

    defaultStyles(root, tokens);
    webStyles(root, tokens);
    mobileStyles(root, tokens);
  }
}
