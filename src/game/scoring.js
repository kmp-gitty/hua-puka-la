// Tile scoring — four states, with duplicate handling. Pure and shared.
// See Build Spec §4.2 / design README "Scoring algorithm".
//
// `a` and `ā` (and every plain/macron pair) are DISTINCT letters. The passes
// run in a fixed order so duplicates resolve correctly.

import { base, isVowel } from "./orthography.js";

export const STATE = {
  CORRECT: "correct", // Kūpono — right letter, right spot
  PRESENT: "present", // Aia — right letter, wrong spot
  WRONG_MARK: "wrong-mark", // Kahakō hewa — right base vowel, right spot, wrong kahakō
  ABSENT: "absent", // ʻAʻohe — not in the word
};

/**
 * Score a guess (array of glyphs) against the answer (array of glyphs).
 * Both must already be the same length. Returns an array of STATE values.
 */
export function scoreGuess(guess, answer) {
  const n = answer.length;
  const states = new Array(n).fill(STATE.ABSENT);

  // 1. Build a letter-count pool from the answer glyphs (exact glyphs).
  const pool = new Map();
  for (const g of answer) pool.set(g, (pool.get(g) ?? 0) + 1);

  // 2. CORRECT pass: exact glyph match at the same position consumes the pool.
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      states[i] = STATE.CORRECT;
      pool.set(guess[i], pool.get(guess[i]) - 1);
    }
  }

  // 3. WRONG-MARK pass: position-locked, does NOT consume the pool. Same base
  //    vowel in the same spot but a different kahakō (e.g. guessed a / answer ā).
  for (let i = 0; i < n; i++) {
    if (states[i] === STATE.CORRECT) continue;
    if (
      isVowel(guess[i]) &&
      isVowel(answer[i]) &&
      base(guess[i]) === base(answer[i]) &&
      guess[i] !== answer[i]
    ) {
      states[i] = STATE.WRONG_MARK;
    }
  }

  // 4. PRESENT pass: exact glyph exists elsewhere in the (remaining) pool.
  for (let i = 0; i < n; i++) {
    if (states[i] === STATE.CORRECT || states[i] === STATE.WRONG_MARK) continue;
    const g = guess[i];
    if ((pool.get(g) ?? 0) > 0) {
      states[i] = STATE.PRESENT;
      pool.set(g, pool.get(g) - 1);
    }
    // 5. Otherwise: stays ABSENT.
  }

  return states;
}

/**
 * Fold a per-tile result into keyboard status for the pressed glyph.
 * Keys never show orange: a WRONG_MARK maps to ABSENT for the pressed glyph,
 * nudging the player toward its macron twin. Priority: correct > present > absent.
 */
const KEY_RANK = { [STATE.CORRECT]: 3, [STATE.PRESENT]: 2, [STATE.ABSENT]: 1 };

export function keyStatusFor(tileState) {
  return tileState === STATE.WRONG_MARK ? STATE.ABSENT : tileState;
}

export function mergeKeyStatus(prev, next) {
  if (!prev) return next;
  return (KEY_RANK[next] ?? 0) > (KEY_RANK[prev] ?? 0) ? next : prev;
}
