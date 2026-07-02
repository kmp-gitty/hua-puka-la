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

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeDefHint } from "../src/game/defHint.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT = join(ROOT, "data/dictionary.json");
const LEDGER = join(ROOT, "data/ledger.json");
const OUT_DIR = join(ROOT, "public/data");

const REPEAT_WINDOW_WEEKS = 12;

// Day metadata: difficulty rises Mon→Fri; length bands + piece availability.
const DAYS = [
  { slot: 0, hawaiian: "Pōʻakahi", english: "Monday", min: 3, max: 8, difficulty: 1, piecePreferred: true },
  { slot: 1, hawaiian: "Pōʻalua", english: "Tuesday", min: 3, max: 8, difficulty: 2, piecePreferred: false },
  { slot: 2, hawaiian: "Pōʻakolu", english: "Wednesday", min: 3, max: 8, difficulty: 3, piecePreferred: false },
  { slot: 3, hawaiian: "Pōʻahā", english: "Thursday", min: 3, max: 8, difficulty: 4, piecePreferred: false },
  { slot: 4, hawaiian: "Pōʻalima", english: "Friday", min: 9, max: 15, difficulty: 5, piecePreferred: true },
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

function pickWord(dict, day, rng, blocked, usedThisWeek) {
  const candidates = shuffled(
    dict.filter(
      (w) =>
        w.poolEligible &&
        w.length >= day.min &&
        w.length <= day.max &&
        !blocked.has(w.word) &&
        !usedThisWeek.has(w.word),
    ),
    rng,
  );
  if (candidates.length === 0) {
    throw new Error(`No eligible word for ${day.english} (len ${day.min}-${day.max}); widen pool or clear ledger.`);
  }
  return candidates[0];
}

function sealPuzzle(word, day) {
  const featured = word.meanings[0]; // featured sense = first clean meaning
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
    piece: null, // deferred: Anthropic classification pass not yet run
    dayMeta: {
      slot: day.slot,
      hawaiian: day.hawaiian,
      english: day.english,
      difficulty: day.difficulty,
    },
  };
}

function sealWeek(dict, ledger, weekId) {
  const ordinal = weekOrdinal(weekId);
  const blocked = blockedWords(ledger, ordinal);
  const rng = mulberry32(seedFromString(weekId));
  const usedThisWeek = new Set();
  const puzzles = [];
  for (const day of DAYS) {
    const word = pickWord(dict, day, rng, blocked, usedThisWeek);
    usedThisWeek.add(word.word);
    puzzles.push(sealPuzzle(word, day));
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

// --- main ---
const args = process.argv.slice(2);
const weeksFlagIdx = args.indexOf("--weeks");
const nWeeks = weeksFlagIdx >= 0 ? Number(args[weeksFlagIdx + 1]) : 1;
const startWeek = args.find((a) => /^\d{4}-W\d{2}$/.test(a)) ?? currentHstWeekId();

const dict = JSON.parse(readFileSync(DICT, "utf8"));
const ledger = loadLedger();

let monday = isoWeekToMonday(startWeek);
const sealedNow = new Date().toISOString();
for (let i = 0; i < nWeeks; i++) {
  const weekId = mondayToWeekId(monday);
  if (ledger.weeks.some((w) => w.id === weekId)) {
    console.log(`  ${weekId} already sealed — skipping`);
  } else {
    const week = sealWeek(dict, ledger, weekId);
    week.sealedAt = sealedNow;
    writeFileSync(join(OUT_DIR, `week-${weekId}.json`), JSON.stringify(week, null, 2));
    console.log(`  sealed ${weekId}: ${week.puzzles.map((p) => p.word).join(", ")}`);
  }
  monday = new Date(monday.getTime() + 7 * 86400000);
}

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
const weeks = writeManifest();
console.log(`seal-week: ledger has ${ledger.weeks.length} weeks; manifest lists ${weeks.length}.`);
