import { STATE } from "../game/scoring.js";
import { StateIcon } from "./Icon.jsx";

// Per-state fill/ink token pairs. Empty/filled use the neutral tile tokens.
const STATE_STYLE = {
  [STATE.CORRECT]: { bg: "var(--correct)", ink: "var(--correct-ink)" },
  [STATE.PRESENT]: { bg: "var(--present)", ink: "var(--present-ink)" },
  [STATE.WRONG_MARK]: { bg: "var(--wrong)", ink: "var(--wrong-ink)" },
  [STATE.ABSENT]: { bg: "var(--absent)", ink: "var(--absent-ink)" },
};

const ICON_THRESHOLD = 34; // show the in-tile icon only at size >= 34px

/**
 * A single board tile.
 * @param glyph   the letter to show ("" = empty)
 * @param state   scored state, or null for unsubmitted
 * @param size    tile edge in px (drives letter + icon sizing)
 * @param filled  typed-but-unsubmitted (border darkens)
 * @param locked  revealed by Reveal Letter (renders as correct)
 * @param reveal  true once its row has committed (drives the color transition)
 * @param bounce  win animation
 */
export default function Tile({ glyph, state, size, filled, locked, reveal, bounce, bounceDelay = 0 }) {
  const scored = locked ? STATE.CORRECT : state;
  const style = scored ? STATE_STYLE[scored] : null;
  const letterSize = Math.round(size * 0.44);
  const iconSize = Math.round(size * 0.3);
  const showIcon = size >= ICON_THRESHOLD && scored && scored !== STATE.ABSENT;

  return (
    <div
      className={`relative grid place-items-center rounded-tile select-none ${
        reveal || locked ? "transition-colors duration-[350ms] ease-out" : ""
      } ${bounce ? "animate-tilebounce" : ""}`}
      style={{
        width: size,
        height: size,
        animationDelay: bounce ? `${bounceDelay}ms` : undefined,
        background: style ? style.bg : "var(--tile-empty)",
        color: style ? style.ink : "var(--ink)",
        border: style
          ? "2px solid transparent"
          : `2px solid ${filled ? "var(--ink-soft)" : "var(--tile-line)"}`,
      }}
    >
      {showIcon && (
        <span
          className="absolute left-1/2 -translate-x-1/2 leading-none"
          style={{ top: Math.round(size * 0.09), color: style.ink }}
        >
          <StateIcon state={scored} size={iconSize} />
        </span>
      )}
      <span
        className="font-extrabold leading-none"
        style={{ fontSize: letterSize, marginTop: showIcon ? iconSize * 0.5 : 0 }}
      >
        {glyph}
      </span>
    </div>
  );
}
