import Tile from "../components/Tile.jsx";
import Attribution from "../components/Attribution.jsx";
import MeaningsReveal from "../components/MeaningsReveal.jsx";

// Loss reveal (Aloha ʻino). Gentle. Player's last row, the word + all meanings,
// a warm line, "come back tomorrow". Never punishing.

export default function LossReveal({ puzzle, state, onDone }) {
  const lastGuess = state.guesses[state.guesses.length - 1];
  const lastStates = lastGuess ? lastGuess.states : null;

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-[520px] mx-auto px-5 py-8 text-center">
        <div className="text-[13px] uppercase tracking-wide" style={{ color: "var(--wrong)" }}>
          Aloha ʻino
        </div>

        {lastGuess && (
          <div className="flex justify-center gap-1.5 my-5 opacity-90">
            {lastGuess.glyphs.map((g, i) => (
              <Tile key={i} glyph={g} state={lastStates[i]} size={38} reveal />
            ))}
          </div>
        )}

        <h1 className="text-[46px] font-extrabold text-ink leading-none">{puzzle.word}</h1>
        {puzzle.pos?.length > 0 && <div className="text-faint mt-1">{puzzle.pos.join(" · ")}</div>}

        <p className="text-ink-soft mt-3">Out of guesses — but the word is yours now.</p>

        <div className="mt-6">
          <MeaningsReveal puzzle={puzzle} />
        </div>

        <button
          onClick={onDone}
          className="w-full rounded-btn py-3 font-bold mt-6"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Hoʻi mai ʻapōpō (Come back tomorrow)
        </button>

        <Attribution />
      </div>
    </div>
  );
}
