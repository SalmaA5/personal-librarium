import { ThemeMode, ThemePalette } from './theme.types.js';

export interface ThemeTokens {
  accent: string;
  accentSec: string;
  accentSoft: string;
  bgPage: string;
  bgCard: string;
  bgSidebar: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export const THEME_TOKENS: Record<ThemePalette, Record<ThemeMode, ThemeTokens>> = {
  teal: {
    light: {
      accent: '#386878',
      accentSec: '#90B8C0',
      accentSoft: '#D8ECF2',
      bgPage: '#F2F7F9',
      bgCard: '#FFFFFF',
      bgSidebar: '#FFFFFF',
      textPrimary: '#0E2430',
      textSecondary: '#5888A0',
      border: '#C8DCE4',
    },
    dark: {
      accent: '#386878',
      accentSec: '#5898B0',
      accentSoft: '#223540',
      bgPage: '#0E161C',
      bgCard: '#1A2830',
      bgSidebar: '#121C24',
      textPrimary: '#D0E8F0',
      textSecondary: '#405868',
      border: 'rgba(255,255,255,0.07)',
    },
  },
  mauve: {
    light: {
      accent: '#9E6878',
      accentSec: '#B89AA8',
      accentSoft: '#F5DDE3',
      bgPage: '#FAF3F5',
      bgCard: '#FFFFFF',
      bgSidebar: '#FFFFFF',
      textPrimary: '#3A0F1A',
      textSecondary: '#A07888',
      border: '#EACFD6',
    },
    dark: {
      accent: '#9E6878',
      accentSec: '#C890A8',
      accentSoft: '#3D2035',
      bgPage: '#1A1020',
      bgCard: '#2E2030',
      bgSidebar: '#251525',
      textPrimary: '#F5E8F0',
      textSecondary: '#806070',
      border: 'rgba(255,255,255,0.07)',
    },
  },
};
