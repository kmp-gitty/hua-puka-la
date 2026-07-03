import { useEffect, useState } from "react";
import { msUntilHstMidnight, formatCountdown } from "../game/hstTime.js";

// Empty / countdown screen. Glowing sun, "Ua pau kēia lā", tabular countdown to
// HST midnight, "View my stats". Shown after today's puzzle is finished.

export default function Countdown({ onStats, onReplay }) {
  const [ms, setMs] = useState(() => msUntilHstMidnight());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilHstMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-24 h-24 rounded-full mb-6"
        style={{ background: "radial-gradient(circle at 50% 45%, var(--sun), color-mix(in srgb, var(--sun) 40%, transparent))", boxShadow: "0 0 60px color-mix(in srgb, var(--sun) 55%, transparent)" }}
        aria-hidden
      />
      <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Ua pau kēia lā</h1>
      <p className="text-ink-soft mt-1">Today's word is done.</p>

      <div className="tabular text-[44px] font-extrabold text-ink mt-6" style={{ color: "var(--sun)" }}>
        {formatCountdown(ms)}
      </div>
      <p className="text-faint text-[13px] mt-1">Hua hou i ke kakahiaka — new word at midnight, Hawaiʻi Standard Time.</p>

      <div className="flex flex-col items-center gap-2.5 mt-8">
        {onReplay && (
          <button
            onClick={onReplay}
            className="rounded-btn px-6 py-2.5 font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Pāʻani hou (Replay today's word)
          </button>
        )}
        <button
          onClick={onStats}
          className="rounded-btn px-6 py-2.5 font-bold"
          style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          View my stats
        </button>
      </div>
    </div>
  );
}
