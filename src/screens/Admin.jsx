import { clearAll } from "../game/persistence.js";

// Admin / preview panel (dev only, reached via ?admin). Lets you play any
// weekday of the current sealed week and jump to any screen — bypassing the
// HST day-lock and the Monday-only ʻĀpana rule. Not part of the player flow.

const DIFF = ["Māʻalahi", "", "", "", "Paʻakikī"];

function Card({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-panel p-3 text-left hover:brightness-[0.98]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      {children}
    </button>
  );
}

function NavBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 grid place-items-center rounded-full text-lg font-bold disabled:opacity-30"
      style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
    >
      {label}
    </button>
  );
}

export default function Admin({ week, weekId, hasPrev, hasNext, onPrevWeek, onNextWeek, onPlaySlot, onScreen }) {
  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-[560px] mx-auto px-5 py-6">
        <div className="flex items-baseline gap-2.5 mb-1">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-ink">Admin · Preview</h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--panel)", color: "var(--faint)" }}>dev only</span>
        </div>
        <p className="text-faint text-[13px] mb-3">Play any day (bypasses the HST day-lock). Use ‹ › to browse other sealed weeks.</p>

        <div className="flex items-center justify-between mb-4 rounded-panel px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <NavBtn label="‹" onClick={onPrevWeek} disabled={!hasPrev} />
          <div className="text-center">
            <div className="font-extrabold text-ink">{weekId ?? week.weekId}</div>
            <div className="text-[11px] text-faint">sealed week</div>
          </div>
          <NavBtn label="›" onClick={onNextWeek} disabled={!hasNext} />
        </div>

        <div className="text-[11px] uppercase tracking-wide text-faint mb-2">Nā lā · Days</div>
        <div className="space-y-2.5 mb-6">
          {week.puzzles.map((p, slot) => (
            <Card key={slot} onClick={() => onPlaySlot(slot)}>
              <div className="w-9 h-9 grid place-items-center rounded-full font-extrabold shrink-0" style={{ background: "var(--panel)", color: "var(--sun)" }}>
                {slot + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink">
                  {p.dayMeta.hawaiian} <span className="text-faint font-medium">({p.dayMeta.english})</span>
                  {DIFF[slot] && <span className="text-[11px] text-faint"> · {DIFF[slot]}</span>}
                </div>
                <div className="text-[12px] text-ink-soft truncate">
                  <b>{p.word}</b> ({p.length}) — {p.featuredSense}
                </div>
              </div>
              <div className="text-[11px] text-right shrink-0" style={{ color: p.piece ? "var(--correct)" : "var(--faint)" }}>
                {p.piece ? `ʻĀpana: ${p.piece.piece_word} · T${p.piece.tier}` : "no piece"}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-wide text-faint mb-2">Nā ʻaoʻao · Screens</div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            ["weekend", "Weekend picker"],
            ["countdown", "Countdown"],
            ["stats", "Stats"],
            ["onboarding", "Rules"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => onScreen(v)}
              className="rounded-btn py-2.5 font-semibold text-[14px]"
              style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            clearAll();
            window.location.search = "?admin";
          }}
          className="w-full rounded-btn py-2.5 font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Reset all local state
        </button>
      </div>
    </div>
  );
}
