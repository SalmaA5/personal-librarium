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
  api/      NestJS 12 — REST API
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
- **No e2e**: project has no e2e tests. Always use `--e2eTestRunner=none` when scaffolding. `nx.json` has `e2eTestRunner: "none"`.
- **Solo Claude**: delete cualquier carpeta de otros agentes (`.cursor`, `.gemini`, `.codex`, `.opencode`, `.agents`) si aparecen. Solo se mantiene `.claude/`.

## Database — Drizzle ORM + Turso (libSQL)

Schema lives in `apps/api/src/db/schema.ts`. Tables:
`book`, `author`, `genre`, `tag`, `collection`, `reading_progress`,
`book_author`, `book_genre`, `book_tag`, `book_collection`, `related_book`

Connection factory: `apps/api/src/db/index.ts` → `createDrizzleClient(url, authToken)`.
Env vars: `TURSO_URL`, `TURSO_AUTH_TOKEN` (see `.env.example`).

## Theme system (`@librarium/utils`)

- **4 themes**: `teal-light`, `teal-dark` (default), `mauve-light`, `mauve-dark`
- `ThemeService` — Angular signal `currentTheme`, methods `setTheme(palette, mode)` y `followSystem()`
- Persists in `localStorage` key `librarium-theme`; falls back to `prefers-color-scheme`
- Writes `--color-*` CSS vars y `--ion-*` Ionic vars to `:root` simultaneously
- `initTheme()` registered via `provideAppInitializer()` in `apps/web` to avoid FOUC
- `apps/web/src/styles.scss`: default vars → PrimeNG token overrides (`--p-*`) → primeicons import
- `libs/shared/utils/tsconfig.lib.json` needs `"lib": ["es2022", "dom"]` (ThemeService uses DOM APIs)

## PrimeNG (web only)

- Version 22 con Aura preset desde `@primeuix/themes/aura` (NO usar `@primeng/themes`, está deprecado)
- Configured in `apps/web/src/app/app.config.ts` con `providePrimeNG` + `provideAnimationsAsync`
- `darkModeSelector: 'none'` — tema controlado al 100% por ThemeService vía CSS variables
- PrimeNG tokens (`--p-primary-color`, etc.) cascade desde `--color-*` vars in `styles.scss`

## NestJS modules (scaffolds vacíos, listos para implementar)

`books`, `collections`, `reader`, `progress`, `drive`, `import`, `metadata`, `stats`
Cada uno tiene `module.ts`, `controller.ts`, `service.ts` en `apps/api/src/<name>/`.
Los controllers no inyectan el servicio en el constructor hasta que se implementen rutas (`noUnusedLocals: true`).

## CI (`github/workflows/ci.yml`)

- Runner: `ubuntu-latest`, Node 24, pnpm 12
- Steps: `pnpm install --frozen-lockfile` → `nx format:check` → `nx run-many -t lint build --parallel=3`
- Sin Nx Cloud, sin e2e, sin tests unitarios
- **Trigger**: solo corre en push a `main` si el commit message contiene `[deploy]`; siempre corre en pull requests
- Tsconfig gotchas resueltos:
  - `tsconfig.base.json` hereda `composite:true` y `emitDeclarationOnly:true` — las apps deben sobreescribir con `false`
  - Apps Angular necesitan `"lib": ["es2022", "dom"]` y `"moduleResolution": "bundler"`, `"module": "preserve"`
  - `apps/mobile/tsconfig.app.json`: usar `include: ["src/**/*.ts"]` (no `files: ["src/main.ts"]`) para evitar TS6307
  - `@ionic/angular` v9: importar desde `@ionic/angular` directamente, no desde `@ionic/angular/standalone`
  - `@angular/animations` es dependencia requerida (PrimeNG + `provideAnimationsAsync`)
