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

## Reveal Piece classification — DONE (shipped)
Real pieces now ship. Pipeline: `extract-pieces.mjs` (greedy embedded-word candidates) →
`classify-pieces.mjs` (**Opus 4.8**, Batch API, structured output) → `pieces.json` →
`seal-week.mjs` bakes them in. First run: 1,456 words classified, **667 got a piece
(402 Tier 1, 265 Tier 2)**; 789 all-reject (particles/coincidental). Friday coverage 75%.
- `data/pieces.json` = selected best piece per word (Tier 1 > Tier 2, tie-break shortest→rightmost).
- `data/piece-verdicts.json` = all raw verdicts + rationales (audit + Learn v2 seed — persist).
- Day rules enforced at seal: **Mon requires** a vetted piece (prefers T1), **Tue–Thu null**, **Fri allows**.
- **Featured sense is now piece-aware** (follows the piece's `word_sense_index`, else `meanings[0]`).
- To regenerate: `node --env-file=.env scripts/classify-pieces.mjs` then `seal-week --reseal`.
- Still TODO on this: the **operator human-gate for Monday** (spec §5) is not yet a workflow —
  verdicts are auto-selected and shipped; add an approval step when the ops pipeline is built.

## Deploy — DONE (live)
Git-connected Vercel project (Pro account) on `kmp-gitty/hua-puka-la`, Vite preset, no env vars
(app is fully static; ANTHROPIC_API_KEY stays local-only). **Every `git push` to main auto-deploys.**
`?admin` works on the live site too. This push→deploy is the mechanism n8n will use.

## Admin/preview (dev)
`?admin` panel (src/screens/Admin.jsx) — play any weekday of the current week, jump to any screen,
reset local state. `?slot=0..4` jumps straight to a day. Bypasses the HST day-lock + Monday-only ʻĀpana.

## Ops pipeline — Layer 1 WIRED & RUNNING (reserve seeding via n8n)
The seal → review → approve loop is live end-to-end: **n8n Cloud** (ads4good.app.n8n.cloud) →
**GitHub Actions** run `seal-week.mjs` → **Google Chat** review card (space "Hua Puka La Set Approval")
→ Approve gates the commit. Full guide: **docs/OPS.md**.
- `seal-week.mjs` reserve modes: `--candidate` (→ data/reserve/pending.json), `--swap "<word>"`
  (regenerate one day), `--approve` (→ reserve-NN.json + ledger). Blocks all spoken-for words.
- GitHub Actions `.github/workflows/reserve-seal.yml` + `reserve-finalize.yml` (workflow_dispatch,
  concurrency-guarded). **Classification is NOT in this loop** (pool already classified) — fast/free.
- n8n workflow "HPL Reserve Seeding": Manual Trigger → dispatch reserve-seal → Wait 45s → get
  pending.json → **Code node "Build card fields" builds the full cardsV2** (5 words + defs, Monday &
  Friday pieces; two webhook URLs pasted into APPROVE_URL/SWAP_URL constants) → Post Chat card
  (Body field must be **Expression** mode: `{{ JSON.stringify($json.chat) }}`). Approve/Swap = separate
  webhook sub-flows that dispatch reserve-finalize / reserve-seal(swap).
- `ops/n8n-reserve-seeding.json` = importable scaffold (has the current Code node + card). Reserve weeks
  live in `data/reserve/` (NOT public/) — not served until promoted to a live Monday.
- Repo has `pull.rebase=true` so the ops Actions' commits to main don't collide with local pushes.

### PROGRESS: reserve **2/12** seeded (reserve-01, reserve-02 approved).
**RESUME:** run "Start / Next cycle → review → Approve" **10 more times** to reach 12/12. Deterministic
per slot, resumable. Open question for user: grind the 10 through n8n, OR I seal all 10 locally and
show one table to eyeball + bulk-approve.

## What's DEFERRED / next — the automatic Wednesday cadence (weekly production cycle)
After the 12 are seeded: `weekly-seal` on an **n8n Schedule Trigger (cron: Wednesdays)** + `weekly-notify`,
approve-by-Sunday → **promote reserve→live Monday** (move a week into public/data/ + manifest),
low-reserve alarm, missed-approval fallback (spec §3.3–3.4). Same seal→card→approve spine.
- **DESIGN DECISION pending (ask user):** Wednesday **generates a fresh new week** each time (spec-faithful,
  reserve = insurance) vs simply **promotes the oldest reserve week** to live (drains the 12-buffer).
- Monday human-gate (spec §5) already satisfied by the Approve step; formalize in the weekly cycle.

## Open design notes
- Guess validation is **exact-spelling** (spec: "must be in this list") — ʻokina/kahakō must be correct to be accepted; wrong-mark fires when a correctly-spelled real word collides on a base vowel.
- Reserve seeding in progress (2/12); `data/reserve/` holds approved `reserve-NN.json` + a `pending.json` candidate.
- Icons are hand-traced from a screenshot (no source SVG existed in either handoff bundle); swap in exact art if it turns up.
