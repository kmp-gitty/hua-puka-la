// Hawaiian orthography primitives — the single source of truth for glyphs,
// base-vowel folding, and diacritic stripping. Imported by both the build
// scripts (Node) and the client (browser), so it stays framework-free.

// The ʻokina is U+02BB and is a LETTER, not punctuation.
export const OKINA = "ʻ"; // ʻ

// Macron (kahakō) vowels are single letters, distinct from their plain forms.
export const MACRON_TO_PLAIN = {
  "ā": "a", // ā
  "ē": "e", // ē
  "ī": "i", // ī
  "ō": "o", // ō
  "ū": "u", // ū
};
export const PLAIN_TO_MACRON = {
  a: "ā",
  e: "ē",
  i: "ī",
  o: "ō",
  u: "ū",
};

const PLAIN_VOWELS = new Set(["a", "e", "i", "o", "u"]);
const MACRON_VOWELS = new Set(Object.keys(MACRON_TO_PLAIN));

export function isVowel(glyph) {
  return PLAIN_VOWELS.has(glyph) || MACRON_VOWELS.has(glyph);
}

// Base vowel for the wrong-mark comparison: ā→a, plain a→a, consonants→self.
export function base(glyph) {
  return MACRON_TO_PLAIN[glyph] ?? glyph;
}

// Tokenize a canonical word into glyphs. Every glyph is a single code point
// once normalized to NFC (verified against the dataset: glyph count === the
// dataset's `length` for all 1,972 words), so a spread is sufficient. The
// ʻokina occupies its own glyph; a macron vowel is one glyph.
export function toGlyphs(word) {
  return [...word.normalize("NFC")];
}

// Diacritics-stripped, lowercased form: drops the ʻokina AND folds macrons.
// Used for headword matching in the definition-strip rule.
export function bareForm(word) {
  return toGlyphs(word)
    .map((g) => MACRON_TO_PLAIN[g] ?? g)
    .filter((g) => g !== OKINA)
    .join("")
    .toLowerCase();
}
