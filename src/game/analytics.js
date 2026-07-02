// Analytics event map (Build Spec §9). The traction thesis depends on game
// events, not just page views. We push to a generic dataLayer so any
// client-side measurement tool can subscribe; in dev we also console.debug.

export const EVENTS = {
  PUZZLE_STARTED: "puzzle_started",
  GUESS_SUBMITTED: "guess_submitted",
  HINT_USED: "hint_used",
  SOLVED: "solved",
  FAILED: "failed",
  DEFINITION_VIEWED: "definition_viewed",
  PIECE_VIEWED: "piece_viewed",
};

export function track(event, payload = {}) {
  const record = { event, ...payload };
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(record);
  }
  if (import.meta.env?.DEV) console.debug("[analytics]", record);
}
