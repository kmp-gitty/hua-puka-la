# CLAUDE.md — Hua Puka Lā

Daily Hawaiian-language word game (Wordle family), **Solve mode v1**. Built from
the `~/Downloads/Hua_Puka_La_Handoff` bundle (Doc2 = authoritative build spec;
design bundle = visual source of truth).

> For current status, what's done, and next steps, read **STATUS.md**.
> This file is about how the codebase works and its conventions.

## Commands
```bash
npm run dev            # Vite dev server → http://localhost:5173
npm run build          # production build (use as the compile/type sanity check)
node scripts/prep-data.mjs            # raw dataset → data/dictionary.json + public/data/accept.json
node scripts/seal-week.mjs --weeks N  # deterministically seal N weeks → public/data/week-*.json + ledger
node scripts/test-logic.mjs           # pure-logic unit checks (scoring, def-hint)
```
Dev/testing URLs: **`/?reset`** wipes local state; **`/?admin`** opens the Admin/preview panel
(play any weekday, ‹ › to browse other sealed weeks, jump to any screen, reset state);
**`/?slot=0..4`** jumps straight to a day. All bypass the HST day-lock + Monday-only ʻĀpana.

## Architecture ("Option A" — static, no backend)
- **Static React app**; all game logic is client-side. Word data ships as static
  JSON in `public/data/` and is fetched at runtime. No DB, no serverless, no accounts.
- **State is local-only** (browser storage), keyed by HST date. See `src/game/persistence.js`.
- **Generation pipeline is in versioned repo scripts, not buried in tooling:**
  `scripts/prep-data.mjs` (clean/tokenize), `scripts/classify-pieces.mjs` (Reveal Piece pass),
  and `scripts/seal-week.mjs` (the canonical `seal-week` logic: day-lists, difficulty Mon→Fri,
  repeat ledger, + reserve modes `--candidate`/`--swap`/`--approve`). n8n orchestrates via GitHub
  Actions; it does not contain selection logic (see the Ops pipeline section below).

## Layout
- `src/game/` — framework-free logic, shared by scripts (Node) and client (browser):
  `orthography.js` (glyphs, ʻokina-as-letter, macron folding), `scoring.js` (4-state
  scoring), `defHint.js` (headword strip), `hstTime.js` (HST day/week/countdown),
  `constants.js`, `persistence.js`, `analytics.js`, `weekData.js`, `useGame.js` (reducer hook).
- `src/components/` — Board, Tile, Keyboard, HintBand, RevealPanel, Sheet, AppBar, Icon, MeaningsReveal, Attribution.
- `src/screens/` — Onboarding, DailyPuzzle (owns the game + renders win/loss; has Give-up + hint band + keyboard),
  WinReveal, LossReveal, WeekendPicker, Countdown (Replay-today + Stats buttons), Stats, Admin (dev preview + week nav).
- `src/App.jsx` — HST-based routing, theme, onboarding gate, Solve/Learn mode seam.
- `data/` — `source/` (raw JSONL/CSV), `dictionary.json` (prep output, feeds seal), `ledger.json`, `reserve/`.
- `public/data/` — client-served: `accept.json`, `manifest.json`, `week-YYYY-Www.json`.

## Conventions & invariants (get these wrong = bugs)
- **Glyphs:** ʻokina (U+02BB) is a LETTER with its own tile/key. Macron vowels (ā ē ī ō ū)
  are single glyphs, distinct from plain vowels. `a` ≠ `ā` everywhere (scoring + keys).
- **Scoring order** (scoring.js): correct → wrong-mark (position-locked, base-vowel match,
  doesn't consume pool) → present → absent. Wrong-mark (kahakō hewa) is a first-class,
  **tile-only** state (soft orange). **Keys never show orange** — wrong-mark maps to absent
  for the pressed key.
- **Guess validation is exact-spelling** (Doc2 §2.3: "must be in this list") — diacritics
  must be correct to be accepted; wrong-mark fires when a correctly-spelled real word collides
  with the answer on a base vowel. Invalid guess = shake, **no guess consumed**.
- **Hints burn guess rows.** `guessesLeft = 8 − submitted − hintsUsed`. "Solved in N" counts
  hints. No hint on the final guess (`guessesLeft <= 1`). Reveal Letter never reveals the last unknown.
- **All day/week math is HST (UTC−10, no DST).** Never add DST handling.
- **Bilingual, Hawaiian-first** copy (Hawaiian leads, English in parens) across all UI.
- **Attribution:** Wiktionary via kaikki.org / wiktextract, **CC BY-SA**. Do NOT credit wehewehe.org.
- **Visual source of truth** is the design bundle's "Land & Lava" tokens (light+dark), in
  `src/index.css` as CSS vars mapped into Tailwind. State hues identical across modes; only neutrals flip.
- **Icons:** ship the three bundled SVG gestures (shaka/pinch/eyes) via `currentColor`; **never emoji**.
  Current art is hand-traced from a user screenshot (`src/components/Icon.jsx` + `src/assets/icons/`).

## Reveal Piece pipeline (shipped)
`scripts/extract-pieces.mjs` (embedded-word candidates) → `scripts/classify-pieces.mjs`
(Opus 4.8 Batch API, structured output → `data/pieces.json` + `data/piece-verdicts.json`) →
`seal-week.mjs` bakes pieces in. Day rules: Mon **requires** a piece (prefers Tier 1),
Tue–Thu **null**, Fri **allows**. Featured sense follows the piece's `word_sense_index`.
Regenerate: `node --env-file=.env scripts/classify-pieces.mjs` then `seal-week --reseal`.
`ANTHROPIC_API_KEY` lives in gitignored `.env`. Rationales in `piece-verdicts.json` seed Learn v2.

## Content strategy: BATCH pre-generation (current) — replaced the n8n weekly flow
The app is fueled by a **one-time batch of 198 sealed weeks** (`2026-W29 … 2030-W17`, ~3.8 yrs) in
`public/data/`, made with `node scripts/seal-week.mjs <startWeek> --weeks N --batch`. `--batch` blocks
ALL prior words (no repeat) and stops gracefully when the pool exhausts — Friday's 198 nine-to-fifteen-
letter words are the binding limit. No per-week human approval; the client just serves the current HST week.
To regenerate/extend: set `data/ledger.json` to `{"weeks":[]}`, `rm public/data/week-*.json`, re-run the batch.
Recycling (reuse words after full exhaustion) is a someday-task (~2030).

**DEPRECATED, still in repo (unused, safe to delete):** the n8n weekly-approval flow — reserve engine
(`seal-week.mjs --candidate/--swap/--approve`), `.github/workflows/reserve-*.yml`, `ops/`, `data/reserve/`,
`docs/OPS.md`. Superseded by the batch strategy above.

## Deferred (see STATUS.md for detail)
- **Word recycling** once the 198-week pool is exhausted (~2030), if the app is still running.
- **Learn mode / Share / streaks / archive** — parked; seams left in the shell.
