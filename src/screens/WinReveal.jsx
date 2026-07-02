import Tile from "../components/Tile.jsx";
import { STATE } from "../game/scoring.js";
import Attribution from "../components/Attribution.jsx";
import MeaningsReveal from "../components/MeaningsReveal.jsx";

// Win reveal (Pōmaikaʻi). Solved-row bounce, word large + POS, result line,
// ALL meanings (full, unstripped), attribution. No Share in v1 (slot reserved).

export default function WinReveal({ puzzle, state, onDone }) {
  // A hint burns a guess row, so it counts toward the total used.
  const guessesUsed = state.guesses.length + state.hintsUsed;
  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-[520px] mx-auto px-5 py-8 text-center">
        <div className="text-[13px] uppercase tracking-wide" style={{ color: "var(--correct)" }}>
          Pōmaikaʻi · Solved
        </div>

        <div className="flex justify-center gap-1.5 my-5">
          {puzzle.glyphs.map((g, i) => (
            <Tile key={i} glyph={g} state={STATE.CORRECT} size={40} reveal bounce bounceDelay={i * 80} />
          ))}
        </div>

        <h1 className="text-[46px] font-extrabold text-ink leading-none">{puzzle.word}</h1>
        {puzzle.pos?.length > 0 && (
          <div className="text-faint mt-1">{puzzle.pos.join(" · ")}</div>
        )}

        <div className="text-ink-soft text-sm mt-3">
          Solved in {guessesUsed} · {state.hintsUsed} hint{state.hintsUsed === 1 ? "" : "s"} used
        </div>

        <div className="mt-6">
          <MeaningsReveal puzzle={puzzle} />
        </div>

        {/* v1: Share intentionally omitted — layout slot reserved here. */}

        <button
          onClick={onDone}
          className="w-full rounded-btn py-3 font-bold mt-6"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Pau (Done)
        </button>

        <Attribution />
      </div>
    </div>
  );
}
