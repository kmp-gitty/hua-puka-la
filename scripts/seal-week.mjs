#!/usr/bin/env node
// seal-week — the canonical, versioned word-selection + sealing logic.
// This owns selection/sealing (Build Spec §1, §3); n8n only orchestrates it.
//
//   node scripts/seal-week.mjs [weekId] [--weeks N]
//
// Defaults to the current HST week. Selects Mon–Fri puzzles by difficulty band,
// enforces the 12-week no-repeat window via data/ledger.json, computes each
// featured sense's def_hint, sets piece:null (the Anthropic classification pass
// is deferred — the game reads null as "Reveal Piece unavailable"), writes
// public/data/week-YYYY-Www.json, updates the ledger + manifest.

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeDefHint } from "../src/game/defHint.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT = join(ROOT, "data/dictionary.json");
const LEDGER = join(ROOT, "data/ledger.json");
const PIECES = join(ROOT, "data/pieces.json");
const OUT_DIR = join(ROOT, "public/data");

const REPEAT_WINDOW_WEEKS = 12;

// Day metadata: difficulty rises Mon→Fri; length bands + piece availability (§3.1).
//   pieceRule "require" = Monday (always a vetted piece — the teaching showcase)
//   pieceRule "never"   = Tue/Wed/Thu (Reveal Piece unavailable those days)
//   pieceRule "allow"   = Friday (piece when the long word has one)
const DAYS = [
  { slot: 0, hawaiian: "Pōʻakahi", english: "Monday", min: 3, max: 8, difficulty: 1, pieceRule: "require" },
  { slot: 1, hawaiian: "Pōʻalua", english: "Tuesday", min: 3, max: 8, difficulty: 2, pieceRule: "never" },
  { slot: 2, hawaiian: "Pōʻakolu", english: "Wednesday", min: 3, max: 8, difficulty: 3, pieceRule: "never" },
  { slot: 3, hawaiian: "Pōʻahā", english: "Thursday", min: 3, max: 8, difficulty: 4, pieceRule: "never" },
  { slot: 4, hawaiian: "Pōʻalima", english: "Friday", min: 9, max: 15, difficulty: 5, pieceRule: "allow" },
];

// --- deterministic RNG (mulberry32) so a given week seals identically ---
function seedFromString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- week id arithmetic (ISO Mon-based) ---
function isoWeekToMonday(weekId) {
  const [y, w] = weekId.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000);
  return new Date(jan4Monday.getTime() + (w - 1) * 7 * 86400000);
}
function mondayToWeekId(monday) {
  const thursday = new Date(monday.getTime() + 3 * 86400000);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.floor((thursday - jan1) / 86400000 / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
function currentHstWeekId() {
  const now = new Date();
  const shifted = new Date(now.getTime() - 10 * 3600000);
  const utcMid = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const monday = new Date(utcMid - ((new Date(utcMid).getUTCDay() + 6) % 7) * 86400000);
  return mondayToWeekId(monday);
}

// --- ledger: unified last-used history across all three feeders (§2.5) ---
function loadLedger() {
  if (existsSync(LEDGER)) return JSON.parse(readFileSync(LEDGER, "utf8"));
  return { weeks: [] }; // [{ id, ordinal, words: [] }]
}
function weekOrdinal(weekId) {
  const mon = isoWeekToMonday(weekId);
  return Math.round(mon.getTime() / (7 * 86400000));
}
// Words spoken-for within the 12-week window around the target week.
function blockedWords(ledger, targetOrdinal) {
  const blocked = new Set();
  for (const wk of ledger.weeks) {
    if (Math.abs(wk.ordinal - targetOrdinal) < REPEAT_WINDOW_WEEKS) {
      for (const w of wk.words) blocked.add(w);
    }
  }
  return blocked;
}

function pickWord(dict, day, rng, blocked, usedThisWeek, pieces) {
  let pool = dict.filter(
    (w) =>
      w.poolEligible &&
      w.length >= day.min &&
      w.length <= day.max &&
      !blocked.has(w.word) &&
      !usedThisWeek.has(w.word),
  );
  // Monday must have a vetted piece; prefer Tier 1 (the teaching showcase).
  if (day.pieceRule === "require" && Object.keys(pieces).length > 0) {
    const withPiece = pool.filter((w) => pieces[w.word]);
    const tier1 = withPiece.filter((w) => pieces[w.word].tier === 1);
    pool = tier1.length > 0 ? tier1 : withPiece;
    if (pool.length === 0) {
      throw new Error(`No word with a vetted piece for ${day.english}; run classify-pieces or widen the pool.`);
    }
  }
  const candidates = shuffled(pool, rng);
  if (candidates.length === 0) {
    throw new Error(`No eligible word for ${day.english} (len ${day.min}-${day.max}); widen pool or clear ledger.`);
  }
  return candidates[0];
}

function sealPuzzle(word, day, pieces) {
  // Piece availability by day (§3.1). Tue/Wed/Thu never carry a piece.
  const piece = day.pieceRule === "never" ? null : pieces[word.word] ?? null;
  // Featured sense follows the piece's related sense when we have one, else [0].
  const featIdx = piece && Number.isInteger(piece.word_sense_index) ? piece.word_sense_index : 0;
  const featured = word.meanings[featIdx] ?? word.meanings[0];
  const defHint = computeDefHint(featured, word.word);
  return {
    word: word.word,
    glyphs: word.glyphs,
    length: word.length,
    bare: word.bare,
    pos: word.pos,
    featuredSense: featured,
    meanings: word.meanings, // full, unstripped — shown on win/loss reveal
    defHint, // headword-stripped; null => Reveal Definition unavailable
    piece: piece
      ? { piece_word: piece.piece_word, piece_def: piece.piece_def, tier: piece.tier, rationale: piece.rationale }
      : null,
    dayMeta: {
      slot: day.slot,
      hawaiian: day.hawaiian,
      english: day.english,
      difficulty: day.difficulty,
    },
  };
}

function sealWeek(dict, ledger, weekId, pieces, blockAll = false) {
  const ordinal = weekOrdinal(weekId);
  // blockAll (batch mode) = never repeat any word across the whole run; else the
  // rolling 12-week window (spec §2.4).
  const blocked = blockAll
    ? new Set(ledger.weeks.flatMap((w) => w.words))
    : blockedWords(ledger, ordinal);
  const rng = mulberry32(seedFromString(weekId));
  const usedThisWeek = new Set();
  const puzzles = [];
  for (const day of DAYS) {
    const word = pickWord(dict, day, rng, blocked, usedThisWeek, pieces);
    usedThisWeek.add(word.word);
    puzzles.push(sealPuzzle(word, day, pieces));
  }
  const week = {
    weekId,
    ordinal,
    sealedAt: null, // stamped by the caller (scripts avoid Date in pure logic)
    puzzles,
    attribution: "Definitions from Wiktionary (via kaikki.org / wiktextract), used under CC BY-SA.",
  };
  // record in ledger (this week now spoken-for)
  ledger.weeks.push({ id: weekId, ordinal, words: [...usedThisWeek] });
  return week;
}

function writeManifest() {
  const files = readdirSync(OUT_DIR).filter((f) => /^week-\d{4}-W\d{2}\.json$/.test(f));
  const weeks = files.map((f) => f.replace(/^week-|\.json$/g, "")).sort();
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify({ weeks }));
  return weeks;
}

// ── Reserve (backlog) — a FIFO of 12 pre-approved weeks in data/reserve/ ──
// The n8n pipeline drives this via GitHub Actions:
//   --candidate  → seal the next reserve slot into reserve/pending.json (for review)
//   --swap WORD  → regenerate just the day whose word is WORD (operator swap)
//   --approve    → promote pending.json → reserve-NN.json + record in the ledger
const RESERVE_DIR = join(ROOT, "data/reserve");
const PENDING = join(RESERVE_DIR, "pending.json");
const RESERVE_TARGET = 12;

function reserveFiles() {
  if (!existsSync(RESERVE_DIR)) return [];
  return readdirSync(RESERVE_DIR)
    .filter((f) => /^reserve-\d{2}\.json$/.test(f))
    .sort();
}

// Every word already spoken-for: live/aired weeks (ledger) + approved reserve weeks.
function allSpokenWords(ledger) {
  const set = new Set();
  for (const wk of ledger.weeks) for (const w of wk.words) set.add(w);
  for (const f of reserveFiles()) {
    const r = JSON.parse(readFileSync(join(RESERVE_DIR, f), "utf8"));
    for (const p of r.puzzles) set.add(p.word);
  }
  return set;
}

function pendingSummary(pending) {
  const mp = pending.puzzles[0].piece;
  return (
    `${pending.reserveId} (${pending.words.join(", ")})` +
    (mp ? ` [Mon: ${mp.piece_word} T${mp.tier} — ${mp.rationale}]` : "")
  );
}

function sealCandidate(dict, pieces, ledger, extraExclude = new Set()) {
  mkdirSync(RESERVE_DIR, { recursive: true });
  const nextIndex = reserveFiles().length + 1;
  if (nextIndex > RESERVE_TARGET) throw new Error(`Reserve already full (${RESERVE_TARGET}).`);
  const reserveId = `reserve-${String(nextIndex).padStart(2, "0")}`;
  const blocked = new Set([...allSpokenWords(ledger), ...extraExclude]);
  const rng = mulberry32(seedFromString(reserveId));
  const usedThisWeek = new Set();
  const puzzles = [];
  for (const day of DAYS) {
    const word = pickWord(dict, day, rng, blocked, usedThisWeek, pieces);
    usedThisWeek.add(word.word);
    puzzles.push(sealPuzzle(word, day, pieces));
  }
  const pending = {
    reserveId,
    slot: nextIndex,
    status: "pending",
    createdAt: new Date().toISOString(),
    puzzles,
    words: [...usedThisWeek],
    attribution: "Definitions from Wiktionary (via kaikki.org / wiktextract), used under CC BY-SA.",
  };
  writeFileSync(PENDING, JSON.stringify(pending, null, 2));
  return pending;
}

function swapCandidate(dict, pieces, ledger, swapWord) {
  if (!existsSync(PENDING)) throw new Error("No pending candidate to swap; run --candidate first.");
  const pending = JSON.parse(readFileSync(PENDING, "utf8"));
  const slotIdx = pending.puzzles.findIndex((p) => p.word === swapWord);
  if (slotIdx === -1) throw new Error(`"${swapWord}" is not in the pending candidate.`);
  const day = DAYS[slotIdx];
  const others = new Set(pending.puzzles.filter((_, i) => i !== slotIdx).map((p) => p.word));
  const blocked = new Set([...allSpokenWords(ledger), ...others, swapWord]);
  const rng = mulberry32(seedFromString(`${pending.reserveId}|swap|${swapWord}`));
  const word = pickWord(dict, day, rng, blocked, new Set(), pieces);
  pending.puzzles[slotIdx] = sealPuzzle(word, day, pieces);
  pending.words = pending.puzzles.map((p) => p.word);
  writeFileSync(PENDING, JSON.stringify(pending, null, 2));
  return pending;
}

function approveCandidate(ledger) {
  if (!existsSync(PENDING)) throw new Error("No pending candidate to approve.");
  const pending = JSON.parse(readFileSync(PENDING, "utf8"));
  const reserveWeek = {
    reserveId: pending.reserveId,
    sealedAt: new Date().toISOString(),
    puzzles: pending.puzzles,
    attribution: pending.attribution,
  };
  const outFile = join(RESERVE_DIR, `${pending.reserveId}.json`);
  writeFileSync(outFile, JSON.stringify(reserveWeek, null, 2));
  // Record in the ledger so subsequent reserve/live seals won't repeat these.
  ledger.weeks.push({ id: pending.reserveId, ordinal: null, type: "reserve", words: pending.words });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  rmSync(PENDING);
  return { reserveWeek, count: reserveFiles().length };
}

function runReserve(args, dict, ledger, pieces) {
  if (args.includes("--approve")) {
    const { count } = approveCandidate(ledger);
    console.log(`approved → reserve now ${count}/${RESERVE_TARGET}`);
    return;
  }
  const swapIdx = args.indexOf("--swap");
  if (swapIdx >= 0) {
    const p = swapCandidate(dict, pieces, ledger, args[swapIdx + 1]);
    console.log(`swapped → ${pendingSummary(p)}`);
    return;
  }
  // --candidate (optional trailing --exclude WORD[,WORD]). Idempotent: if a
  // candidate is already pending, don't re-seal (avoids duplicate cards on
  // repeated "Start / Next cycle" clicks). Approve or swap to advance; --force reseals.
  if (existsSync(PENDING) && !args.includes("--force")) {
    const p = JSON.parse(readFileSync(PENDING, "utf8"));
    console.log(`ALREADY_PENDING ${pendingSummary(p)} — approve or swap to advance (--force to reseal)`);
    return;
  }
  const exIdx = args.indexOf("--exclude");
  const exclude = new Set(exIdx >= 0 ? (args[exIdx + 1] ?? "").split(",").filter(Boolean) : []);
  const p = sealCandidate(dict, pieces, ledger, exclude);
  console.log(`candidate ${reserveFiles().length + 1}/${RESERVE_TARGET} → ${pendingSummary(p)}`);
}

// --- main ---
const args = process.argv.slice(2);
const weeksFlagIdx = args.indexOf("--weeks");
const nWeeks = weeksFlagIdx >= 0 ? Number(args[weeksFlagIdx + 1]) : 1;
const reseal = args.includes("--reseal"); // re-seal even if already in the ledger
// --batch: one big pre-generated run. Block ALL prior words (no repeat until the
// pool is exhausted) and stop GRACEFULLY when a week can't be filled.
const batch = args.includes("--batch");
const startWeek = args.find((a) => /^\d{4}-W\d{2}$/.test(a)) ?? currentHstWeekId();

const dict = JSON.parse(readFileSync(DICT, "utf8"));
const ledger = loadLedger();
const pieces = existsSync(PIECES) ? JSON.parse(readFileSync(PIECES, "utf8")) : {};
if (Object.keys(pieces).length === 0) {
  console.log("  (no data/pieces.json — sealing with piece:null; run classify-pieces first for real pieces)");
}

// Reserve subcommands (driven by n8n via GitHub Actions) run and exit here,
// before the normal calendar-week sealing below.
if (args.includes("--candidate") || args.includes("--swap") || args.includes("--approve")) {
  runReserve(args, dict, ledger, pieces);
  process.exit(0);
}

// On --reseal, drop the whole requested range up front so it rebuilds fresh in
// order (stable + reproducible) rather than healing week-by-week.
if (reseal) {
  const rangeIds = new Set();
  let m = isoWeekToMonday(startWeek);
  for (let i = 0; i < nWeeks; i++) {
    rangeIds.add(mondayToWeekId(m));
    m = new Date(m.getTime() + 7 * 86400000);
  }
  ledger.weeks = ledger.weeks.filter((w) => !rangeIds.has(w.id));
}

let monday = isoWeekToMonday(startWeek);
const sealedNow = new Date().toISOString();
let sealedCount = 0;
for (let i = 0; i < nWeeks; i++) {
  const weekId = mondayToWeekId(monday);
  const already = ledger.weeks.some((w) => w.id === weekId);
  if (already) {
    console.log(`  ${weekId} already sealed — skipping (use --reseal to rebuild)`);
  } else {
    let week;
    try {
      week = sealWeek(dict, ledger, weekId, pieces, batch);
    } catch (e) {
      if (batch) {
        console.log(`  pool exhausted at ${weekId} after ${sealedCount} weeks (${e.message})`);
        break; // graceful stop — we've generated as many as the pool allows
      }
      throw e;
    }
    week.sealedAt = sealedNow;
    writeFileSync(join(OUT_DIR, `week-${weekId}.json`), JSON.stringify(week, null, 2));
    sealedCount++;
    if (!batch || sealedCount <= 3 || i >= nWeeks - 1) {
      const mp = week.puzzles[0].piece;
      console.log(`  sealed ${weekId}: ${week.puzzles.map((p) => p.word).join(", ")}` + (mp ? `  [Mon: ${mp.piece_word} T${mp.tier}]` : ""));
    }
  }
  monday = new Date(monday.getTime() + 7 * 86400000);
}
if (batch) console.log(`  … sealed ${sealedCount} weeks total.`);

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
const weeks = writeManifest();
console.log(`seal-week: ledger has ${ledger.weeks.length} weeks; manifest lists ${weeks.length}.`);
