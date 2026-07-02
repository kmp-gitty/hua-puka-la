# Hua Puka Lā — Ops pipeline (reserve seeding)

How the automated seal → review → approve loop works, and how to seed the
12-week reserve backlog through it (which also serves as the end-to-end test of
the pipeline). Canonical names follow the Build Spec (§1, §11).

## Architecture

```
 n8n Cloud (orchestrator)                GitHub (executor + source of truth)        Google Chat (review)
 ────────────────────────                ───────────────────────────────────       ────────────────────
 1. Manual trigger ─────dispatch───────▶ Action: reserve-seal
                                           runs scripts/seal-week.mjs --candidate
                                           commits data/reserve/pending.json
 2. wait, then GET pending.json ◀────────  (repo contents API)
 3. post review card ───────────────────────────────────────────────────────────▶ card: 5 words, Mon
                                                                                    piece + rationale,
                                                                                    reserve X/12, buttons
 4. operator clicks Approve  ◀───────────────────────────────────────────────────  [Approve] [Swap]
    → webhook → dispatch ─────────────▶ Action: reserve-finalize
                                           runs seal-week.mjs --approve
                                           commits reserve-NN.json + ledger.json
 5. repeat until reserve = 12
```

**Why this shape:** the word-selection/sealing logic stays in the versioned repo
script (`seal-week.mjs`) — n8n only orchestrates, exactly as the spec requires.
The classification API is **not** in this loop (the whole pool is already
classified in `data/pieces.json`), so each cycle is fast and free.

## The repo building blocks (already built)

- `node scripts/seal-week.mjs --candidate` → seals the next reserve slot into
  `data/reserve/pending.json` (Monday requires a vetted Tier-1/2 piece; blocks
  every word already used in live weeks + approved reserve).
- `node scripts/seal-week.mjs --swap "<word>"` → regenerates just the day whose
  word is `<word>` (operator swap of one weak word).
- `node scripts/seal-week.mjs --approve` → promotes `pending.json` →
  `reserve-NN.json` and records it in `data/ledger.json`.
- GitHub Actions `reserve-seal` (input `swap_word`) and `reserve-finalize` wrap
  those and commit. Both use `concurrency: reserve-ops` so they never race.

## One-time setup

### 1. GitHub token (for n8n → GitHub API)
Create a **fine-grained PAT** scoped to `kmp-gitty/hua-puka-la`:
- Repository permissions: **Actions: Read and write**, **Contents: Read and write**.
Store it in n8n as a credential (Header Auth: `Authorization: Bearer <token>`), or
use n8n's native GitHub credential.

### 2. Google Chat space + incoming webhook
- Create a space (e.g. **`ops-alerts`**).
- Space → **Apps & integrations → Webhooks → Add** → copy the webhook URL.
  (Incoming webhooks can post cards; the Approve/Swap buttons link to n8n — no
  Google Chat *app* backend needed.)

### 3. n8n credentials
- The GitHub PAT (above).
- The Google Chat webhook URL (used as a plain HTTP POST target).

## The n8n workflow

Import `ops/n8n-reserve-seeding.json` as a scaffold, then attach your credentials
and paste your Chat webhook URL + the two n8n webhook URLs. Node-by-node:

**A. Seed-a-candidate flow** (Manual Trigger):
1. **Manual Trigger** — "Start / Next cycle".
2. **HTTP Request — dispatch reserve-seal**
   `POST https://api.github.com/repos/kmp-gitty/hua-puka-la/actions/workflows/reserve-seal.yml/dispatches`
   headers: `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`
   body (JSON): `{ "ref": "main" }`
3. **Wait** — 45s (let the Action seal + commit `pending.json`). *(For robustness
   you can replace this with a poll of `GET …/actions/runs?per_page=1` until
   `status == "completed"`.)*
4. **HTTP Request — get pending.json**
   `GET https://api.github.com/repos/kmp-gitty/hua-puka-la/contents/data/reserve/pending.json?ref=main`
   headers: `Authorization: Bearer <PAT>`, `Accept: application/vnd.github.raw+json`
   (the `raw` accept returns the file body directly — no base64 to decode).
5. **Set/Code — build card fields** from the JSON: `reserveId`, `words` (join ", "),
   `puzzles[0].piece.piece_word` / `.tier` / `.rationale`, and the reserve count.
6. **HTTP Request — post Chat card**
   `POST <google-chat-webhook-url>` with the body from `ops/google-chat-card.json`
   (placeholders filled from step 5). Buttons link to the two webhooks below.

**B. Approve webhook** (separate trigger):
1. **Webhook** (GET) — note its Production URL; put it in the card's **Approve** button.
2. **HTTP Request — dispatch reserve-finalize**
   `POST …/actions/workflows/reserve-finalize.yml/dispatches` body `{ "ref": "main" }`.
3. **Respond to Webhook** — small "✅ Approved — reserve advancing" page.

**C. Swap webhook** (separate trigger):
1. **Webhook** (GET) with a `?word=` query param — put its URL (plus `?word={word}`)
   in the card's **Swap** button, one per day, or a single generic prompt.
2. **HTTP Request — dispatch reserve-seal** body
   `{ "ref": "main", "inputs": { "swap_word": "{{ $json.query.word }}" } }`.
3. **Respond to Webhook** — "🔁 Swapped — re-posting for review" (then re-run flow A step 4–6).

## Seeding the 12-week backlog

1. Click **Start / Next cycle** in n8n → a candidate is sealed and a review card
   appears in `ops-alerts`.
2. Eyeball the 5 words + Monday's piece. Good? Click **Approve**. Weak word?
   Click **Swap** (regenerates that day) and re-review.
3. Repeat until the card shows **reserve 12/12**. `data/reserve/` now holds
   `reserve-01.json … reserve-12.json`, all recorded in the ledger.

Reserve weeks are **not** served to the client (they live in `data/`, not
`public/data/`) — they're promoted to a live week only when one goes live on a
Monday (that step is part of the weekly production cycle, next).

## Notes
- Reserve commits touch only `data/` (not `public/`, `src/`), so they don't change
  the deployed site. Optionally add a Vercel "Ignored Build Step" that skips when
  no `public/`/`src/` files changed, to avoid needless rebuilds during seeding.
- This same seal→notify→approve→commit spine becomes the **weekly production
  cycle** (`weekly-seal` on a schedule + `weekly-notify`) later — the reserve
  seeding is the manual-trigger version of it.
