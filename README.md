# DocuIntel

An ephemeral document-analysis tool. Paste text or upload a small PDF/image, get a structured
analysis (summary, key entities, suggested questions), then ask streaming follow-up questions.
Nothing is persisted — no database, no object storage, no auth, no sharing. Single page, no
routing. Frontend is a Vue 3 SPA on Cloudflare Pages; the backend is a Cloudflare Worker calling
Claude via AI Gateway (added in later phases).

---



## Local Dev (Two Terminals)

```bash
# Terminal 1 — Worker (developer runs; wrangler requires login)
cd worker && npx wrangler dev # http://localhost:8787

# Terminal 2 — Frontend
cd frontend && npm run dev         # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite proxy forwards
`/api/*` requests to the Worker on `:8787` — no CORS issues.

---

## First-Time Setup

1. Install dependencies (root installs both workspaces):
   ```bash
   npm install
   ```

2. Copy the secrets example and fill in your key (not needed for Phase 0 stubs, but documents
   the pattern for later phases):
   ```bash
   cp worker/.dev.vars.example worker/.dev.vars
   # then edit worker/.dev.vars and set ANTHROPIC_API_KEY=...
   ```

3. Start both dev servers (see above).

---

## Verify the Round-Trip (Phase 0)

```bash
# With the Worker running on :8787:
curl -X POST http://localhost:8787/api/analyze
curl -X POST http://localhost:8787/api/ask
```

Both return canned stub JSON. In the browser, the "Run stub analyze" and "Ask (stub)" buttons
call the same endpoints through the Vite proxy.

---

## Design Assets

`docs/design/` holds the UI state PNGs (empty, analyzing, chat/analysis, streaming, failed)
used as reference from Phase 3.5 onward. Do not modify this directory.

---

## Phase Roadmap

| Phase | Scope |
|---|---|
| **0** | Repo scaffold & local dev harness (this phase) |
| 1 | Input, validation & hard caps |
| 2 | Worker: Claude integration, structured analysis |
| 3 | Worker: streaming SSE |
| 3.5 | Full UI (design-spec components) |
| 4 | Turnstile, rate limits, spend caps |
| 5 | Cloudflare Pages deployment |
