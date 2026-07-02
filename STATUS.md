# Hua Puka Lā — build status & resume notes

_Daily Hawaiian-language word game (Wordle family), Solve mode v1._
Built from the `Hua_Puka_La_Handoff` bundle. Stack: **React + Vite + Tailwind**,
static/no-backend ("Option A").

## Run it
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build (sanity check)
node scripts/test-logic.mjs   # scoring + def-hint unit checks (11 tests)
```
Testing helper: visit **`/?reset`** to wipe local state (game, results, seen-rules)
and start as a first-time player. One puzzle per HST day by design — `?reset`
is how you replay during dev.

## Data pipeline (regenerate content)
```bash
node scripts/prep-data.mjs               # raw JSONL -> data/dictionary.json + public/data/accept.json
node scripts/seal-week.mjs --weeks 4     # deterministic weekly seal -> public/data/week-YYYY-Www.json + ledger
```
- Source: `data/source/hawaiian_words_clean.jsonl` (1,972 words, Wiktionary/kaikki, CC BY-SA).
- Accept list = all 1,972 exact spellings. Answer pool = 1,726 (len 3–15, non-proper, content POS, ≥1 clean def).
- Sealed weeks live in `public/data/`; 4 weeks currently sealed (W27–W30). Today (Thu W27) = **ʻikepili** ("data").

## What's DONE (playable end-to-end)
- Orthography (glyphs, ʻokina = letter, macron folding), 4-state scoring incl. **wrong-mark/kahakō** (`src/game/scoring.js`, tested).
- 8-guess loop; 3 hints that **burn guess rows** + first-use confirm; Reveal Letter never reveals the last unknown.
- "Solved in N" counts guesses **+ hints** (a burned row is a used guess).
- Keyboard: 20 keys, twinned vowels, ʻokina full-size; **absent keys recede/dim**, unused stay bright; keys never show orange.
- Board: dynamic tile sizing bounded by **width AND height** so all 8 rows + keyboard fit above the fold; 3–15 tiles, no wrap/no h-scroll.
- HST day/week logic + midnight countdown; local persistence (per-HST-day); minimal local stats (played, win %, distribution — no streaks).
- 6 screens: onboarding/rules, daily, win reveal, loss reveal, weekend picker, countdown. Light + dark. CC BY-SA attribution (corrected — NOT wehewehe.org).
- Reveal now shows **Today's Definition** (featured sense) + **Other Definitions**.
- Icons redrawn from the updated screenshot (shaka / arch+dot / single-eye) in `src/components/Icon.jsx` + `src/assets/icons/`.

## What's DEFERRED / next session
1. **Reveal Piece classification pass** (the real one). Currently every day's `piece` is `null` → hint shows "Not today". User wants to **ship the real thing** — needs the seal-time **Anthropic API** pass (Tier 1/2/reject, human gate for Monday). This is the agreed next task. Design the pass + wire `piece` into sealed weeks.
   - When we do this, also make **featured-sense selection** smarter (currently `meanings[0]`).
2. **Ops pipeline** — specified, not built: n8n `weekly-seal`/`weekly-notify`, Google Chat `ops-alerts` cards, GitHub commit + Vercel deploy, reserve/ledger automation. (`seal-week.mjs` already owns the selection logic per spec.)
3. **Deploy** (GitHub + Vercel) — not set up yet; local dev only so far.

## Open design notes
- Guess validation is **exact-spelling** (spec: "must be in this list") — ʻokina/kahakō must be correct to be accepted; wrong-mark fires when a correctly-spelled real word collides on a base vowel.
- Reserve dir `data/reserve/` exists but is empty (seeding is a setup step in the ops build).
- Icons are hand-traced from a screenshot (no source SVG existed in either handoff bundle); swap in exact art if it turns up.
