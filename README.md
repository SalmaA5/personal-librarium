# Personal Librarium

Personal digital library management system for books and manga.

## Stack

- **Monorepo**: Nx + pnpm workspaces
- **API**: NestJS · TypeScript · Drizzle ORM · Turso (libSQL)
- **Web**: Angular 22 · Standalone Components · Angular Material · SCSS
- **Mobile**: Ionic 9 · Angular · Capacitor

## Apps

| App | Path | Description |
|-----|------|-------------|
| `api` | `apps/api` | REST API (NestJS) |
| `web` | `apps/web` | Web reader (Angular) |
| `mobile` | `apps/mobile` | Mobile app (Ionic + Capacitor) |

## Libraries

| Lib | Import | Description |
|-----|--------|-------------|
| `shared/types` | `@librarium/types` | Shared TypeScript interfaces |
| `shared/api-client` | `@librarium/api-client` | Angular HTTP services |
| `shared/utils` | `@librarium/utils` | Pure utility functions |
| `ui/shared` | `@librarium/ui-shared` | Shared Angular components |
| `ui/web` | `@librarium/ui-web` | Web-only components |
| `ui/mobile` | `@librarium/ui-mobile` | Mobile-only components |

## Getting started

```bash
# Install dependencies
pnpm install

# Copy env file
cp .env.example .env

# Run API
pnpm nx serve api

# Run Web
pnpm nx serve web
```
