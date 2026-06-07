---
title: DocIntel — Design Spec (Phase 3.5 implementation contract)
project: document-intelligence
type: design-spec
created: 2026-06-03
status: draft
implements_phase: 3.5
target_stack: Vue 3 + Vite + TypeScript + Tailwind CSS
source_design: Claude Design mockup (React/JSX) — frozen
related:
  - "[[document-intelligence-brief]]"
  - "[[document-intelligence-build-plan]]"
---

# DocIntel — Design Spec (Phase 3.5)

**Purpose.** This is the implementation contract for the DocIntel UI. It is written to be
handed to **Claude Code** as the Phase 3.5 brief. The frozen Claude Design mockup is the
*visual reference*; **this document is the source of truth**. Where they conflict, this
document wins (see Overrides).

## How Claude Code should use this

- **Build in Vue 3 (SFCs) + Tailwind CSS.** The mockup was authored in React/JSX — do **not**
  port React. Re-express the components as Vue SFCs. Tailwind utility classes and the design
  tokens carry over unchanged; that's what makes the framework switch lossless.
- **This phase is visual + interactive shell only.** Use **stub data and simulated streaming**
  (canned timers). Do **not** wire real API calls — `/api/analyze` and `/api/ask` integration
  is Phases 2–4, done later against the real Worker. Build the components, states, transitions,
  and styling so that integration is a drop-in.
- **PNG exports of each state live in the repo at `docs/design/`** as the visual reference
  (see Reference for the filename → state map). This text removes ambiguity the images can't
  carry (state transitions, motion, tokens).
- **⚠️ The screenshots predate the Overrides AND the rename — do NOT copy values or the brand
  off them.** The exports were captured from the original mockup and show `0 / 12,000`, a
  **5 MB** file limit, `.docx` in the unsupported-format message, and the **old "DocuIntel"
  wordmark / "DOCUINTEL" label**. The real limits are **8,000 chars**, **2 MB**, and
  **(.txt, .md, .csv)**; the product is now **DocIntel** (assistant label **DOCINTEL**). Use the
  screenshots for *layout, spacing, color, and type* only; the **Overrides table governs all
  numbers/validation copy**, and the brand is **DocIntel** everywhere.

---

## Overrides (this spec wins over the mockup)

The mockup shipped looser limits and extra file types. **Use the values below**, not the
mockup's. Update all user-facing validation copy to match.

| Item | Mockup value (do NOT use) | **Use this** |
|---|---|---|
| Max pasted text | 12,000 chars | **8,000 chars** |
| Max file size | 5 MB | **2 MB** |
| Accepted types | pdf, png, jpg, jpeg, webp, **gif**, txt, md, **docx** | **pdf, png, jpg, jpeg, webp, txt, md, csv** |
| `.docx` | accepted | **removed** — Claude can't natively read Word; would require server-side extraction. Out. |
| `.gif` | accepted | **removed** |
| `.csv` | dropped | **kept** — handled as text |
| Brand / wordmark | DocuIntel / DOCUINTEL | **DocIntel / DOCINTEL** |

**Constants (centralize, name them, single source):**
```
MAX_CHARS = 8000
MAX_BYTES = 2 * 1024 * 1024        // 2 MB
ACCEPT_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv"]
ACCEPT_ATTR = ".pdf,image/png,image/jpeg,image/webp,.txt,.md,.csv"
```
- Byte cap (`MAX_BYTES`) applies to any **uploaded file** (including .txt/.md/.csv files).
- Char cap (`MAX_CHARS`) applies to **pasted textarea** content.
- All validation messages must reference **2 MB** and the corrected type list (see Validation).

---

## Design tokens → `tailwind.config`

Dark theme. Define these as custom Tailwind theme values (the mockup's class names assume them).

**Colors**
| Token | Hex | Use |
|---|---|---|
| `bg` | `#080910` | page background |
| `panel` | `#0e1018` | primary surfaces / cards |
| `panel2` | `#13161f` | secondary surface / hover |
| `panel3` | `#181c27` | raised hover |
| `fg` | `#e9ebf2` | primary text |
| `muted` | `#9097a6` | secondary text |
| `faint` | `#626a79` | tertiary text / placeholders |
| `line2` | `#2c313d` | borders / dividers |
| `hairline` | `#22262f` | fine borders, scrollbar thumb |
| `accent` | `#356bff` | primary accent (glow, focus, logo mark) |
| `accentSoft` | `#5b85ff` | softer accent / accent text |

**Status colors** (validation + counter): normal counter `#4c5362`; near-limit / warn `#e0a23c` (amber); over-limit / error `#f0686a` (red). Selection: `rgba(53,107,255,0.32)`.

**Typography**
- Display (headings, wordmark): **Space Grotesk** 700 → `font-display`
- Body: **IBM Plex Sans** → `font-sans` (default)
- Mono (labels, counters, badges, confidence): **IBM Plex Mono** → `font-mono`

**Ambient layers** (fixed, `z-0`, `pointer-events-none`; preserve verbatim):
- `.bg-field` — radial accent glow, top-center: `radial-gradient(120% 70% at 50% -10%, rgba(53,107,255,0.16), transparent 55%)` + a softer second glow at `85% 0%`.
- `.bg-grid` — 64px grid, `opacity:0.5`, lines `rgba(255,255,255,0.022)`, masked with `radial-gradient(100% 80% at 50% 0%, #000 30%, transparent 78%)`.
- `.focusring:focus-within` — `border-color: rgba(53,107,255,0.6); box-shadow: 0 0 0 1px rgba(53,107,255,0.45), 0 0 30px -6px rgba(53,107,255,0.35)`.
- Slim scrollbar: 10px, thumb `#22262f` with 3px `#080910` border, transparent track.
- `:root { color-scheme: dark }`.

---

## State model (the App state machine)

Single page, **no routing**. One root component owns the machine. **Reset is the only way
back** to the start (no URL nav).

**`phase`: `"empty" | "analyzing" | "failed" | "analyzed"`**

```
empty ──(submit valid input)──▶ analyzing ──(success)──▶ analyzed
  ▲                                  │
  │                                  └──(failure)──▶ failed ──(retry)──▶ analyzing
  │                                                     │
  └──────────────(reset / "analyze another")───────────┴── (also from analyzed)
```

**Root state:**
- `phase` — as above.
- `source` — `{ mode: 'paste'|'file', name?, size?, chars? }` describing the current input.
- `steps` — `0..3` analysis progress index (drives the Analyzing step list).
- `messages` — `[{ role: 'user'|'assistant'|'typing'|'error', text?, streaming? }]`.
- `busy` — true while an assistant response is streaming (disables composer).
- `input` — chat composer text.
- (Demo-only: `seed`, `seedKey` for sample/error injection; `scenario` + `StatesSwitcher`
  for the review-all-states tool — see Out of Scope; do not ship the switcher.)

**Per-phase content:**
- **empty** — hero + `UnifiedInput`. Top-right status pill `● session · ephemeral` (green
  dot). Eyebrow `DOCUMENT INTELLIGENCE`; two-line hero "Drop in a document. / Get its
  structure." (second line muted, accent-colored period). Also hosts pre-submit **validation
  banners** (`ValidationNote`, warn vs error) **below the input**. Trust line + "Try a sample
  document" + the Summary/Entities/Q&A explainer cards live here.
  → `docs/design/1-empty.png`
- **analyzing** — `Analyzing`: centered card, eyebrow `ANALYZING`, filename, scanline behind
  the active row; 3 stepped labels **"Reading document" → "Extracting entities" →
  "Summarizing"** with done/active/pending indicators, advancing via `steps`.
  → `docs/design/2-analyzing.png`
- **failed** — `FailedAnalysis`: red-bordered card, eyebrow `ANALYSIS FAILED` (alert icon),
  filename, message ("…the request was valid — this one's on us… Nothing was stored…"),
  **Retry analysis** (primary) + **Start over** buttons, mono error code footer
  (e.g. `ERR · ANALYZE_TIMEOUT`).
  → `docs/design/5-failed_1.png`
- **analyzed** — `Analyzed`: collapsed header + analysis + chat (below).
  → `docs/design/3-chatAnalysis.png` (full), `4-streaming_1.png` / `4-streaming_2.png` (chat).

**Chat sub-states (within analyzed):** committed `user`/`assistant` messages; a `typing`
indicator while waiting; a streaming assistant bubble (caret) while `busy`; an inline
`error` bubble with retry on a failed turn (drops the typing row).

---

## Component breakdown (Vue SFCs)

Re-express each from the mockup. Names are suggestions; structure/props are the contract.

**Leaf / shared**
- `Wordmark` — logo lockup (renders **DocIntel**); `small` prop for the collapsed header variant.
- `UnifiedInput` — **the single input control.** A textarea that *is* the drop zone:
  type/paste **or** drag-drop/browse a file. Props: `onAnalyze`, `onSample`, `seed`.
  Owns: char counter (3 states), file pick/drop, client-side validation, the focus ring.
  Emits validated input upward. (See Validation.)
- `ValidationNote` — warn/error banner. Props: `level: 'warn'|'error'`, `label`, slot/message.
- `EntityGroup` — one entity category's chips. Props: `cat`, `items`, `delay` (stagger).
  Categories driven by `CAT_META` (icon + color per category).
- `SuggestedQuestions` — clickable question chips. Props: `items`, `onAsk`, `disabled`.
- `ChatMessage` — one message bubble. Props: `role`, `text`, `streaming`.
- `TypingIndicator` — three `dotpulse` dots (pre-stream wait).
- `ChatError` — inline failed-turn bubble. Props: `onRetry`, `retrying`.
- `SectionLabel` — numbered section header (`n`, `title`, optional `right` slot).
- `Footer` — minimal footer.
- `Icon` + glyphs — inline SVG, 24-viewBox, `currentColor`, stroke ~1.6.

**Views (phase components)**
- `EmptyState` — hero; props `onAnalyze`, `onSample`, `seed`. Contains `UnifiedInput`,
  trust line, sample button, and a brief "what it does" (the Summary/Entities/Q&A
  three-point explainer).
- `Analyzing` — props `source`, `steps`; scanline + stepped progress.
- `FailedAnalysis` — props `source`, `onRetry`, `onReset`.
- `Analyzed` — props `source`, `messages`, `busy`, `input`, `setInput`/`v-model`, `onAsk`,
  `onReset`, `onRetryChat`, thread ref. Layout top→bottom:
  - **Collapsed sticky header** — Wordmark `small` + `|` divider + filename + size (`248 KB`,
    mono faint) + doc-type **badge** (`LEASE AGREEMENT`, accent) + **Analyze another** (refresh
    icon) right-aligned.
  - **01 Summary** (`SectionLabel`) — right meta `97% conf · 14 pp` (mono faint).
  - **02 Key entities** — 4 `EntityGroup`s, each with an icon + UPPERCASE label + **count**
    (`PEOPLE 3`, `ORGANIZATIONS 2`, `DATES 4`, `TOPICS 7`). People/Dates chips carry inline
    tags (`LANDLORD`/`TENANT`/`WITNESS`, `START`/`END`/`RENT DUE`/`SIGNED`); orgs/topics are
    plain chips.
  - **03 Suggested questions** — 2×2 grid; each chip has a `?` glyph + arrow, `onAsk` seeds chat.
  - **04 Ask the document** — intro line, chat thread, composer (placeholder "Ask about a
    clause, a party, a date…" + send arrow), footer trust note ("This conversation lives only
    in your session and is discarded when you analyze another document.").
  - Chat labels: user bubble right-aligned under `YOU`; assistant under `● DOCINTEL`; answers
    may cite a clause inline (e.g. `§9.1`).
- `App` (root) — owns the state machine, renders the active phase.

**Entity categories:** `people`, `orgs`, `dates`, `topics` (fixed; each with icon+color via
`CAT_META`). Groups render with a staggered `rise` (delays ~120/170/220/270ms).

---

## Validation (corrected copy — use these limits)

Client-side validation in `UnifiedInput` (server re-validates later in Phase 2; client is UX).
**Reject, never truncate.**

**Character counter (paste):** `${len} / 8,000`.
- Normal `#4c5362`; at ≥90% (7,200) **near** state amber `#e0a23c` + "nearing limit";
  over 8,000 **over** state red `#f0686a` + "${over} over".

**Messages (rewrite the mockup's to these limits):**
- *Over char limit:* "You're {N} characters over. Trim it down, or attach the document as a file instead."
- *File too large (>2 MB):* ""{name}" is {size}. The limit is 2 MB — try a smaller file, or paste the text instead." — `level: error`, kind `size`.
- *Unsupported type:* ""{ext}" isn't something we can read. Use a PDF, an image (PNG / JPG / WebP), or plain text (.txt, .md, .csv)." — `level: error`, kind `type`.
- *Empty submit:* "Paste some text or attach a file to begin — we'll take it from there." — `level: warn`, kind `empty`.

Pre-submit validation errors render as a `ValidationNote` **below the input** on the **empty**
state (not a modal); red-bordered, icon + UPPERCASE label (`FILE TOO LARGE` /
`UNSUPPORTED FORMAT` / `TEXT OVER LIMIT`) + message. Screenshot refs:
`docs/design/5-failed_5.png` (text over limit — note: shows old 12,000, use **8,000**),
`5-failed_2.png` / `5-failed_4.png` (file too large — shows old 5 MB, use **2 MB**),
`5-failed_3.png` (unsupported — shows old `.docx`, use **(.txt, .md, .csv)**).

---

## Animations (extracted from the design — use verbatim)

Define as CSS keyframes in a global stylesheet (or Tailwind config). For enter/leave of phase
views and chat messages, wrap with Vue **`<Transition>` / `<TransitionGroup>`** but keep these
exact keyframes/timings for the motion itself.

```css
/* streaming caret */
@keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
.caret { animation: blink 1s steps(1) infinite; }

/* pre-stream typing dots */
@keyframes dotpulse { 0%,80%,100%{ transform: translateY(0); opacity:.35 } 40%{ transform: translateY(-3px); opacity:1 } }
.typing-dot { animation: dotpulse 1.1s infinite ease-in-out; }   /* stagger the 3 dots */

/* content / message entrance */
@keyframes risein { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform:none } }
.rise { animation: risein .5s cubic-bezier(.2,.7,.2,1) both; }

/* analysis "reading" scan line (analyzing phase) */
@keyframes scan { from { transform: translateY(-100%) } to { transform: translateY(220%) } }
.scanline { animation: scan 1.6s cubic-bezier(.4,0,.2,1) infinite; }

/* error shake (validation / failed turn) */
@keyframes shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-7px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-5px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} }
.shake { animation: shake .5s cubic-bezier(.36,.07,.19,.97) both; }

@media (prefers-reduced-motion: reduce) {
  .rise, .scanline, .typing-dot, .caret, .shake { animation: none !important; }
}
```

**Motion map:**
| Transition | Trigger | Mechanism |
|---|---|---|
| Input zone → collapsed header | analyze success (`analyzing`→`analyzed`) | `<Transition>` height/opacity morph, ~250ms ease |
| Analysis sections appear | enter `analyzed` | `.rise`, staggered per `EntityGroup` delay |
| Assistant streaming | `busy` true | `.caret` on the live bubble; simulate token append on a timer |
| Pre-stream wait | question sent, before tokens | `TypingIndicator` `.typing-dot` |
| Document being read | `analyzing` phase | `.scanline` over skeleton + stepped labels |
| Validation / failed turn | error raised | `.shake` on the offending element |

Expect to fine-tune timing in code after first implementation — motion is the one part that
usually needs a round-trip.

---

## Responsive

- Single column throughout; content max-width ~640–760px, centered, generous top padding
  (`sm:pt-20`). `-mx-5`/`sm:-mx-6` bleed on some panels.
- Entity grid: 1 col mobile → `sm:grid-cols-2` / `sm:grid-cols-3`.
- Collapsed header: truncate long filenames (`max-w` + `truncate`); doc-type badge wraps last.
- Chat thread scrolls within `max-h-[52vh]`; composer sticky at the bottom of the thread.
- Mobile-first; verify the unified input and chat composer at ~360px.

---

## Accessibility

- Preserve `prefers-reduced-motion` (animations off — already in the keyframes block).
- Icons `aria-hidden`; interactive controls get accessible labels.
- Maintain focus management on phase changes (move focus to the new primary region).
- Color is not the only signal for validation state (icon + text + color together).

---

## Out of scope for this phase

- Real API wiring (`/api/analyze`, `/api/ask`) — Phases 2–4.
- `StatesSwitcher` / `scenario` review tool — **dev-only**, do not ship in the app.
- Guardrails behavior (Turnstile, AI Gateway, spend caps) — Phase 4. The *visuals* of the
  trust notice and the optional "how this works" panel are built here; their real behavior
  is wired in Phase 4.
- Persistence / sharing / routing — not part of the product (ephemeral; see brief).

## Reference — screenshots (`docs/design/` in the repo)

Visual reference only. **The Overrides table governs all numbers and validation copy**, and the
brand is now **DocIntel** — the exports show the pre-override values (12,000 / 5 MB / .docx) and
the old "DocuIntel"/"DOCUINTEL" wordmark; do not reproduce those.

| File | State depicted |
|---|---|
| `1-empty.png` | Empty / landing (hero, unified input, explainer cards, status pill) |
| `2-analyzing.png` | Analyzing (card, filename, 3 stepped labels, scanline) |
| `3-chatAnalysis.png` | Analyzed — full page (collapsed header, summary, entities, suggested Qs, composer) |
| `4-streaming_1.png` | Analyzed/chat — answered turn (user + assistant with `§9.1` citation; sticky header on scroll) |
| `4-streaming_2.png` | Analyzed/chat — **mid-stream** (assistant caret, no text yet) — the true streaming state |
| `5-failed_1.png` | **Failed analysis** phase (ANALYSIS FAILED card, Retry / Start over, error code) |
| `5-failed_2.png` | Validation: **file too large** (empty-state banner) |
| `5-failed_3.png` | Validation: **unsupported format** (empty-state banner) |
| `5-failed_4.png` | Validation: file too large — appears to **duplicate** `5-failed_2`; drop one if so |
| `5-failed_5.png` | Validation: **text over limit** (empty-state banner, over-count counter) |

**Naming note:** `5-failed_2…5` are *validation* errors on the **empty** state, not the
`failed` *analysis* phase (only `5-failed_1` is the failed phase). Different states despite the
shared prefix — kept as-named since they're already committed, but don't conflate them.

## Reference — notes
- `[[document-intelligence-brief]]` — product spec (caps, types, ephemerality).
- `[[document-intelligence-build-plan]]` — phase context (this implements Phase 3.5).
