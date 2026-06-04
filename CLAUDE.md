# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Responsibility Split

**Claude Code owns:** all source files, config, scaffolding, running `npm install`, type-checking.

**Developer owns:** all `git` commands, all `wrangler` commands, Cloudflare dashboard config, and real secrets. If a step requires git or wrangler, stop and document it for the developer — do not attempt it.

## Commands

All commands run from the repo root unless noted.

```bash
npm install                  # install both workspaces

npm run dev:frontend         # start Vite dev server → http://localhost:5173
# Worker is developer-run: cd worker && npx wrangler dev  → http://localhost:8787

npm run build:frontend       # type-check + Vite production build
npm run typecheck            # tsc/vue-tsc --noEmit in both workspaces (run before declaring done)
```

Workspace-scoped:
```bash
npm run typecheck -w frontend
npm run typecheck -w worker
```

## Architecture

npm workspaces monorepo with two packages:

**`worker/`** — Cloudflare Worker (TypeScript). Single `fetch` handler in `src/index.ts` routing on `url.pathname`. `src/types.ts` holds the canonical `DocumentAnalysis` interface. No Node APIs; `compatibility_date = "2026-06-01"`. Secrets go in `worker/.dev.vars` (gitignored); `worker/.dev.vars.example` documents the shape.

**`frontend/`** — Vue 3 SPA (Vite + TypeScript + Tailwind v3.4). Entrypoint: `src/main.ts` → `src/App.vue`. `src/types.ts` mirrors the worker's `DocumentAnalysis` — keep them in sync manually (no shared package yet). Vite proxies `/api/*` to `http://localhost:8787` so all API calls are same-origin in dev; no CORS handling anywhere.

**Tailwind setup:** design tokens are in `frontend/tailwind.config.js` (`theme.extend.colors` and `theme.extend.fontFamily`). Fonts are loaded via `@fontsource` npm packages in `main.ts` — no CDN links.

**No routing, no persistence, no auth.** This is intentionally an ephemeral single-page tool.

## Key Constraints

- **Tailwind v3.4.x** — do not upgrade to v4; the design-spec tokens rely on the v3 `tailwind.config.js` theme API.
- **No `nodejs_compat`** in `wrangler.toml` until a later phase explicitly adds it.
- **`docs/design/`** — contains committed UI state PNGs; never touch this directory.
- Worker responses use `Response.json()` with `Content-Type: application/json`; no CORS headers needed.
