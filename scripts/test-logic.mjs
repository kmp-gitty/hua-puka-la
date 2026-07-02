// Minimal sanity tests for the pure game logic. Run: node scripts/test-logic.mjs
import { scoreGuess, STATE as S } from "../src/game/scoring.js";
import { toGlyphs } from "../src/game/orthography.js";
import { computeDefHint, stripHeadword } from "../src/game/defHint.js";

let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.log("FAIL", name, "\n  got ", g, "\n  want", w); }
}

// Scoring
eq("wrong-mark: plain a vs macron ā same spot", scoreGuess(toGlyphs("pa"), toGlyphs("pā")), [S.CORRECT, S.WRONG_MARK]);
eq("all correct", scoreGuess(toGlyphs("awa"), toGlyphs("awa")), [S.CORRECT, S.CORRECT, S.CORRECT]);
eq("ʻokina present elsewhere", scoreGuess(toGlyphs("aʻ"), toGlyphs("ʻa")), [S.PRESENT, S.PRESENT]);
eq("dup: 2 guessed a, 1 in answer", scoreGuess(toGlyphs("aa"), toGlyphs("ae")), [S.CORRECT, S.ABSENT]);
eq("macron ā not counted as plain e", scoreGuess(toGlyphs("kā"), toGlyphs("ke")), [S.CORRECT, S.ABSENT]);
eq("dup o: correct consumes the only o", scoreGuess(toGlyphs("oo"), toGlyphs("lo")), [S.ABSENT, S.CORRECT]);

// def_hint headword strip
eq("strip whole word, keep rest", stripHeadword("awa, a harbor", "awa"), "—, a harbor");
eq("no substring gutting", stripHeadword("guava fruit", "ua"), "guava fruit");
eq("folds diacritics + case", stripHeadword("ʻAwa is the plant", "awa"), "— is the plant");
eq("circular gloss -> null", computeDefHint("awa", "ʻawa"), null);
eq("real gloss -> kept", computeDefHint("a channel", "awa"), "a channel");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
