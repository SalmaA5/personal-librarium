# Personal Librarium

Personal digital library manager for books and manga. Stores metadata and reading progress in a local Turso database; files live on Google Drive.

## Stack

| Layer    | Tech                                                |
| -------- | --------------------------------------------------- |
| Monorepo | Nx 23 + pnpm workspaces                             |
| API      | NestJS 12 · esbuild · Drizzle ORM · Turso (libSQL)  |
| Web      | Angular 22 · Standalone components · PrimeNG · SCSS |
| Mobile   | Ionic 9 · Angular · Capacitor                       |

## Project structure

```
apps/
  api/      NestJS REST API
  web/      Angular browser reader
  mobile/   Ionic + Capacitor mobile app
libs/
  shared/types       @libs/types       Shared TypeScript interfaces
  shared/api-client  @libs/api-client  Angular HTTP services
  shared/utils       @libs/utils       ThemeService + pure utilities
  ui/shared          @libs/ui-shared   Shared Angular components
  ui/web             @libs/ui-web      Web-only components
  ui/mobile          @libs/ui-mobile   Mobile-only components
```

## Getting started

### Prerequisites

- Node 24+
- pnpm 12+
- A [Turso](https://turso.tech) database
- Google Cloud project with Drive API enabled and an OAuth 2.0 refresh token

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in secret environment variables
cp .env.local.example .env.local
```

#### Environment variables

| Variable               | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `TURSO_URL`            | libSQL connection URL (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN`     | Turso auth token                               |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                         |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                     |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token with Drive read scope |
| `PORT`                 | API port (default: `3000`)                     |

### Database

```bash
# Push schema to Turso
pnpm drizzle-kit push
```

---

## Development

```bash
# API (http://localhost:3000)
pnpm nx serve api

# Web (http://localhost:4200)
pnpm nx serve web

# Mobile (browser preview)
pnpm nx serve mobile
```

---

## Build

```bash
# Build a single app
pnpm nx build api
pnpm nx build web
pnpm nx build mobile

# Build everything in parallel
pnpm nx run-many -t build --parallel=3
```

Build output locations:

| App      | Output                                        |
| -------- | --------------------------------------------- |
| `api`    | `dist/apps/api/`                              |
| `web`    | `dist/apps/web/browser/`                      |
| `mobile` | `dist/apps/mobile/browser/` (then `cap sync`) |

### API build notes

The API uses **esbuild** (via `@nx/esbuild`) with `@anatine/esbuild-decorators` to support NestJS decorator metadata. The build runs without bundling (`bundle: false`) so the output mirrors the source structure — ready to run with `node dist/apps/api/main.js`.

On Windows, set `NX_DAEMON=false` if the Nx daemon times out:

```bash
$env:NX_DAEMON="false"; pnpm nx build api
```

---

## Lint & format

```bash
# Format check (all projects)
pnpm nx format:check

# Format fix
pnpm nx format

# Lint a single project
pnpm nx lint api
```

---

## CI

GitHub Actions runs on:

- **Push to `main`** — only when the commit message contains `[deploy]`
- **Every pull request**

Pipeline: `pnpm install` → `nx format:check` → `nx run-many -t lint build --parallel=3`

---

## REST API

Base URL: `http://localhost:3000/api`  
Swagger UI: `http://localhost:3000/api/docs`

### Books — `/api/books`

| Method   | Path               | Description                                                   |
| -------- | ------------------ | ------------------------------------------------------------- |
| `GET`    | `/books`           | List books with filters and pagination                        |
| `GET`    | `/books/:id`       | Book detail with authors, genres, tags, collections, progress |
| `GET`    | `/books/:id/cover` | Cover URL (fallback to placeholder)                           |
| `POST`   | `/books`           | Create a book                                                 |
| `PATCH`  | `/books/:id`       | Update a book (partial)                                       |
| `DELETE` | `/books/:id`       | Delete a book                                                 |

**Query params for `GET /books`:**

| Param        | Type                                 | Description                    |
| ------------ | ------------------------------------ | ------------------------------ |
| `search`     | string                               | Searches title and author name |
| `genre`      | string                               | Filter by genre name           |
| `tag`        | string                               | Filter by tag name             |
| `collection` | string                               | Filter by collection name      |
| `status`     | `unread\|reading\|read`              | Reading status                 |
| `format`     | `epub\|pdf\|html\|cbz`               | File format                    |
| `sort`       | `title\|author\|createdAt\|lastRead` | Sort field                     |
| `order`      | `asc\|desc`                          | Sort direction                 |
| `page`       | number                               | Page number (default: 1)       |
| `limit`      | number                               | Items per page (default: 20)   |

### Collections — `/api/collections`

| Method   | Path                             | Description                                            |
| -------- | -------------------------------- | ------------------------------------------------------ |
| `GET`    | `/collections`                   | List collections (`?type=series\|anthology\|thematic`) |
| `GET`    | `/collections/:id`               | Collection detail with ordered books                   |
| `POST`   | `/collections`                   | Create a collection                                    |
| `PATCH`  | `/collections/:id`               | Update a collection                                    |
| `DELETE` | `/collections/:id`               | Delete (books are not deleted)                         |
| `POST`   | `/collections/:id/books`         | Add or update a book's order in a collection           |
| `DELETE` | `/collections/:id/books/:bookId` | Remove a book from a collection                        |
| `PATCH`  | `/collections/:id/books/reorder` | Reorder multiple books in a transaction                |

### Reading progress — `/api/books/:bookId/progress`

| Method  | Path                  | Description                                              |
| ------- | --------------------- | -------------------------------------------------------- |
| `GET`   | `/books/:id/progress` | Get progress (returns `{ percentage: 0 }` if none)       |
| `PATCH` | `/books/:id/progress` | Upsert progress (`currentPage`, `epubCfi`, `percentage`) |

### Reader — `/api/books/:bookId`

| Method | Path                     | Description                                                                              |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| `GET`  | `/books/:id/read`        | Returns `{ type: "html", content }` for cached DOCX or `{ type: "stream", driveFileId }` |
| `GET`  | `/books/:id/read/stream` | Streams the file directly from Google Drive                                              |

### Google Drive — `/api/drive`

| Method | Path                       | Description                                     |
| ------ | -------------------------- | ----------------------------------------------- |
| `GET`  | `/drive/folders`           | List root folders (`?parentId=` for subfolders) |
| `GET`  | `/drive/folders/:folderId` | List book files inside a folder                 |
| `GET`  | `/drive/search?q=`         | Search files by name across Drive               |

### Import — `/api/import`

| Method | Path            | Description                                                                                     |
| ------ | --------------- | ----------------------------------------------------------------------------------------------- |
| `POST` | `/import/drive` | Import a book from Drive by `driveFileId` — extracts metadata, generates thumbnail, saves to DB |

Supported formats: `epub`, `pdf`, `docx` (saved as `html`), `cbz`.

### Stats — `/api/stats`

| Method | Path     | Description                                                          |
| ------ | -------- | -------------------------------------------------------------------- |
| `GET`  | `/stats` | Total counts by status and format, top genres, 5 recently read books |

---

## Database schema

Tables: `book`, `author`, `genre`, `tag`, `collection`, `reading_progress`  
Junction tables: `book_author`, `book_genre`, `book_tag`, `book_collection`, `related_book`

Schema: `apps/api/src/db/schema.ts`  
Migrations / push: `drizzle-kit` configured in `drizzle.config.ts`

---

## Themes

Four built-in themes managed by `ThemeService` (`@libs/utils`):

| Key           | Description |
| ------------- | ----------- |
| `teal-dark`   | Default     |
| `teal-light`  |             |
| `mauve-dark`  |             |
| `mauve-light` |             |

Themes persist in `localStorage` under `librarium-theme` and fall back to `prefers-color-scheme`.
