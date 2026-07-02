import { KEY_ROWS, ENTER, DELETE } from "../game/constants.js";
import { STATE } from "../game/scoring.js";

// Keys reflect the best-known status of that EXACT glyph (a and ā are
// different). Keys never show orange — wrong-mark maps to absent upstream.
// Absent (not in the word) keys RECEDE (dimmed), so unused/available keys read
// as the brighter, actionable ones. Correct/present carry their state hue.
const KEY_STATE_STYLE = {
  [STATE.CORRECT]: { bg: "var(--correct)", ink: "var(--correct-ink)", line: "transparent" },
  [STATE.PRESENT]: { bg: "var(--present)", ink: "var(--present-ink)", line: "transparent" },
  [STATE.ABSENT]: { bg: "var(--key-bg)", ink: "var(--faint)", line: "var(--key-line)", dim: true },
};

function Key({ label, wide, status, onClick, disabled }) {
  const s = status ? KEY_STATE_STYLE[status] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid place-items-center rounded-key font-bold active:translate-y-px disabled:opacity-50 transition-colors"
      style={{
        height: 50,
        minWidth: wide ? 52 : 34,
        flex: wide ? "1.4 1 0" : "1 1 0",
        fontSize: 18,
        opacity: s?.dim ? 0.4 : 1,
        background: s ? s.bg : "var(--key-bg)",
        color: s ? s.ink : "var(--ink)",
        border: `1px solid ${s ? s.line : "var(--key-line)"}`,
      }}
      aria-label={label}
    >
      {label === ENTER ? "⏎" : label === DELETE ? "⌫" : label}
    </button>
  );
}

export default function Keyboard({ keyStatus, onKey, onEnter, onDelete, disabled }) {
  const SPACER = <div style={{ flex: "1.4 1 0", minWidth: 52 }} aria-hidden />;
  return (
    <div className="w-full max-w-[520px] mx-auto flex flex-col gap-1.5 px-1">
      {/* Row 1 — 8 consonants incl. ʻokina (a full-size letter) */}
      <div className="flex gap-1.5">
        {KEY_ROWS.consonants.map((k) => (
          <Key key={k} label={k} status={keyStatus[k]} onClick={() => onKey(k)} disabled={disabled} />
        ))}
      </div>
      {/* Row 2 — 5 plain vowels, flanked by spacers to align above macrons */}
      <div className="flex gap-1.5">
        {SPACER}
        {KEY_ROWS.plainVowels.map((k) => (
          <Key key={k} label={k} status={keyStatus[k]} onClick={() => onKey(k)} disabled={disabled} />
        ))}
        {SPACER}
      </div>
      {/* Row 3 — Enter · 5 macron vowels (beneath their plain twins) · Delete */}
      <div className="flex gap-1.5">
        <Key label={ENTER} wide onClick={onEnter} disabled={disabled} />
        {KEY_ROWS.macronVowels.map((k) => (
          <Key key={k} label={k} status={keyStatus[k]} onClick={() => onKey(k)} disabled={disabled} />
        ))}
        <Key label={DELETE} wide onClick={onDelete} disabled={disabled} />
      </div>
    </div>
  );
}
