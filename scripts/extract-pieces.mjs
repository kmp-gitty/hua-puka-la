#!/usr/bin/env node
// extract-pieces — find candidate embedded pieces for every answer-pool word.
// PURE, no API. A candidate piece is a contiguous glyph-substring of the word
// that is itself a real accept-list word (non-proper, with a clean definition)
// and is shorter than the word. The Anthropic classification pass (separate
// step) then judges each candidate as Tier 1 / Tier 2 / reject.
//
//   input:  data/dictionary.json
//   output: data/piece-candidates.json  ([{ word, meanings, candidates:[...] }])
//
// Run: node scripts/extract-pieces.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT = join(ROOT, "data/dictionary.json");
const OUT = join(ROOT, "data/piece-candidates.json");

const MIN_PIECE_LEN = 2; // pieces are >= 2 glyphs (single letters are never pieces)

const dict = JSON.parse(readFileSync(DICT, "utf8"));
const byWord = new Map(dict.map((w) => [w.word, w]));

// A glyph-substring qualifies as a piece source if it's a real word that is
// non-proper and has at least one clean meaning.
function pieceRecordFor(str) {
  const rec = byWord.get(str);
  if (!rec || rec.proper || rec.meanings.length === 0) return null;
  return rec;
}

const results = [];
let totalCandidates = 0;

for (const w of dict) {
  if (!w.poolEligible) continue;
  const g = w.glyphs;
  const seen = new Map(); // piece_word -> { piece_word, meanings, len, start(rightmost) }

  for (let i = 0; i < g.length; i++) {
    for (let j = i + MIN_PIECE_LEN; j <= g.length; j++) {
      if (j - i === g.length) continue; // the whole word is not a piece
      const sub = g.slice(i, j).join("");
      const rec = pieceRecordFor(sub);
      if (!rec) continue;
      const prev = seen.get(sub);
      // keep the rightmost occurrence (tie-break avoids leading function words)
      if (!prev || i > prev.start) {
        seen.set(sub, { piece_word: sub, meanings: rec.meanings, len: j - i, start: i });
      }
    }
  }

  if (seen.size === 0) continue;
  // tie-break ordering for later selection: shortest, then rightmost
  const candidates = [...seen.values()].sort((a, b) => a.len - b.len || b.start - a.start);
  totalCandidates += candidates.length;
  results.push({
    word: w.word,
    length: w.length,
    featuredSense: w.meanings[0],
    meanings: w.meanings,
    candidates,
  });
}

writeFileSync(OUT, JSON.stringify(results));

const withCands = results.length;
const poolCount = dict.filter((w) => w.poolEligible).length;
const multi = results.filter((r) => r.candidates.length > 1).length;
console.log(`extract-pieces:`);
console.log(`  pool words:                 ${poolCount}`);
console.log(`  words with >=1 candidate:   ${withCands} (${Math.round((withCands / poolCount) * 100)}%)`);
console.log(`  words with >1 candidate:    ${multi}`);
console.log(`  total candidate pieces:     ${totalCandidates}`);
console.log(`  avg candidates/word:        ${(totalCandidates / withCands).toFixed(2)}`);
console.log(`  wrote ${OUT}`);
