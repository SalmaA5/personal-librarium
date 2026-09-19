export type ThemePalette = 'teal' | 'mauve';
export type ThemeMode = 'light' | 'dark';
export interface ThemeConfig {
  palette: ThemePalette;
  mode: ThemeMode;
}
