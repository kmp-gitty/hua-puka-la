import AppBar from "../components/AppBar.jsx";

// Weekend picker (Hopena pule). Sat/Sun: no new word; list the week's Mon–Fri,
// each tappable with a status badge.

const DIFF_NOTE = ["Māʻalahi (easy)", "", "", "", "Paʻakikī (hard)"];

function Badge({ result }) {
  if (result?.won) {
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--correct) 22%, transparent)", color: "var(--correct)" }}>Lanakila · won</span>;
  }
  if (result && !result.won) {
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--wrong) 22%, transparent)", color: "var(--wrong)" }}>Eo · lost</span>;
  }
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--panel)", color: "var(--ink-soft)" }}>Play</span>;
}

export default function WeekendPicker({ puzzles, results, onPick, onRules, onStats, onToggleTheme, theme }) {
  return (
    <div className="min-h-full flex flex-col">
      <AppBar title="Hopena pule · Weekend" onRules={onRules} onStats={onStats} onToggleTheme={onToggleTheme} theme={theme} />
      <div className="max-w-[520px] mx-auto w-full px-5 py-4 overflow-y-auto">
        <p className="text-ink-soft mb-4">
          <b className="text-ink">ʻAʻohe hua hou i kēia lā</b> (no new word today) — pāʻani i nā lā i hala.
        </p>
        <div className="space-y-2.5">
          {puzzles.map((p, slot) => {
            const result = results[slot];
            return (
              <button
                key={slot}
                onClick={() => onPick(slot)}
                className="w-full flex items-center gap-3 rounded-panel p-3 text-left"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                <div className="w-10 h-10 grid place-items-center rounded-full font-extrabold shrink-0"
                     style={{ background: "var(--panel)", color: "var(--sun)" }}>
                  {slot + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink">{p.dayMeta.hawaiian} <span className="text-faint font-medium">({p.dayMeta.english})</span></div>
                  {DIFF_NOTE[slot] && <div className="text-[12px] text-faint">{DIFF_NOTE[slot]}</div>}
                </div>
                <Badge result={result} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
