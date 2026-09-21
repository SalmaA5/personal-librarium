import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { CollectionTypesService, MetadataService } from '@libs/api-client';
import { CollectionType, MetadataItem } from '@libs/types';
import { FORM_IMPORTS, PRIMENG_IMPORTS } from '@libs/ui-shared';
import { ThemePalette, ThemeService } from '@libs/utils';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

type UiMode = 'dark' | 'light' | 'system';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FORM_IMPORTS, PRIMENG_IMPORTS, NgClass],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export default class SettingsComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly metadataService = inject(MetadataService);
  private readonly collectionTypesService = inject(CollectionTypesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly queryClient = inject(QueryClient);

  // ── Theme ────────────────────────────────────────────────────────────────
  readonly uiMode = signal<UiMode>(this.themeService.currentTheme().mode);

  readonly paletteOptions = [
    { label: 'Teal', value: 'teal' as ThemePalette },
    { label: 'Mauve', value: 'mauve' as ThemePalette },
  ];

  readonly modeOptions = [
    { label: 'Oscuro', value: 'dark' as UiMode },
    { label: 'Claro', value: 'light' as UiMode },
    { label: 'Sistema', value: 'system' as UiMode },
  ];

  readonly skeletonChips = [1, 2, 3];

  // ── Queries ──────────────────────────────────────────────────────────────
  readonly genresQuery = injectQuery(() => ({
    queryKey: ['genres'],
    queryFn: () => firstValueFrom(this.metadataService.getGenres()),
  }));

  readonly tagsQuery = injectQuery(() => ({
    queryKey: ['tags'],
    queryFn: () => firstValueFrom(this.metadataService.getTags()),
  }));

  readonly collectionTypesQuery = injectQuery(() => ({
    queryKey: ['collection-types'],
    queryFn: () => firstValueFrom(this.collectionTypesService.getAll()),
  }));

  // ── Genre edit state ──────────────────────────────────────────────────────
  readonly editingGenreId = signal<number | null>(null);
  readonly editingGenreName = signal('');
  readonly showAddGenre = signal(false);
  readonly addGenreName = signal('');

  // ── Tag edit state ────────────────────────────────────────────────────────
  readonly editingTagId = signal<number | null>(null);
  readonly editingTagName = signal('');
  readonly showAddTag = signal(false);
  readonly addTagName = signal('');

  // ── Collection type edit state ────────────────────────────────────────────
  readonly editingCtId = signal<number | null>(null);
  readonly editingCtName = signal('');
  readonly showAddCt = signal(false);
  readonly addCtName = signal('');

  // ── Genre mutations ───────────────────────────────────────────────────────
  readonly createGenreMutation = injectMutation(() => ({
    mutationFn: (name: string) => firstValueFrom(this.metadataService.createGenre(name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['genres'] });
      this.showAddGenre.set(false);
      this.addGenreName.set('');
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly updateGenreMutation = injectMutation(() => ({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      firstValueFrom(this.metadataService.updateGenre(id, name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['genres'] });
      this.editingGenreId.set(null);
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly deleteGenreMutation = injectMutation(() => ({
    mutationFn: (id: number) => firstValueFrom(this.metadataService.deleteGenre(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['genres'] });
    },
    onError: (err: unknown) =>
      this.showConflictOrError(err, 'No se puede eliminar: tiene libros asociados'),
  }));

  // ── Tag mutations ─────────────────────────────────────────────────────────
  readonly createTagMutation = injectMutation(() => ({
    mutationFn: (name: string) => firstValueFrom(this.metadataService.createTag(name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['tags'] });
      this.showAddTag.set(false);
      this.addTagName.set('');
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly updateTagMutation = injectMutation(() => ({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      firstValueFrom(this.metadataService.updateTag(id, name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['tags'] });
      this.editingTagId.set(null);
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly deleteTagMutation = injectMutation(() => ({
    mutationFn: (id: number) => firstValueFrom(this.metadataService.deleteTag(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err: unknown) =>
      this.showConflictOrError(err, 'No se puede eliminar: tiene libros asociados'),
  }));

  // ── Collection type mutations ──────────────────────────────────────────────
  readonly createCtMutation = injectMutation(() => ({
    mutationFn: (name: string) =>
      firstValueFrom(this.collectionTypesService.create(name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['collection-types'] });
      this.showAddCt.set(false);
      this.addCtName.set('');
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly updateCtMutation = injectMutation(() => ({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      firstValueFrom(this.collectionTypesService.update(id, name)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['collection-types'] });
      this.editingCtId.set(null);
    },
    onError: (err: unknown) => this.showError(err),
  }));

  readonly deleteCtMutation = injectMutation(() => ({
    mutationFn: (id: number) => firstValueFrom(this.collectionTypesService.remove(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['collection-types'] });
    },
    onError: (err: unknown) =>
      this.showConflictOrError(err, 'No se puede eliminar: tiene colecciones asociadas'),
  }));

  // ── Theme handlers ────────────────────────────────────────────────────────
  selectPalette(palette: ThemePalette): void {
    if (this.uiMode() === 'system') {
      this.themeService.setTheme(palette, this.themeService.currentTheme().mode);
      this.themeService.followSystem();
    } else {
      this.themeService.setTheme(palette, this.themeService.currentTheme().mode);
    }
  }

  selectMode(mode: UiMode): void {
    this.uiMode.set(mode);
    if (mode === 'system') {
      this.themeService.followSystem();
    } else {
      this.themeService.setTheme(this.themeService.currentTheme().palette, mode);
    }
  }

  // ── Genre handlers ────────────────────────────────────────────────────────
  startEditGenre(item: MetadataItem): void {
    this.editingGenreId.set(item.id);
    this.editingGenreName.set(item.name);
    this.showAddGenre.set(false);
  }

  cancelEditGenre(): void {
    this.editingGenreId.set(null);
  }

  confirmEditGenre(id: number): void {
    const name = this.editingGenreName().trim();
    if (name) this.updateGenreMutation.mutate({ id, name });
  }

  confirmDeleteGenre(item: MetadataItem): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el género "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.deleteGenreMutation.mutate(item.id),
    });
  }

  confirmAddGenre(): void {
    const name = this.addGenreName().trim();
    if (name) this.createGenreMutation.mutate(name);
  }

  // ── Tag handlers ──────────────────────────────────────────────────────────
  startEditTag(item: MetadataItem): void {
    this.editingTagId.set(item.id);
    this.editingTagName.set(item.name);
    this.showAddTag.set(false);
  }

  cancelEditTag(): void {
    this.editingTagId.set(null);
  }

  confirmEditTag(id: number): void {
    const name = this.editingTagName().trim();
    if (name) this.updateTagMutation.mutate({ id, name });
  }

  confirmDeleteTag(item: MetadataItem): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el tag "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.deleteTagMutation.mutate(item.id),
    });
  }

  confirmAddTag(): void {
    const name = this.addTagName().trim();
    if (name) this.createTagMutation.mutate(name);
  }

  // ── Collection type handlers ──────────────────────────────────────────────
  startEditCt(item: CollectionType): void {
    this.editingCtId.set(item.id);
    this.editingCtName.set(item.name);
    this.showAddCt.set(false);
  }

  cancelEditCt(): void {
    this.editingCtId.set(null);
  }

  confirmEditCt(id: number): void {
    const name = this.editingCtName().trim();
    if (name) this.updateCtMutation.mutate({ id, name });
  }

  confirmDeleteCt(item: CollectionType): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el tipo "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.deleteCtMutation.mutate(item.id),
    });
  }

  confirmAddCt(): void {
    const name = this.addCtName().trim();
    if (name) this.createCtMutation.mutate(name);
  }

  // ── Error helpers ─────────────────────────────────────────────────────────
  private showError(err: unknown): void {
    const detail =
      err instanceof HttpErrorResponse
        ? (err.error?.message ?? err.message)
        : 'Error inesperado';
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }

  private showConflictOrError(err: unknown, conflictMsg: string): void {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede eliminar',
        detail: conflictMsg,
      });
    } else {
      this.showError(err);
    }
  }
}
