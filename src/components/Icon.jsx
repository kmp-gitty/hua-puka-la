// The three bundled accessibility icons, inlined as components so they inherit
// currentColor (set to each state's -ink). Redraws of the shipped SVG art —
// never system emoji. Build Spec §6 / design README "Assets".

export function ShakaIcon({ size = 16 }) {
  // Correct (Kūpono) — shaka: thumb + pinky splayed up-out, three knuckle dots.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Kūpono (correct)">
      <path d="M5.6 12.2 L2.5 9.1" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M18.4 12.2 L21.5 9.1" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="7.6" cy="14.2" r="1.5" />
      <circle cx="12" cy="15" r="1.5" />
      <circle cx="16.4" cy="14.2" r="1.5" />
    </svg>
  );
}

export function PinchIcon({ size = 16 }) {
  // Present (Aia) — a single smooth arch (∩).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" role="img" aria-label="Aia (present)">
      <circle cx="12" cy="4.6" r="1.9" fill="currentColor" stroke="none" />
      <path d="M5 15.5 A 7 7 0 0 1 19 15.5" />
    </svg>
  );
}

export function EyesIcon({ size = 16 }) {
  // Wrong-mark (Kahakō hewa) — a single eye: circle with a center dot.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Kahakō hewa (wrong mark)">
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

import { STATE } from "../game/scoring.js";

export function StateIcon({ state, size }) {
  switch (state) {
    case STATE.CORRECT:
      return <ShakaIcon size={size} />;
    case STATE.PRESENT:
      return <PinchIcon size={size} />;
    case STATE.WRONG_MARK:
      return <EyesIcon size={size} />;
    default:
      return null; // Absent has no icon
  }
}
