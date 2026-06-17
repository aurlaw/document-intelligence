# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Responsibility Split

**Claude Code owns:** all source files, config, scaffolding, running `npm install`, type-checking.

**Developer owns:** all `git` commands, all `wrangler` commands, Cloudflare dashboard config, and real secrets. If a step requires git or wrangler, stop and document it for the developer — do not attempt it.

## Commands

All commands run from the repo root unless noted.

```bash
npm install                  # install both workspaces

npm run frontend             # integrated dev: Vue SPA + Worker in Workers runtime → http://localhost:5173

npm run build:frontend       # type-check + Vite production build
npm run typecheck            # tsc/vue-tsc --noEmit in both workspaces (run before declaring done)
```

Workspace-scoped:
```bash
npm run typecheck -w frontend
npm run typecheck -w worker
```

## Architecture

npm workspaces monorepo with three packages:

**`shared/`** — single source of truth for validation constants (`MAX_CHARS=8000`, `MAX_BYTES=2MB`, `NEAR_LIMIT`, `ACCEPT_EXT`, `ACCEPT_MIME`, `ACCEPT_ATTR`). Exported as `document-intelligence-shared`; both `frontend` and `worker` import from it. Never hardcode these numbers elsewhere.

**`worker/`** — Cloudflare Worker (TypeScript). Single `fetch` handler in `src/index.ts` routing on `url.pathname`. `src/types.ts` holds the canonical `DocumentAnalysis` interface. No Node APIs; `compatibility_date = "2026-06-01"`. Secrets go in `worker/.dev.vars` (gitignored); `worker/.dev.vars.example` documents the shape. All `POST /api/analyze` requests are validated server-side before any processing.

**`frontend/`** — Vue 3 SPA (Vite + TypeScript + Tailwind v3.4). Entrypoint: `src/main.ts` → `src/App.vue`. `src/types.ts` mirrors the worker's `DocumentAnalysis`. Validation logic lives in `src/composables/useDocumentInput.ts`; the `DocumentInput.vue` component is a thin presentational layer over it. The `@cloudflare/vite-plugin` (configured in `vite.config.ts` with `configPath: "../worker/wrangler.jsonc"`) runs the Worker in the Workers runtime during dev — no proxy, no CORS handling, all `/api/*` calls are same-origin.

**Tailwind setup:** design tokens are in `frontend/tailwind.config.js` (`theme.extend.colors` and `theme.extend.fontFamily`). Fonts are loaded via `@fontsource` npm packages in `main.ts` — no CDN links.

**No routing, no persistence, no auth.** This is intentionally an ephemeral single-page tool.

## Key Constraints

- **Tailwind v3.4.x** — do not upgrade to v4; the design-spec tokens rely on the v3 `tailwind.config.js` theme API.
- **No `nodejs_compat`** in `wrangler.jsonc` until a later phase explicitly adds it.
- **`docs/design/`** — contains committed UI state PNGs; never touch this directory.
- Worker responses use `Response.json()` with `Content-Type: application/json`; no CORS headers needed.
- **Single-Worker deployment:** `wrangler.jsonc` has an `assets` block (`directory: ../frontend/dist/`, `not_found_handling: single-page-application`, `binding: ASSETS`, `run_worker_first: ["/api/*"]`). The Worker is the sole entry point — `/api/*` routes to handlers; everything else defers to `env.ASSETS.fetch(request)`. Do not add a separate Pages deployment or restore the Vite dev proxy.
- **`.assetsignore`** lives in `frontend/public/` (Vite copies it to `dist/` on build) — keep it there, not hardcoded in `dist/`.
