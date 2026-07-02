import { Sheet } from "./Sheet.jsx";
import { HINTS } from "../game/constants.js";

// Dismissible slide-up panel for the Definition / Piece reveals (position of a
// piece is hidden; definition is headword-stripped).

export default function RevealPanel({ which, puzzle, onClose }) {
  if (which === HINTS.DEFINITION) {
    return (
      <Sheet onClose={onClose}>
        <div className="text-[11px] uppercase tracking-wide text-faint mb-1">Wehewehe · Definition</div>
        <p className="text-[16px] text-ink leading-relaxed">{puzzle.defHint}</p>
        <CloseRow onClose={onClose} />
      </Sheet>
    );
  }
  if (which === HINTS.PIECE) {
    const p = puzzle.piece;
    return (
      <Sheet onClose={onClose}>
        <div className="text-[11px] uppercase tracking-wide text-faint mb-1">ʻĀpana · A word inside</div>
        {p ? (
          <>
            <div className="text-[24px] font-extrabold text-ink">{p.piece_word}</div>
            <p className="text-[15px] text-ink-soft mt-1">{p.piece_def}</p>
          </>
        ) : (
          <p className="text-[15px] text-ink-soft">ʻAʻole i kēia lā (Not today).</p>
        )}
        <CloseRow onClose={onClose} />
      </Sheet>
    );
  }
  return null;
}

function CloseRow({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="w-full mt-4 rounded-btn py-2.5 font-semibold"
      style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
    >
      Pani (Close)
    </button>
  );
}
