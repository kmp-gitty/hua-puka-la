// Game constants: guess budget, keyboard layout, hint definitions.

export const TOTAL_GUESSES = 8; // 8 guesses = the main Hawaiian islands

// Keyboard: 20 keys, three rows. The ʻokina is the 8th consonant (a letter,
// full-size). Macron vowels sit directly beneath their plain partners.
export const KEY_ROWS = {
  consonants: ["h", "k", "l", "m", "n", "p", "w", "ʻ"],
  plainVowels: ["a", "e", "i", "o", "u"],
  macronVowels: ["ā", "ē", "ī", "ō", "ū"],
};

export const ENTER = "ENTER";
export const DELETE = "DELETE";

// The three hints. Each costs one of the 8 guesses.
export const HINTS = {
  DEFINITION: "definition", // Wehewehe — once, reopenable free
  PIECE: "piece", // ʻĀpana — once, only when piece != null
  LETTER: "letter", // Hua — multiple times
};

export const HINT_META = {
  [HINTS.DEFINITION]: { hawaiian: "Wehewehe", english: "Reveal Definition" },
  [HINTS.PIECE]: { hawaiian: "ʻĀpana", english: "Reveal Piece" },
  [HINTS.LETTER]: { hawaiian: "Hua", english: "Reveal Letter" },
};
