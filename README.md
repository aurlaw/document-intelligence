# DocIntel

An ephemeral document-analysis tool. Paste text or upload a small PDF/image, get a structured
analysis (summary, key entities, suggested questions), then ask streaming follow-up questions.
Nothing is persisted — no database, no object storage, no auth, no sharing. Single page, no
routing. Frontend is a Vue 3 SPA on Cloudflare Pages; the backend is a Cloudflare Worker calling
Claude via AI Gateway (added in later phases).

---



## Local Dev (Two Terminals)

```bash
# Terminal 1 — Worker (developer runs; wrangler requires login)
npm run worker # http://localhost:8787

# Terminal 2 — Frontend
npm run frontend         # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite proxy forwards
`/api/*` requests to the Worker on `:8787` — no CORS issues.

---

## First-Time Setup

1. Install dependencies (root installs both workspaces):
   ```bash
   npm install
   ```

2. Copy the secrets example and fill in your Anthropic API key:
   ```bash
   cp worker/.dev.vars.example worker/.dev.vars
   # then edit worker/.dev.vars and set ANTHROPIC_API_KEY=sk-ant-...
   ```

   To get an API key: sign in at [console.anthropic.com](https://console.anthropic.com), go to
   **API Keys**, and create a new key. Free-tier accounts include a small credit; paid usage is
   billed per token. Keep this key secret — `worker/.dev.vars` is gitignored.

   Optionally override the model (defaults to `claude-sonnet-4-6`):
   ```
   ANTHROPIC_MODEL=claude-opus-4-8
   ```

3. Start both dev servers (see above).

---

## Verify Worker

```bash
# With the Worker running on :8787:
curl -X POST http://localhost:8787/api/analyze
curl -X POST http://localhost:8787/api/ask
```

With a valid `ANTHROPIC_API_KEY` in `worker/.dev.vars`, `/api/analyze` makes a real Claude call
and returns a structured `DocumentAnalysis`. Without a key the Worker will return a 502.
