import { HINTS, HINT_META, TOTAL_GUESSES } from "../game/constants.js";

// The hint band sits between board and keyboard (reaching up past the keyboard
// makes spending a hint a small, conscious act). Each hint costs one guess.

function Dots({ left }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: TOTAL_GUESSES }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 7,
            height: 7,
            background: i < left ? "var(--accent)" : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

function HintButton({ meta, sublabel, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-hint px-2 py-2 text-center transition ${
        disabled ? "opacity-40 border-dashed" : "hover:brightness-[0.98]"
      }`}
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="text-[12.5px] font-extrabold leading-tight text-ink">{meta.hawaiian}</div>
      <div className="text-[11px] text-faint leading-tight">{sublabel ?? meta.english}</div>
    </button>
  );
}

// Difficulty by weekday slot (Mon=0 … Fri=4). Mon easy, Tue–Thu intermediate, Fri hard.
const DIFFICULTY = [
  "Māʻalahi (Easy)",
  "Waena (Intermediate)",
  "Waena (Intermediate)",
  "Waena (Intermediate)",
  "Paʻakikī (Difficult)",
];

export default function HintBand({ state, derived, onHint, slot }) {
  const { guessesLeft, canHint, canRevealLetter, pieceAvailable, defAvailable } = derived;
  const finalGuess = guessesLeft <= 1;
  const difficulty = DIFFICULTY[slot] ?? "";

  const defUsed = state.usedHints[HINTS.DEFINITION];
  const pieceUsed = state.usedHints[HINTS.PIECE];

  // Definition
  const defDisabled = state.gameOver || !defAvailable || (finalGuess && !defUsed);
  const defSub = !defAvailable ? "Not today" : finalGuess && !defUsed ? "No hint on last guess" : defUsed ? "Tap to reopen" : HINT_META[HINTS.DEFINITION].english;

  // Piece
  const pieceDisabled = state.gameOver || !pieceAvailable || (finalGuess && !pieceUsed);
  const pieceSub = !pieceAvailable ? "Not today" : finalGuess && !pieceUsed ? "No hint on last guess" : pieceUsed ? "Tap to reopen" : HINT_META[HINTS.PIECE].english;

  // Letter (repeatable, always a cost)
  const letterDisabled = !canRevealLetter;
  const letterSub = finalGuess ? "No hint on last guess" : !canRevealLetter && !finalGuess ? "—" : HINT_META[HINTS.LETTER].english;

  return (
    <div className="w-full max-w-[520px] mx-auto px-2 py-3">
      {difficulty && (
        <div className="text-center text-[11px] font-semibold tracking-wide mb-1.5" style={{ color: "var(--accent)" }}>
          {difficulty}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-faint">
          Koe · Left: <span className="text-ink font-bold">{Math.max(0, guessesLeft)}</span>
        </span>
        <Dots left={Math.max(0, guessesLeft)} />
      </div>
      <div className="flex gap-2">
        <HintButton meta={HINT_META[HINTS.DEFINITION]} sublabel={defSub} disabled={defDisabled} onClick={() => onHint(HINTS.DEFINITION)} />
        <HintButton meta={HINT_META[HINTS.PIECE]} sublabel={pieceSub} disabled={pieceDisabled} onClick={() => onHint(HINTS.PIECE)} />
        <HintButton meta={HINT_META[HINTS.LETTER]} sublabel={letterSub} disabled={letterDisabled || !canHint} onClick={() => onHint(HINTS.LETTER)} />
      </div>
    </div>
  );
}
