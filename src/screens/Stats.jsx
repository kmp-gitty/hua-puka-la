import { allResults } from "../game/persistence.js";
import { TOTAL_GUESSES } from "../game/constants.js";

// Minimal, local-only stats (Build Spec §7): games played, win %, guess
// distribution. No streaks, no accounts. Layout kept streak-ready.

function computeStats() {
  const results = Object.values(allResults());
  const played = results.length;
  const wins = results.filter((r) => r?.won).length;
  const winPct = played ? Math.round((wins / played) * 100) : 0;
  const dist = new Array(TOTAL_GUESSES).fill(0);
  for (const r of results) {
    if (r?.won && r.guessesUsed >= 1 && r.guessesUsed <= TOTAL_GUESSES) {
      dist[r.guessesUsed - 1]++;
    }
  }
  return { played, wins, winPct, dist };
}

export default function Stats({ onBack }) {
  const { played, winPct, dist } = computeStats();
  const max = Math.max(1, ...dist);

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-[420px] mx-auto px-6 py-8">
        <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-ink mb-6">
          Nā helu · Stats
        </h1>

        <div className="flex gap-3 mb-8">
          <Stat label="Pāʻani (played)" value={played} />
          <Stat label="Lanakila % (win)" value={`${winPct}%`} />
        </div>

        <div className="text-[11px] uppercase tracking-wide text-faint mb-2">
          Māhele koho · Guess distribution
        </div>
        <div className="space-y-1.5">
          {dist.map((count, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 text-[13px] text-ink-soft tabular">{i + 1}</span>
              <div className="flex-1">
                <div
                  className="h-6 rounded flex items-center justify-end px-2 text-[12px] font-bold"
                  style={{
                    width: `${Math.max(8, (count / max) * 100)}%`,
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                  }}
                >
                  {count}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          className="w-full rounded-btn py-3 font-bold mt-8"
          style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          Hoʻi (Back)
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex-1 rounded-panel p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="text-[28px] font-extrabold text-ink leading-none">{value}</div>
      <div className="text-[11px] text-faint mt-1">{label}</div>
    </div>
  );
}
