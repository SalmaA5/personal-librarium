import {
  THEME_TOKENS,
  ThemeConfig,
  ThemePalette,
  ThemeMode,
} from '@librarium/utils';

const STORAGE_KEY = 'librarium-theme';

function applyTokens(palette: ThemePalette, mode: ThemeMode): void {
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
}

export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  let palette: ThemePalette = 'teal';
  let mode: ThemeMode = window.matchMedia('(prefers-color-scheme: dark)')
    .matches
    ? 'dark'
    : 'light';

  if (saved) {
    try {
      const config = JSON.parse(saved) as ThemeConfig;
      palette = config.palette;
      mode = config.mode;
    } catch {
      // use system defaults
    }
  }

  applyTokens(palette, mode);
}
