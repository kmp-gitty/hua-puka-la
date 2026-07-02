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
Dev/testing: visit **`/?reset`** to wipe local state and replay (one puzzle per HST day by design).

## Architecture ("Option A" — static, no backend)
- **Static React app**; all game logic is client-side. Word data ships as static
  JSON in `public/data/` and is fetched at runtime. No DB, no serverless, no accounts.
- **State is local-only** (browser storage), keyed by HST date. See `src/game/persistence.js`.
- **Generation pipeline is in versioned repo scripts, not buried in tooling:**
  `scripts/prep-data.mjs` (clean/tokenize) and `scripts/seal-week.mjs` (the canonical
  `seal-week` logic: day-lists, difficulty Mon→Fri, 12-week repeat ledger). n8n will
  only *orchestrate* these later (not built yet).

## Layout
- `src/game/` — framework-free logic, shared by scripts (Node) and client (browser):
  `orthography.js` (glyphs, ʻokina-as-letter, macron folding), `scoring.js` (4-state
  scoring), `defHint.js` (headword strip), `hstTime.js` (HST day/week/countdown),
  `constants.js`, `persistence.js`, `analytics.js`, `weekData.js`, `useGame.js` (reducer hook).
- `src/components/` — Board, Tile, Keyboard, HintBand, RevealPanel, Sheet, AppBar, Icon, MeaningsReveal, Attribution.
- `src/screens/` — Onboarding, DailyPuzzle (owns the game + renders win/loss), WinReveal, LossReveal, WeekendPicker, Countdown, Stats.
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

## Deferred (see STATUS.md for detail)
- **Reveal Piece** `piece` is `null` for now → hint shows "Not today". Real version = seal-time
  **Anthropic API** classification pass (next task). Also improve featured-sense selection then.
- **Ops pipeline** (n8n weekly-seal/notify, Google Chat, GitHub+Vercel deploy) — specified, not built.
- **Learn mode / Share / streaks / archive** — parked; seams left in the shell.
