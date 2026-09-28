# WORK_LOG

## 2026-09-20 — Página de importación desde Google Drive

### Qué se hizo

#### 1. API: nuevo endpoint `GET /api/books/drive/:driveFileId`

- **`apps/api/src/books/books.service.ts`**: añadido `findByDriveFileId(driveFileId)` — busca por `drive_file_id` en la BD y delega en `findOne` para devolver el libro completo con relaciones.
- **`apps/api/src/books/books.controller.ts`**: añadida ruta `@Get('drive/:driveFileId')` **antes** de `@Get(':id')` (orden crítico para que NestJS no parsee "drive" como `ParseIntPipe`). Devuelve 404 si no existe.

#### 2. API Client: `BooksService.getByDriveFileId`

- **`libs/shared/api-client/.../books.service.ts`**: añadido método `getByDriveFileId(driveFileId: string): Observable<BookDetail>` → `GET /api/books/drive/:driveFileId`.

#### 3. Página de importación (`apps/web/src/app/pages/import/`)

**Explorador de carpetas:**

- Breadcrumb reactivo con `signal<BreadcrumbItem[]>`. Click en item del breadcrumb navega de vuelta a ese nivel (`breadcrumb.slice(0, idx+1)`).
- `DriveService.listFolders(parentId?)` para subcarpetas — TanStack Query con `queryKey: ['drive', 'folders', folderId]`.
- `DriveService.listFiles(folderId)` para ficheros — solo activo cuando `currentFolderId !== null`.
- Click en carpeta navega dentro; breadcrumb actualiza.

**Búsqueda:**

- Input con debounce 500ms (`toSignal + debounceTime`).
- Cuando `debouncedSearch.trim().length > 0` → modo búsqueda: se llama `DriveService.searchFiles(query)` y se muestran resultados. Al limpiar vuelve al explorador.

**Ya importado:**

- `effect` reactivo que, por cada fichero visible, llama `BooksService.getByDriveFileId(file.id)`:
  - 200 → guarda `bookId` en `importedMap` → muestra badge "Ya importado".
  - 404 → guarda `false` → muestra botón "+ Importar".
- `checkingIds: Set<string>` evita llamadas duplicadas mientras la respuesta está en vuelo.

**Importación con progreso simulado:**

- Click "+ Importar" abre un overlay/dialog.
- 5 pasos simulados con delays `[0, 1200, 2800, 4500, 6500]ms` mientras la llamada real a `ImportService.importFromDrive(driveFileId)` está en curso.
- Al resolver: avanza todos los pasos a "done" → 500ms después muestra "✓ Libro importado correctamente" con botón "Ver libro" → navega a `/books/:id`.
- Al fallar: muestra error + botones "Cerrar" / "Reintentar".
- El dialog no se cierra haciendo click fuera si el estado es `loading`.

**Icono de formato:**

- `.epub` → 📗, `.pdf` → 📕, `.cbz/.cbr` → 🖼️, otros → 📄.

### Decisiones tomadas

- **Simulación de pasos vs. progreso real**: La API de importación es una sola llamada (no SSE/websocket), así que los pasos se simulan con `setTimeout`. Esto es lo que pide el enunciado. En el futuro, si la API emite eventos de progreso, se puede reemplazar.
- **Granularidad del check "ya importado"**: Se hace una llamada HTTP por fichero. Dado que los ficheros se cargan de uno en uno (una carpeta a la vez), el número de llamadas es manejable. Si la carpeta tiene muchos ficheros, considerar un endpoint batch en el futuro.
- **Orden de rutas NestJS**: `GET books/drive/:driveFileId` antes de `GET books/:id` para evitar que NestJS intente parsear "drive" como entero.

### Pendiente / limitaciones

- La autenticación con Google Drive no está implementada (módulo `drive` del API es un scaffold vacío). La UI está lista pero las llamadas al API devolverán error hasta que se implemente OAuth.
- No hay endpoint batch para verificar múltiples `driveFileId` a la vez.

### Preguntas para revisión humana

- ¿El mensaje de notificación del `curl` al terminar el import debe ser diferente al de finalización de tarea general?
- ¿El dialog de progreso debería mostrarse en un `p-dialog` de PrimeNG o está bien el overlay CSS custom?

---

## 2026-09-20 — Página de Ajustes

### Qué se hizo

#### 1. API: CRUD completo para géneros, tags y autores

- **`apps/api/src/metadata/dto/create-metadata-item.dto.ts`** (nuevo): DTO con `name: string` validado con `@IsString` + `@MinLength(1)`.
- **`apps/api/src/metadata/metadata.service.ts`**: añadidos métodos `createGenre`, `updateGenre`, `deleteGenre`, `createTag`, `updateTag`, `deleteTag`, `createAuthor`, `updateAuthor`, `deleteAuthor`.
  - Los deletes hacen check de uso (`bookGenre` / `bookTag` / `bookAuthor`) y lanzan `ConflictException` (409) si hay libros asociados.
- **`apps/api/src/metadata/metadata.controller.ts`**: añadidos `POST/PATCH/DELETE` para géneros, tags y autores con decoradores Swagger completos.

#### 2. API Client: nuevos métodos en MetadataService

- **`libs/shared/api-client/.../services/metadata.service.ts`**: `createGenre`, `updateGenre`, `deleteGenre`, `createTag`, `updateTag`, `deleteTag`, `createAuthor`, `updateAuthor`, `deleteAuthor`.

#### 3. Página de Ajustes (`apps/web/src/app/pages/settings/`)

**Sección Apariencia:**

- Selector de paleta (Teal / Mauve) con dot circular del color acento de cada tema.
- Selector de modo (Oscuro / Claro / Sistema). "Sistema" llama a `ThemeService.followSystem()`.
- El botón activo se resalta con `border: 2px solid var(--color-accent)`.
- `uiMode` es un signal local `'dark' | 'light' | 'system'` para trackear el modo de la UI sin depender del localStorage (que solo guarda dark/light, no system).

**Secciones Géneros / Tags / Tipos de colección (mismo patrón):**

- TanStack Query (`injectQuery`) para carga, `injectMutation` para create/update/delete.
- Chip en modo vista: nombre + botón ✏ (editar inline) + botón × (eliminar con confirm).
- Chip en modo edición: `<input>` con `Enter` para confirmar, `Escape` para cancelar.
- Botón `+ Añadir` abre un chip de edición al final.
- Delete con `ConfirmationService` (PrimeNG) — usa el `<p-confirmDialog />` del shell.
- Error 409 → toast `warn` "No se puede eliminar: tiene libros/colecciones asociados".
- Tras cada mutación, `queryClient.invalidateQueries` para refrescar datos.

### Decisiones tomadas

- **`uiMode` signal local vs. detectar "system" desde localStorage**: ThemeService no expone si está en modo sistema (guarda 'dark'/'light' en localStorage). El modo "Sistema" no se recupera en un recarga de página. Esto es aceptable como primera iteración.
- **Chips custom vs. PrimeNG `<p-chip>`**: Custom para tener control total sobre el inline editing.
- **`autofocus` en inputs inline**: Funciona al crear el elemento dinámicamente en navegadores modernos; no garantizado en todos pero suficiente para esta UX.

### Preguntas para revisión humana

- ¿El modo "Sistema" debería persistirse en localStorage (con una clave extra) para restaurarlo al recargar?
- ¿Se quiere añadir la sección de Autores en la UI de ajustes también?

---

## 2026-09-21 — Página de Lector (COMPLETADO)

### Qué se hizo

#### 1. Paquetes instalados

- `epubjs@0.3.93` — lector EPUB con paginación y progreso vía CFI
- `jszip@3.10.2` — extracción de archivos CBZ (ya estaba en package.json, confirmado en lockfile)
- Se descartó `ngx-extended-pdf-viewer` → PDF usa `<iframe>` con el visor nativo del navegador (más simple, sin configuración de assets)

#### 2. Types (`libs/shared/types/src/lib/book.types.ts`)

- Añadida interfaz `ReadContent { format, streamUrl, book }`

#### 3. API (`apps/api/src/books/`)

- **`books.service.ts`**: añadido `getReadContent(id)` → devuelve `{ format, streamUrl, book }`
- **`books.controller.ts`**: añadidos `GET :id/read` y `GET :id/read/stream` (stub 501) ANTES de `GET :id`

#### 4. API Client (`libs/shared/api-client/.../books.service.ts`)

- Añadidos `readBook(id)` → `Observable<ReadContent>` y `getStreamUrl(id)` → `string`

#### 5. Shell (`apps/web/src/app/shell/`)

- **`shell.component.html`**: `@if (!isReader())` guards sobre `<aside>` y `<header>`; `<main>` con clase dinámica `reader-content` vs `content`
- **`shell.component.scss`**: añadida clase `.reader-content` (flex:1, overflow:hidden, padding:0)

#### 6. Reader component (`apps/web/src/app/pages/reader/`)

- **`reader.component.ts`**: implementación completa con:
  - `injectQuery` para cargar el libro, `injectMutation` para guardar progreso
  - Switch por `format`: epub → epubjs (ArrayBuffer fetch), pdf/html → iframe, cbz → JSZip + object URLs
  - Preferencias de lector (fondo x4, tamaño de fuente) persistidas en `librarium-reader-prefs`
  - Auto-save cada 30s + save on destroy
  - Resume dialog si progress.percentage > 1
- **`reader.component.html`**: top bar, config panel, área de contenido por formato, resume overlay
- **`reader.component.scss`**: tema oscuro con glass-morphism en controles; adaptable a los 4 fondos

### Decisiones tomadas

- **PDF nativo en lugar de ngx-extended-pdf-viewer**: evita la complejidad de assets y compatibilidad con Angular 21. El `<iframe>` con la URL del stream funciona en todos los navegadores modernos.
- **epubjs con `any` tipado**: `epubjs` no tiene typings oficiales para Angular 21; se usa `import('epubjs') as any` con comentarios `eslint-disable` para evitar errores de TS.
- **`ngAfterViewInit` con polling de 100ms**: necesario porque `injectQuery` es asíncrono; el polling se detiene en cuanto llegan los datos del libro.
- **CBZ con object URLs**: `URL.createObjectURL` evita inyección de base64 en el DOM; se revocan en `ngOnDestroy`.

### Pendiente / limitaciones

- La autenticación con Google Drive no está implementada; `GET /api/books/:id/read/stream` devuelve 501. El lector mostrará el error correctamente cuando el usuario intente abrir un libro.
- El progreso en PDF/HTML no se puede trackear automáticamente (el iframe no expone su posición de scroll).

### Preguntas para revisión humana

- ¿Se quiere añadir un botón "Ver a pantalla completa" en el lector de PDF?

---

## 2026-09-22 — Fix stream endpoint: path resolution

### Problema

`GET /api/books/:id/read/stream` devolvía 404 aunque el archivo existía. El `cachedPath` en BD se guarda como URL path (`/uploads/html/file.html`), pero `stat()` lo interpretaba como ruta absoluta de sistema de ficheros — en Windows buscaba `C:\uploads\html\...` en lugar de `<cwd>\uploads\html\...`.

### Fix aplicado

**`apps/api/src/books/books.service.ts`**:

- Si `cachedPath` empieza por `/`, se resuelve contra `process.cwd()` usando `join()` — mismo comportamiento que `app.useStaticAssets(join(process.cwd(), 'uploads'), ...)` en `main.ts`.

**`apps/api/src/main.ts`**:

- El middleware global que fuerza `Content-Type: application/json` excluye ahora `/read/stream` además de `/docs`, para que el `StreamableFile` pueda escribir su propio MIME type.

### Resultado

El stream funciona para archivos con `cachedPath` relativo al directorio `uploads/` del servidor.

---

## 2026-09-22 — Auto-reconexión Google Drive desde la web

### Problema

Los tokens OAuth de Google Drive caducan a los 7 días en modo Testing. Al caducar, la API tiraba un error sin forma de reconectarse desde la UI.

### Cambios

**API (`apps/api/src/`)**:

- **`drive/drive.service.ts`**: `isAuthError()` ahora también captura el error `"No access, refresh token, API key or refresh handler callback is set."` (se lanzaba antes de hacer ninguna llamada HTTP, por lo que no tenía `status: 401` y no lo atrapaba antes).
- **`auth/auth.service.ts`**: añadido `getWebBaseUrl()` — lee `WEB_BASE_URL` del env (default `http://localhost:4200`).
- **`auth/auth.controller.ts`**: el callback de OAuth ya no devuelve HTML — redirige a `{WEB_BASE_URL}/import?auth=success` o `?auth=error&message=...`.

**Web (`apps/web/src/app/pages/import/`)**:

- `import.component.ts`: computed `driveUnauthorized` detecta cuando cualquier query de Drive falla con 401; `connectDrive()` redirige a `/api/auth/google`; `ngOnInit` lee `?auth=success/error` y muestra toast.
- `import.component.html`: cuando Drive devuelve 401, muestra banner "Conectar Drive" con botón en lugar del error genérico.
- `import.component.scss`: estilos del banner `.auth-banner` y `.btn-connect`.

### Flujo resultante

1. Drive falla con 401 → banner "Google Drive no conectado" + botón "Conectar Drive"
2. Click → `window.location.href = http://localhost:3000/api/auth/google`
3. Flujo OAuth de Google → callback → redirect a `http://localhost:4200/import?auth=success`
4. La web muestra toast "Google Drive conectado" y las queries se relanzan

---

## 2026-09-22 — Fix: `insert into app_config` race condition

### Problema

Tras completar el flujo OAuth, el toast mostraba `Failed query: insert into "app_config"`. El `pnpm db:migrate` había corrido con éxito y la tabla existía, pero el insert seguía fallando.

### Causa raíz

`google-auth-library` emite el evento `tokens` **durante** la llamada a `getToken(code)`, antes de que ésta devuelva. El `handleCallback` en `auth.service.ts` hacía:

1. `const { tokens } = await this.oauth2Client.getToken(code);` — esto emite el evento `tokens` → `saveTokens` se llama (fire-and-forget)
2. `await this.saveTokens(tokens)` — segunda llamada a `saveTokens`

Las dos llamadas corrían casi en paralelo. Ambas hacían `SELECT` → encontraban 0 filas → intentaban `INSERT`. La segunda falla con `UNIQUE constraint failed: app_config.key`.

### Fix aplicado

**`apps/api/src/auth/auth.service.ts`**: `saveTokens` reemplaza el patrón `select → insert/update` por un **upsert** atómico con `onConflictDoUpdate`:

```typescript
await this.db
  .insert(appConfig)
  .values({ key: TOKENS_KEY, value, updatedAt })
  .onConflictDoUpdate({ target: appConfig.key, set: { value, updatedAt } });
```

Genera `INSERT OR REPLACE` en SQLite/libSQL, eliminando la race condition completamente.

---

## 2026-09-22 — Fix: DOCX con w:altChunk produce HTML vacío

### Problema

Al importar un DOCX cuyo contenido es HTML embebido (`w:altChunk`), mammoth devolvía `htmlContent.length=0`. Esto ocurre en DOCX creados a partir de contenido web (fanfics, etc.): el texto no está en formato Word XML nativo sino en un chunk HTML incrustado en el ZIP.

### Causa

Mammoth ignora explícitamente `w:altChunk` — está fuera de su scope. El warning que emite: `An unrecognised element was ignored: w:altChunk`.

### Fix aplicado

**`apps/api/src/import/import.service.ts`**: si mammoth devuelve HTML vacío, se activa un fallback `extractAltChunkHtml`:

1. Abre el buffer como ZIP (JSZip)
2. Lee `word/_rels/document.xml.rels` y busca relaciones de tipo `aFChunk`
3. Extrae los archivos referenciados (normalmente `word/afChunk.htm`) y los concatena como HTML

El HTML resultante se escribe directamente al disco y se sirve en el iframe del lector.

### Logging añadido

Se añadieron logs `[ImportService]` para cada paso del import, incluyendo el tamaño del buffer, la longitud del HTML producido por mammoth, y mensajes/warnings de mammoth.

---

## 2026-09-23 — Mejoras UI del lector: panel oscuro, fuentes, fade, cierre con click fuera

### Qué se hizo

#### 1. Cierre del panel de configuración al hacer click fuera

- `viewChild<ElementRef>('configPanel')` (señal) para referenciar el panel
- `@HostListener('document:click', ['$event'])` → `onDocumentClick()`: si `showConfig()` y el click no está dentro del panel, cierra el panel
- `toggleConfig(event: MouseEvent)` recibe el evento y llama `event.stopPropagation()` para evitar que el botón ⚙ cierre el panel inmediatamente al abrirlo
- Guard en `onContentClick`: si `showConfig()` está abierto, no navega páginas

#### 2. Panel de configuración siempre oscuro

- `.config-panel`: `background: #1a2830; color: #d0e8f0` — fijo, independiente del tema del lector
- `.config-label`: `color: #8ba8b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em`
- `.font-option.active`: `background: #223540; color: #88b8c8`
- `.btn-sm.active`: `background: #223540; border-color: #88b8c8; color: #88b8c8`
- Todos los textos y botones del panel con colores absolutos, no heredados del tema

#### 3. Selector de fuente con preview en tipografía propia

- Ya existía. Actualizado el estilo `.font-option` para que use los colores del panel oscuro.

#### 4. Opción de transición de página

- Nuevo tipo `PageTransition = 'none' | 'fade'` añadido a `ReaderPrefs`
- Signal `pageVisible = signal(true)` controla la opacidad de la página
- `changePage(dir)` async: si `transition === 'fade'` → pone `pageVisible(false)` → espera 150ms → cambia página → `pageVisible(true)`
- Guard `!pageVisible()` en `changePage` para evitar doble click durante el fade
- `.page` tiene `transition: opacity 0.15s ease` y `.page--hidden { opacity: 0 }`
- Eliminados los signals `outgoingHtml`, `direction`, `isAnimating` del sistema slide anterior
- En el panel: dos botones "Sin animación" / "Fade suave"

#### 5. Todas las preferencias en localStorage

- `ReaderPrefs` incluye `background`, `fontSize`, `fontFamily`, `lineHeight`, `transition`
- `DEFAULT_PREFS` tiene `transition: 'none'`
- `loadPrefs()` hace spread sobre `DEFAULT_PREFS` para aceptar nuevas keys sin romper prefs antiguas
- `persistPrefs()` llamado en todos los setters (incluyendo `setTransition`)

### Decisiones

- **`viewChild` vs `@ViewChild`**: el panel está dentro de `@if(showConfig())` — `viewChild` (señal) devuelve `undefined` cuando el elemento no está en el DOM, sin necesidad de `@ViewChild + ngAfterViewInit`. Más limpio.
- **Fade sobre slide**: el slide requería dos divs simultáneos en el DOM (complejo con `@if`). El fade es más simple: un solo div, opacidad controlada por señal.

---

## 2026-09-23 — Rediseño paginación HTML: slide-transition sin scroll interno

### Qué se hizo

Rediseñado el sistema de paginación del lector HTML para eliminar el scroll por página y usar transiciones de deslizamiento horizontal entre páginas.

#### Cambios en `reader.component.ts`

- Eliminados: `htmlPageWrapRef` (ViewChild), `onPageScroll()` (auto-advance por scroll)
- Añadidos signals: `outgoingHtml`, `direction`, `isAnimating`
- `nextHtmlPage()` / `prevHtmlPage()`: capturan el HTML saliente, activan la animación, actualizan `htmlCurrentPage`, y limpian el estado a los 300ms
- `onContentClick(event)`: navega adelante/atrás según si se hace clic en la mitad derecha/izquierda
- `@HostListener('window:resize')`: repagina con debounce 300ms al redimensionar la ventana
- `paginateContent()`: calcula dinámicamente el ancho del contenedor de medición para que coincida con el área de lectura real (`min(viewport - padding, 680)`)

#### Cambios en `reader.component.html`

- Sustituidos `.html-page-wrap` + `.html-nav` por nuevo `.page-container`
- Dos divs `.page` durante la animación: saliente (leaving-left/right) + entrante (entering-right/left)
- Botones de flecha flotantes en los laterales (`.html-arrow-btn`), visibles solo con hover sobre el contenedor
- `(click)="onContentClick($event)"` en el contenedor para navegar tocando mitad de pantalla

#### Cambios en `reader.component.scss`

- Nuevo `.page-container`: `position: relative; overflow: hidden; flex: 1`
- Nuevo `.page`: `position: absolute; inset: 0; width: min(680px, 100%); margin: 0 auto` (centrado sin transform, que está reservado para la animación)
- 4 `@keyframes`: slide-in-from-right/left, slide-out-to-left/right
- `.page.entering-right/left` y `.page.leaving-left/right` con `animation: ... 0.3s ease forwards`
- `.html-arrow-btn`: opacidad 0 por defecto, 1 al hover sobre `.page-container`, `position: absolute` en el lateral
- Eliminados: `.html-page-wrap`, `.html-nav`, `.html-page-label`, `.html-content`

### Decisiones

- **`margin: 0 auto` en lugar de `transform: translateX(-50%)` para centrar**: `transform` está reservado para las animaciones. Con `position: absolute; left: 0; right: 0; margin: 0 auto; width: min(680px, 100%)` la alineación es correcta y no interfiere con las animaciones.
- **Keyframes en lugar de transitions**: los keyframes se disparan en el momento en que el elemento aparece en el DOM (no hay problema de "estado inicial → trigger"). Las transitions necesitan el estado inicial en el DOM antes del trigger, lo que complica el patrón con `@if`.
- **`outgoingHtml` como signal de SafeHtml**: se captura el contenido de la página actual antes de cambiar `htmlCurrentPage`, garantizando que el div saliente muestre el contenido correcto durante la animación.

### Build

`pnpm nx run web:build` → exit 0. Solo warnings preexistentes de epubjs (CommonJS).

---

## 2026-09-24 — Paginación HTML: CSS columns nativas

### Qué se hizo

Reemplazado el sistema de paginación manual (array de strings por página) por paginación nativa con CSS columns.

#### Motivación

El sistema anterior medía alturas con `getBoundingClientRect()` sin incluir márgenes, y usaba un colchón frágil de píxeles. El contenido se desbordaba igualmente en textos con márgenes grandes.

#### Cambios en `reader.component.ts`

- Eliminados: `paginateContent`, `getElementHeight`, `scheduleRepaginate`, `nextHtmlPage`, `prevHtmlPage`, `changePage`
- Eliminadas: signals `htmlPages`, `htmlRawContent`, `pageVisible`, `safeCurrentPageHtml`; `@ViewChild('htmlMeasureEl')`
- Añadidos: `viewportRef`/`columnsRef` (`viewChild` signals), `sanitizedHtml`, `htmlTotalPages`
- `setupColumns(finalize)`: fija el ancho del div de columnas al mínimo de `(viewport.clientWidth - 64, 680)px`, lo centra con `left`, y en `requestAnimationFrame` mide `scrollWidth` para calcular el total de páginas
- `goToPage(n)`: actualiza `--page-offset` CSS variable → `translateX` anima el slide
- `recalculate()`: llamado con debounce 50ms al cambiar fuente / interlineado / tamaño / resize

#### Cambios en `reader.component.html`

- Eliminado div `#htmlMeasureEl` (off-screen)
- Reemplazados `.page-container` / `.page` por `.reader-viewport` / `.reader-columns #columns`

#### Cambios en `reader.component.scss`

- Eliminados: `.html-measure-offscreen`, `.page-container`, `.page`, `@keyframes` de slide
- Añadidos: `.reader-viewport` (overflow:hidden, position:relative) y `.reader-columns` (position:absolute, column-fill:auto, transition:transform)
- `.no-transition` desactiva el `transition` cuando la preferencia es "Sin animación"

### Decisiones

- **`position: absolute` + `left` calculado en JS**: la única forma fiable de que CSS cree columnas del ancho exacto deseado es fijar el ancho del contenedor = ancho de columna. Si el contenedor es más ancho, CSS ensancha la columna para rellenar.
- **`finalize` flag en `setupColumns`**: al recalcular por cambio de fuente no queremos re-ejecutar `isLoading` ni `startAutoSave`; solo en la carga inicial.
- **`startAutoSave` con guard**: evita intervalos duplicados si `recalculate` se llama varias veces antes del primer tick.

### Build

`pnpm nx run web:build` → exit 0. Solo warnings preexistentes de epubjs (CommonJS).

---

## 2026-09-22 — Mejoras en el lector: colores, fuentes, interlineado, HTML inline

### Cambios

#### 1. Limpieza MHT en import service (`apps/api/src/import/import.service.ts`)

- Añadido `cleanHtmlToBody(raw)`: strip de cabeceras MHT (todo antes de `<html`) + extracción del contenido de `<body>`. El HTML guardado en disco ya es solo fragmento limpio.

#### 2. Colores de texto por fondo (`reader.component.ts`)

- Actualizados los valores de texto en `BG_COLORS`:
  - dark → `#D0E8F0`, black → `#E0E0E0`, light → `#2C2416`, sepia → `#3D2B1A`
- `setBackground` ahora llama `applyEpubPrefs()` para actualizar también el EPUB.

#### 3. Selector de fuente

- Añadido tipo `ReaderFont` con 5 opciones: Lora, Merriweather, Source Serif 4, Literata, Libre Baskerville.
- Importadas desde Google Fonts en `apps/web/src/styles/_typography.scss`.
- `ReaderPrefs` incluye `fontFamily`. Persiste en localStorage.
- Config panel muestra cada fuente renderizada con su propia tipografía.

#### 4. Selector de interlineado

- Añadido `lineHeight` a `ReaderPrefs` (1.6 / 1.9 / 2.4).
- Config panel muestra tres botones: Normal / Amplio / Muy amplio.

#### 5. HTML inline en lugar de iframe

- Los libros de formato `html` (DOCX convertidos) ya no se muestran en `<iframe>` sino inline con `[innerHTML]` + `DomSanitizer.bypassSecurityTrustHtml`.
- Esto permite que font-family, font-size, line-height y color se apliquen directamente al contenido.
- `applyEpubPrefs` también aplica font-family y line-height a renditions EPUB.

### Decisiones

- **innerHTML vs. iframe para HTML**: los DOCX son contenido propio del usuario → `bypassSecurityTrustHtml` es aceptable. El iframe no permite aplicar estilos cross-origin en dev (puerto 4200 ≠ 3000).
- **PDF sigue en iframe**: formato binario, no hay texto que estilizar.
