import {
  THEME_TOKENS,
  ThemeConfig,
  ThemeMode,
  ThemePalette,
  defaultStyles,
  webStyles,
} from '@libs/utils';

const STORAGE_KEY = 'librarium-theme';

function applyTokens(palette: ThemePalette, mode: ThemeMode): void {
  const tokens = THEME_TOKENS[palette][mode];
  const root = document.documentElement;

  defaultStyles(root, tokens);
  webStyles(root, tokens);
}

export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  let palette: ThemePalette = 'teal';
  let mode: ThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches
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
