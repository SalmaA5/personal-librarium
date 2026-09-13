<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Personal Librarium — Project Context

Personal digital library manager for books and manga. Stores metadata and reading progress locally (Turso), files on Google Drive.

## Monorepo structure

```
apps/
  api/      NestJS 11 — REST API
  web/      Angular 22 standalone — browser reader
  mobile/   Ionic 9 + Angular + Capacitor — mobile app
libs/
  shared/types       @librarium/types      — shared TS interfaces
  shared/api-client  @librarium/api-client — Angular HTTP services
  shared/utils       @librarium/utils      — ThemeService + pure utils
  ui/shared          @librarium/ui-shared  — shared Angular components
  ui/web             @librarium/ui-web     — web-only components
  ui/mobile          @librarium/ui-mobile  — mobile-only components
```

## Key conventions

- **Package manager**: always `pnpm`. Use `pnpm add -w` for workspace-root deps.
- **Nx commands**: prefix with `pnpm` (e.g. `pnpm nx serve api`).
- **Commits**: use Conventional Commits. Fixes to the same feature go in `--amend`, not a new commit.
- **Branches**: `feature/<name>` off `main`; delete local + remote after merging the PR.
- **Angular style**: standalone components everywhere, no NgModules in new code.
- **No `APP_INITIALIZER`**: use `provideAppInitializer()` (Angular 19+).

## Database — Drizzle ORM + Turso (libSQL)

Schema lives in `apps/api/src/db/schema.ts`. Tables:
`book`, `author`, `genre`, `tag`, `collection`, `reading_progress`,
`book_author`, `book_genre`, `book_tag`, `book_collection`, `related_book`

Connection factory: `apps/api/src/db/index.ts` → `createDrizzleClient(url, authToken)`.
Env vars: `TURSO_URL`, `TURSO_AUTH_TOKEN` (see `.env.example`).

## Theme system (`@librarium/utils`)

- **4 themes**: `teal-light`, `teal-dark` (default), `mauve-light`, `mauve-dark`
- `ThemeService` — Angular signal `currentTheme`, methods `setTheme(palette, mode)` and `followSystem()`
- Persists in `localStorage` key `librarium-theme`; falls back to `prefers-color-scheme`
- Writes `--color-*` CSS vars and `--ion-*` Ionic vars to `:root` simultaneously
- `initTheme()` registered via `provideAppInitializer()` in `apps/web` to avoid FOUC
- `apps/web/src/styles.scss`: default vars → PrimeNG token overrides (`--p-*`) → primeicons import

## PrimeNG (web only)

- Version 22 with Aura preset from `@primeuix/themes/aura`
- Configured in `apps/web/src/app/app.config.ts` with `providePrimeNG` + `provideAnimationsAsync`
- `darkModeSelector: 'none'` — theme is fully controlled by ThemeService via CSS variables
- PrimeNG tokens (`--p-primary-color`, etc.) cascade from `--color-*` vars in `styles.scss`

## NestJS modules (all empty scaffolds, ready to implement)

`books`, `collections`, `reader`, `progress`, `drive`, `import`, `metadata`, `stats`
Each has `module.ts`, `controller.ts`, `service.ts` under `apps/api/src/<name>/`.
