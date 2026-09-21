import { ThemeTokens } from './theme.tokens.js';

export const defaultStyles = (root: HTMLElement, tokens: ThemeTokens) => {
  root.style.setProperty('--color-accent', tokens.accent);
  root.style.setProperty('--color-accent-sec', tokens.accentSec);
  root.style.setProperty('--color-accent-soft', tokens.accentSoft);
  root.style.setProperty('--color-bg-page', tokens.bgPage);
  root.style.setProperty('--color-bg-card', tokens.bgCard);
  root.style.setProperty('--color-bg-sidebar', tokens.bgSidebar);
  root.style.setProperty('--color-text-primary', tokens.textPrimary);
  root.style.setProperty('--color-text-secondary', tokens.textSecondary);
  root.style.setProperty('--color-border', tokens.border);
};

export const webStyles = (root: HTMLElement, tokens: ThemeTokens) => {
  // PrimeNG token sync — keeps PrimeNG in sync with the active theme
  root.style.setProperty('--p-primary-color', tokens.accent);
  root.style.setProperty('--p-primary-500', tokens.accent);
  root.style.setProperty('--p-primary-300', tokens.accentSec);
  root.style.setProperty('--p-highlight-background', tokens.accentSoft);
  root.style.setProperty('--p-highlight-color', tokens.accent);
  root.style.setProperty('--p-content-background', tokens.bgCard);
  root.style.setProperty('--p-surface-0', tokens.bgPage);
  root.style.setProperty('--p-surface-100', tokens.bgCard);
  root.style.setProperty('--p-text-color', tokens.textPrimary);
  root.style.setProperty('--p-text-muted-color', tokens.textSecondary);
  root.style.setProperty('--p-content-border-color', tokens.border);
  root.style.setProperty('--p-inputtext-background', tokens.bgCard);
  root.style.setProperty('--p-inputtext-border-color', tokens.border);
  root.style.setProperty('--p-inputtext-color', tokens.textPrimary);
  root.style.setProperty('--p-select-background', tokens.bgCard);
  root.style.setProperty('--p-select-border-color', tokens.border);
  root.style.setProperty('--p-select-color', tokens.textPrimary);
  root.style.setProperty('--p-select-overlay-background', tokens.bgCard);
  root.style.setProperty('--p-select-option-color', tokens.textPrimary);
  root.style.setProperty('--p-select-option-selected-background', tokens.accentSoft);
  root.style.setProperty('--p-select-option-selected-color', tokens.accent);
};

export const mobileStyles = (root: HTMLElement, tokens: ThemeTokens) => {
  // Ionic variable mapping — keeps mobile in sync without extra config
  root.style.setProperty('--ion-color-primary', tokens.accent);
  root.style.setProperty('--ion-background-color', tokens.bgPage);
  root.style.setProperty('--ion-card-background', tokens.bgCard);
  root.style.setProperty('--ion-text-color', tokens.textPrimary);
  root.style.setProperty('--ion-border-color', tokens.border);
  root.style.setProperty('--ion-toolbar-background', tokens.bgSidebar);
};
