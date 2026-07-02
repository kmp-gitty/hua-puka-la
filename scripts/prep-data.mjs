#!/usr/bin/env node
// prep-data — transform the raw Wiktionary/kaikki dataset into the game's
// working dictionary + the client accept list.
//
//   input:  data/source/hawaiian_words_clean.jsonl  (1,972 records)
//   output: data/dictionary.json   (all words, processed, for seal-week)
//           public/data/accept.json (exact spellings, for client validation)
//
// Run: node scripts/prep-data.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toGlyphs, bareForm } from "../src/game/orthography.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SRC = join(ROOT, "data/source/hawaiian_words_clean.jsonl");
const DICT_OUT = join(ROOT, "data/dictionary.json");
const ACCEPT_OUT = join(ROOT, "public/data/accept.json");

// Content parts of speech eligible to be an answer (not particles/pronouns/etc.).
const CONTENT_POS = new Set(["noun", "verb", "adj", "adv"]);

// Glosses that are proper-noun / metalinguistic and shouldn't seed a puzzle.
const LETTER_NAME_RE = /^the name of the .*letter/i;

function isProperWord(word) {
  // The dataset flags proper nouns only by capitalization (no proper-noun POS).
  const glyphs = toGlyphs(word);
  const firstAlpha = glyphs.find((g) => g !== "ʻ");
  return firstAlpha ? firstAlpha !== firstAlpha.toLowerCase() : false;
}

function cleanMeanings(definitions) {
  return definitions
    .map((d) => d.trim())
    .filter((d) => d.length > 0 && !LETTER_NAME_RE.test(d));
}

const lines = readFileSync(SRC, "utf8").split("\n").filter((l) => l.trim());
const dictionary = [];
const acceptSet = new Set();

let poolCount = 0;
for (const line of lines) {
  const raw = JSON.parse(line);
  const word = raw.word.normalize("NFC");
  const glyphs = toGlyphs(word);
  acceptSet.add(word); // accept list = ALL words, exact spelling

  const proper = isProperWord(word);
  const meanings = cleanMeanings(raw.definitions);
  const pos = raw.pos ?? [];

  const poolEligible =
    !proper &&
    glyphs.length >= 3 &&
    glyphs.length <= 15 &&
    meanings.length > 0 &&
    pos.some((p) => CONTENT_POS.has(p));

  if (poolEligible) poolCount++;

  dictionary.push({
    word,
    glyphs,
    length: glyphs.length,
    bare: raw.bare ?? bareForm(word),
    pos,
    meanings, // cleaned; featured sense chosen at seal time
    proper,
    poolEligible,
  });
}

const accept = [...acceptSet].sort();

writeFileSync(DICT_OUT, JSON.stringify(dictionary));
writeFileSync(ACCEPT_OUT, JSON.stringify(accept));

// Report
const byLen = {};
for (const w of dictionary) {
  if (!w.poolEligible) continue;
  byLen[w.length] = (byLen[w.length] ?? 0) + 1;
}
console.log(`prep-data: ${dictionary.length} words processed`);
console.log(`  accept list (exact spellings): ${accept.length}`);
console.log(`  answer-pool eligible:          ${poolCount}`);
console.log(`  pool by length:`, byLen);
console.log(`  wrote ${DICT_OUT}`);
console.log(`  wrote ${ACCEPT_OUT}`);
