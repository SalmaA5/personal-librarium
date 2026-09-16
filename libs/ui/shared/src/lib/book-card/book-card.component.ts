import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from '@librarium/types';

@Component({
  selector: 'lib-book-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book-card.component.html',
  styleUrl: './book-card.component.scss',
})
export class BookCardComponent {
  readonly book = input.required<Book>();

  readonly firstAuthor = computed(() => this.book().authors?.[0]?.name ?? '');
  readonly percentage = computed(() => this.book().progress?.percentage ?? 0);
  readonly hasCover = computed(() => !!this.book().coverUrl);
}
