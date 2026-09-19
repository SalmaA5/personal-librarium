import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import {
  BooksService,
  CollectionTypesService,
  CollectionsService,
} from '@librarium/api-client';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './collections.component.html',
  styleUrl: './collections.component.scss',
})
export default class CollectionsComponent {
  private readonly collectionsService = inject(CollectionsService);
  private readonly collectionTypesService = inject(CollectionTypesService);
  private readonly booksService = inject(BooksService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly queryClient = injectQueryClient();

  readonly filterTypeId = signal<number | null>(null);
  readonly showCreateForm = signal(false);

  readonly typesQuery = injectQuery(() => ({
    queryKey: ['collection-types'],
    queryFn: () => firstValueFrom(this.collectionTypesService.getAll()),
  }));

  readonly collectionsQuery = injectQuery(() => ({
    queryKey: ['collections', this.filterTypeId()],
    queryFn: () =>
      firstValueFrom(
        this.collectionsService.getAll(
          this.filterTypeId() !== null
            ? { typeId: this.filterTypeId()! }
            : undefined,
        ),
      ),
  }));

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    typeId: [0, Validators.min(1)],
  });

  readonly createMutation = injectMutation(() => ({
    mutationFn: (dto: { name: string; description?: string; typeId: number }) =>
      firstValueFrom(this.collectionsService.create(dto)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['collections'] });
      this.createForm.reset({ name: '', description: '', typeId: 0 });
      this.showCreateForm.set(false);
    },
  }));

  setFilter(typeId: number | null): void {
    this.filterTypeId.set(typeId);
  }

  openCreateForm(): void {
    const firstType = this.typesQuery.data()?.[0];
    if (firstType) this.createForm.patchValue({ typeId: firstType.id });
    this.showCreateForm.set(true);
  }

  cancelCreate(): void {
    this.createForm.reset({ name: '', description: '', typeId: 0 });
    this.showCreateForm.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const raw = this.createForm.getRawValue();
    this.createMutation.mutate({
      name: raw.name!,
      ...(raw.description ? { description: raw.description } : {}),
      typeId: Number(raw.typeId),
    });
  }

  navigate(id: number): void {
    this.router.navigate(['/collections', id]);
  }

  coverSlots(covers: string[]): (string | null)[] {
    const slots: (string | null)[] = covers.slice(0, 4);
    while (slots.length < 4) slots.push(null);
    return slots;
  }

  getCoverUrl(coverUrl: string | null): string {
    return this.booksService.getCoverUrl(coverUrl);
  }
}
