import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BooksService } from '@libs/api-client';
import { BookDetail, BookFormat, ReadingProgress } from '@libs/types';
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';

type ReaderBackground = 'dark' | 'black' | 'light' | 'sepia';
type ReaderFont =
  'Lora' | 'Merriweather' | 'Source Serif 4' | 'Literata' | 'Libre Baskerville';
type PageTransition = 'none' | 'fade';

interface ReaderPrefs {
  background: ReaderBackground;
  fontSize: number;
  fontFamily: ReaderFont;
  lineHeight: number;
  transition: PageTransition;
}

const BG_COLORS: Record<ReaderBackground, { bg: string; text: string }> = {
  dark: { bg: '#1A2830', text: '#D0E8F0' },
  black: { bg: '#000000', text: '#E0E0E0' },
  light: { bg: '#FAF6EF', text: '#2C2416' },
  sepia: { bg: '#F5ECD7', text: '#3D2B1A' },
};

const FONTS: { name: ReaderFont; stack: string }[] = [
  { name: 'Lora', stack: "'Lora', serif" },
  { name: 'Merriweather', stack: "'Merriweather', serif" },
  { name: 'Source Serif 4', stack: "'Source Serif 4', serif" },
  { name: 'Literata', stack: "'Literata', serif" },
  { name: 'Libre Baskerville', stack: "'Libre Baskerville', serif" },
];

const LINE_HEIGHTS: { value: number; label: string }[] = [
  { value: 1.6, label: 'Normal' },
  { value: 1.9, label: 'Amplio' },
  { value: 2.4, label: 'Muy amplio' },
];

const DEFAULT_PREFS: ReaderPrefs = {
  background: 'dark',
  fontSize: 18,
  fontFamily: 'Lora',
  lineHeight: 1.6,
  transition: 'none',
};

const PAGE_GAP = 64;

function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem('librarium-reader-prefs');
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFS };
}

@Component({
  standalone: true,
  selector: 'app-reader',
  imports: [CommonModule, FormsModule],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.scss',
})
export default class ReaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('epubContainer') epubContainerRef?: ElementRef<HTMLDivElement>;

  readonly configPanelRef = viewChild<ElementRef>('configPanel');
  readonly viewportRef = viewChild<ElementRef>('viewport');
  readonly columnsRef = viewChild<ElementRef>('columns');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booksService = inject(BooksService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly bookId = signal<number>(0);
  readonly prefs = signal<ReaderPrefs>(loadPrefs());
  readonly showConfig = signal(false);
  readonly showResumeDialog = signal(false);
  readonly resumePosition = signal<ReadingProgress | null>(null);

  readonly percentage = signal(0);
  readonly cbzTotalPages = signal(0);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly format = signal<BookFormat | null>(null);

  readonly iframeUrl = signal<SafeResourceUrl | null>(null);

  // HTML column-based pagination
  readonly sanitizedHtml = signal<SafeHtml | null>(null);
  readonly htmlCurrentPage = signal(0);
  readonly htmlTotalPages = signal(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private epubBook: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private epubRendition: any = null;
  private readonly currentCfi = signal<string | null>(null);

  readonly cbzImages = signal<string[]>([]);
  readonly cbzPage = signal(0);

  private saveInterval?: ReturnType<typeof setInterval>;
  private recalcTimer?: ReturnType<typeof setTimeout>;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private bookInitialized = false;

  readonly bookQuery = injectQuery(() => ({
    queryKey: ['book', this.bookId()],
    queryFn: () => firstValueFrom(this.booksService.getOne(this.bookId())),
    enabled: this.bookId() > 0,
  }));

  readonly progressMutation = injectMutation(() => ({
    mutationFn: (dto: {
      currentPage?: number;
      totalPages?: number;
      epubCfi?: string;
      percentage?: number;
    }) => firstValueFrom(this.booksService.updateProgress(this.bookId(), dto)),
  }));

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.showConfig()) return;
    const panel = this.configPanelRef()?.nativeElement;
    if (panel && !panel.contains(event.target as Node)) {
      this.showConfig.set(false);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.format() !== 'html' || this.showConfig()) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.prevPage();
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.format() !== 'html' || this.htmlTotalPages() === 0) return;
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.recalculate(), 200);
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookId.set(id);
  }

  ngAfterViewInit() {
    const checkBook = setInterval(() => {
      if (this.bookInitialized) {
        clearInterval(checkBook);
        return;
      }
      const book = this.bookQuery.data();
      if (book) {
        this.bookInitialized = true;
        clearInterval(checkBook);
        this.initReader(book);
      }
    }, 100);
  }

  private async initReader(book: BookDetail) {
    this.isLoading.set(true);
    this.error.set(null);
    this.format.set(book.format ?? null);
    this.sanitizedHtml.set(null);
    this.htmlCurrentPage.set(0);
    this.htmlTotalPages.set(0);
    this.percentage.set(0);

    const progress = book.progress?.[0] ?? null;
    const streamUrl = this.booksService.getStreamUrl(this.bookId());
    let htmlMode = false;

    try {
      switch (book.format) {
        case 'pdf':
          this.iframeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(streamUrl));
          if (progress && (progress.percentage ?? 0) > 1) {
            this.resumePosition.set(progress);
            this.showResumeDialog.set(true);
          }
          break;

        case 'html': {
          htmlMode = true;
          const res = await fetch(streamUrl);
          if (!res.ok) throw new Error(`Error ${res.status} al cargar el libro`);
          const rawHtml = await res.text();
          this.sanitizedHtml.set(this.sanitizer.bypassSecurityTrustHtml(rawHtml));
          await document.fonts.ready;
          // Let Angular render the columns div before measuring
          setTimeout(() => {
            this.setupColumns(true);
            if (progress && (progress.currentPage ?? 0) > 0) {
              this.resumePosition.set(progress);
              this.showResumeDialog.set(true);
            }
          }, 100);
          break;
        }

        case 'epub':
          if (progress && (progress.percentage ?? 0) > 1) {
            this.resumePosition.set(progress);
            this.showResumeDialog.set(true);
          }
          await this.initEpub(streamUrl, progress?.epubCfi ?? null);
          break;

        case 'cbz':
          await this.initCbz(streamUrl, progress?.currentPage ?? 0);
          if (progress && (progress.percentage ?? 0) > 1) {
            this.resumePosition.set(progress);
            this.showResumeDialog.set(true);
          }
          break;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el libro';
      this.error.set(msg);
      htmlMode = false;
    }

    if (!htmlMode) {
      this.isLoading.set(false);
      this.startAutoSave();
    }
  }

  // setupColumns measures and lays out CSS columns.
  // finalize=true only on initial load (sets isLoading + startAutoSave).
  private setupColumns(finalize = false): void {
    const viewport = this.viewportRef()?.nativeElement as HTMLElement | undefined;
    const columns = this.columnsRef()?.nativeElement as HTMLElement | undefined;
    if (!viewport || !columns) return;

    // Width of one "page": fit in viewport minus arrow buttons, capped at 680px
    const pageWidth = Math.min(viewport.clientWidth - 64, 680);
    // Center the columns div horizontally inside the viewport
    const left = Math.max(0, (viewport.clientWidth - pageWidth) / 2);

    columns.style.width = `${pageWidth}px`;
    columns.style.left = `${left}px`;
    columns.style.columnWidth = `${pageWidth}px`;
    columns.style.columnGap = `${PAGE_GAP}px`;

    requestAnimationFrame(() => {
      const pageStep = pageWidth + PAGE_GAP;
      const total = Math.max(1, Math.ceil(columns.scrollWidth / pageStep));
      this.htmlTotalPages.set(total);
      this.goToPage(this.htmlCurrentPage());
      if (finalize) {
        this.isLoading.set(false);
        this.startAutoSave();
      }
    });
  }

  goToPage(index: number): void {
    const viewport = this.viewportRef()?.nativeElement as HTMLElement | undefined;
    const columns = this.columnsRef()?.nativeElement as HTMLElement | undefined;
    if (!viewport || !columns) return;

    const total = this.htmlTotalPages();
    const clamped = Math.max(0, Math.min(index, total - 1));
    this.htmlCurrentPage.set(clamped);

    const pageWidth = Math.min(viewport.clientWidth - 64, 680);
    const pageStep = pageWidth + PAGE_GAP;
    columns.style.setProperty('--page-offset', `${-clamped * pageStep}px`);
    this.percentage.set(Math.round((clamped / (total - 1 || 1)) * 100));
    this.saveProgress();
  }

  nextPage(): void {
    this.goToPage(this.htmlCurrentPage() + 1);
  }
  prevPage(): void {
    this.goToPage(this.htmlCurrentPage() - 1);
  }

  private recalculate(): void {
    if (this.format() !== 'html') return;
    clearTimeout(this.recalcTimer);
    this.recalcTimer = setTimeout(() => this.setupColumns(false), 50);
  }

  onContentClick(event: MouseEvent): void {
    if (this.showConfig()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (event.clientX > rect.left + rect.width / 2) {
      this.nextPage();
    } else {
      this.prevPage();
    }
  }

  private async initEpub(streamUrl: string, cfi: string | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const epubjs = (await import('epubjs')) as any;
    const Book = epubjs.default ?? epubjs;
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error(`Error ${response.status} al cargar EPUB`);
    const buffer = await response.arrayBuffer();

    this.epubBook = new Book(buffer, { openAs: 'epub' });
    const container = this.epubContainerRef?.nativeElement;
    if (!container) return;

    this.epubRendition = this.epubBook.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
    });

    if (cfi) {
      await this.epubRendition.display(cfi);
    } else {
      await this.epubRendition.display();
    }

    this.epubRendition.on(
      'locationChanged',
      (loc: { start: { cfi: string; percentage: number } }) => {
        this.currentCfi.set(loc.start.cfi);
        this.percentage.set(Math.round((loc.start.percentage ?? 0) * 100));
      }
    );
  }

  private async initCbz(streamUrl: string, startPage: number) {
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error(`Error ${response.status} al cargar CBZ`);
    const buffer = await response.arrayBuffer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jszip = (await import('jszip')) as any;
    const JSZip = jszip.default ?? jszip;
    const zip = await JSZip.loadAsync(buffer);
    const imageFiles = Object.keys(zip.files)
      .filter((name: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(name))
      .sort();

    const images: string[] = [];
    for (const name of imageFiles) {
      const blob = await zip.files[name].async('blob');
      images.push(URL.createObjectURL(blob));
    }

    this.cbzImages.set(images);
    this.cbzTotalPages.set(images.length);
    this.cbzPage.set(Math.min(startPage, Math.max(0, images.length - 1)));
    if (images.length > 0) {
      this.percentage.set(Math.round((startPage / images.length) * 100));
    }
  }

  resumeFromProgress() {
    this.showResumeDialog.set(false);
    const progress = this.resumePosition();
    if (!progress) return;
    if (this.format() === 'epub' && progress.epubCfi && this.epubRendition) {
      this.epubRendition.display(progress.epubCfi);
    } else if (this.format() === 'html' && (progress.currentPage ?? 0) > 0) {
      this.goToPage(progress.currentPage ?? 0);
    } else if (this.format() === 'cbz' && progress.currentPage != null) {
      this.cbzPage.set(progress.currentPage);
    }
  }

  startFromBeginning() {
    this.showResumeDialog.set(false);
  }

  epubPrev() {
    this.epubRendition?.prev();
  }
  epubNext() {
    this.epubRendition?.next();
  }

  cbzPrev() {
    const cur = this.cbzPage();
    if (cur > 0) {
      this.cbzPage.set(cur - 1);
      this.updateCbzProgress();
    }
  }

  cbzNext() {
    const cur = this.cbzPage();
    if (cur < this.cbzImages().length - 1) {
      this.cbzPage.set(cur + 1);
      this.updateCbzProgress();
    }
  }

  private updateCbzProgress() {
    const total = this.cbzImages().length;
    if (total > 0) this.percentage.set(Math.round((this.cbzPage() / total) * 100));
  }

  private startAutoSave() {
    if (this.saveInterval) return;
    this.saveInterval = setInterval(() => this.saveProgress(), 30000);
  }

  saveProgress() {
    const fmt = this.format();
    if (!fmt) return;
    const dto: {
      currentPage?: number;
      totalPages?: number;
      epubCfi?: string;
      percentage?: number;
    } = { percentage: this.percentage() };

    if (fmt === 'epub') dto.epubCfi = this.currentCfi() ?? undefined;
    if (fmt === 'cbz') {
      dto.currentPage = this.cbzPage();
      dto.totalPages = this.cbzTotalPages();
    }
    if (fmt === 'html') {
      dto.currentPage = this.htmlCurrentPage();
      dto.totalPages = this.htmlTotalPages();
    }
    this.progressMutation.mutate(dto);
  }

  toggleConfig(event: MouseEvent) {
    event.stopPropagation();
    this.showConfig.set(!this.showConfig());
  }

  setBackground(bg: ReaderBackground) {
    this.prefs.update((p) => ({ ...p, background: bg }));
    this.persistPrefs();
    this.applyEpubPrefs();
  }

  setFont(font: ReaderFont) {
    this.prefs.update((p) => ({ ...p, fontFamily: font }));
    this.persistPrefs();
    this.applyEpubPrefs();
    this.recalculate();
  }

  setLineHeight(lh: number) {
    this.prefs.update((p) => ({ ...p, lineHeight: lh }));
    this.persistPrefs();
    this.applyEpubPrefs();
    this.recalculate();
  }

  setTransition(t: PageTransition) {
    this.prefs.update((p) => ({ ...p, transition: t }));
    this.persistPrefs();
  }

  increaseFontSize() {
    this.prefs.update((p) => ({ ...p, fontSize: Math.min(p.fontSize + 2, 32) }));
    this.persistPrefs();
    this.applyEpubPrefs();
    this.recalculate();
  }

  decreaseFontSize() {
    this.prefs.update((p) => ({ ...p, fontSize: Math.max(p.fontSize - 2, 12) }));
    this.persistPrefs();
    this.applyEpubPrefs();
    this.recalculate();
  }

  private applyEpubPrefs() {
    if (!this.epubRendition) return;
    const { background, fontSize, fontFamily, lineHeight } = this.prefs();
    const bg = BG_COLORS[background];
    this.epubRendition.themes.override('font-size', `${fontSize}px`);
    this.epubRendition.themes.override('color', bg.text);
    this.epubRendition.themes.override('background', bg.bg);
    this.epubRendition.themes.override('font-family', `'${fontFamily}', serif`);
    this.epubRendition.themes.override('line-height', String(lineHeight));
  }

  private persistPrefs() {
    localStorage.setItem('librarium-reader-prefs', JSON.stringify(this.prefs()));
  }

  goBack() {
    this.saveProgress();
    this.router.navigate(['/books', this.bookId()]);
  }

  get bgColors() {
    return BG_COLORS;
  }
  get backgroundKeys(): ReaderBackground[] {
    return ['dark', 'black', 'light', 'sepia'];
  }
  get bgLabels(): Record<ReaderBackground, string> {
    return { dark: 'Oscuro', black: 'Negro', light: 'Claro', sepia: 'Sepia' };
  }
  get fonts() {
    return FONTS;
  }
  get lineHeights() {
    return LINE_HEIGHTS;
  }

  ngOnDestroy() {
    this.saveProgress();
    if (this.saveInterval) clearInterval(this.saveInterval);
    clearTimeout(this.recalcTimer);
    clearTimeout(this.resizeTimer);
    this.cbzImages().forEach((url) => URL.revokeObjectURL(url));
    this.epubBook?.destroy?.();
  }
}
