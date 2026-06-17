# DocIntel

An ephemeral document-analysis tool. Paste text or upload a small PDF/image, get a structured
analysis (summary, key entities, suggested questions), then ask streaming follow-up questions.
Nothing is persisted — no database, no object storage, no sharing. Single page, no routing.
Frontend is a Vue 3 SPA; the backend is a Cloudflare Worker that routes Claude calls through
Cloudflare AI Gateway for caching, rate limiting, and spend controls.

---

## Local Dev (Single Command)

```bash
npm run frontend         # http://localhost:5173
```

One command starts both the Vue SPA and the Cloudflare Worker in the Workers runtime (via the
Cloudflare Vite plugin). All `/api/*` requests are handled by the Worker in the same origin —
no proxy, no CORS, no second terminal.

---

## First-Time Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the Worker

Copy the example and fill in the required values:

```bash
cp worker/.dev.vars.example worker/.dev.vars
```

Then edit `worker/.dev.vars`:

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) → API Keys. Keep secret — file is gitignored. |
| `ANTHROPIC_BASE_URL` | Yes | Set to `https://api.anthropic.com` to bypass the gateway locally (default in the example). |
| `TURNSTILE_SECRET` | Yes | The example pre-fills the Cloudflare **test secret key** (`1x000...AA`) — always passes in dev. Replace with your real secret for production testing. |
| `ASK_TOKEN_SECRET` | Yes | Random HMAC key. Generate one: `openssl rand -base64 32` |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-4-6`. Override with e.g. `claude-opus-4-8`. |
| `CF_AIG_TOKEN` | No | Only needed if your AI Gateway has authentication enabled (step B7 in the Phase 4 brief). |

### 3. Configure the frontend

The frontend ships with the Cloudflare **test site key** committed in `frontend/.env`, so the
Turnstile widget auto-passes in dev with no setup required.

To test with your real Turnstile site key (e.g. before deploying), create `frontend/.env.local`
(gitignored) and override:

```
VITE_TURNSTILE_SITE_KEY=<your_real_site_key>
```

### 4. Start the integrated dev server

```bash
npm run frontend
```

Open [http://localhost:5173](http://localhost:5173). The Cloudflare Vite plugin runs the Worker
in the Workers runtime alongside Vite — same-origin, matching production behavior.

---

## Security Controls (Phase 4)

| Control | What it does | Owner |
|---|---|---|
| **Turnstile** | Blocks bots from reaching `/api/analyze` at all | Frontend widget + Worker server-side verify |
| **HMAC ask token** | `/api/ask` requires a signed, short-lived token from a prior analyze call | Worker (minted on analyze, verified on ask) |
| **AI Gateway rate limit** | Global burst cap (~50 req/60s) | Developer — Cloudflare dashboard |
| **AI Gateway spend limit** | Rolling daily $ budget | Developer — Cloudflare dashboard |
| **Anthropic spend cap** | Absolute monthly ceiling | Developer — Anthropic Console |
| **`max_tokens: 1024`** | Caps cost per Claude response | Worker (code) |
| **Input caps** | 8,000 chars / 2 MB, enforced server-side | Worker (code) |
| **Hardened system prompt** | Declines off-topic requests; ignores instructions embedded in documents | Worker (code) |

---

## Verify Worker

```bash
# With the Worker running on :8787 — these should return errors, not 404:
curl -X POST http://localhost:8787/api/analyze
curl -X POST http://localhost:8787/api/ask
```

With a valid `ANTHROPIC_API_KEY` and `TURNSTILE_SECRET` (test key) in `worker/.dev.vars`,
a properly formed `/api/analyze` request makes a real Claude call and returns a structured
`DocumentAnalysis` along with a short-lived `askToken` for subsequent `/api/ask` calls.

---

## Architecture

```
frontend/   Vue 3 SPA (Vite + TypeScript + Tailwind v3.4)
worker/     Cloudflare Worker (TypeScript)
shared/     Validation constants shared by both
```

The Worker is a single deployable unit: it serves the Vue SPA as static assets **and** handles all
`/api/*` routes. `run_worker_first: ["/api/*"]` in `wrangler.jsonc` ensures API paths always reach
the Worker before any asset matching; everything else falls through to SPA assets with
`not_found_handling: single-page-application` for deep-link support.

The Worker is the only thing that ever touches your API key or document data. The frontend sends
documents to the Worker; the Worker forwards them to Claude via the AI Gateway. Nothing is stored
at any layer — the gateway logs request metadata (cost, latency) but never document content.

