// Headword-strip rule for the Reveal Definition hint (Build Spec §4.5).
// Dictionary glosses often repeat the headword, which would leak the answer.
// We strip whole-word occurrences of the headword — in any diacritic/ʻokina/
// case form — from the featured sense, replacing them with a neutral "—".
//
// Whole-word match ONLY (never a raw substring): we don't want to gut "ua"
// inside "guava". Matching folds through bareForm so "ʻĀ", "aa", "a" all match
// a headword whose bare form is "a".

import { bareForm } from "./orthography.js";

const PLACEHOLDER = "—";

// A token is a maximal run of letters (Latin + ʻokina + macron vowels).
// Everything else (spaces, punctuation) is a separator we keep verbatim.
const TOKEN_RE = /[A-Za-zʻāēīōūʻ]+/gu;

/**
 * Strip the headword from a single gloss string. Returns the stripped text.
 */
export function stripHeadword(gloss, headword) {
  const target = bareForm(headword);
  if (!target) return gloss;
  return gloss.replace(TOKEN_RE, (tok) =>
    bareForm(tok) === target ? PLACEHOLDER : tok,
  );
}

/**
 * Compute the def_hint for a featured sense. Returns null when stripping leaves
 * a gloss that is empty or circular (nothing but placeholders/punctuation) —
 * that word is a poor definition-hint candidate and the hint is unavailable.
 */
export function computeDefHint(gloss, headword) {
  const stripped = stripHeadword(gloss, headword).trim();
  // Real content = at least one surviving letter-token that isn't the placeholder.
  const survivors = stripped.match(/[A-Za-zāēīōū]+/gu) ?? [];
  return survivors.length > 0 ? stripped : null;
}
