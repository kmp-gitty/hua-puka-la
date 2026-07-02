// Local-only persistence (no backend, no accounts). Daily game state is keyed
// by HST date; results, the seen-rules flag, and theme live per-device.
// Build Spec §8.

const NS = "hpl"; // hua puka lā

const KEYS = {
  gameForDate: (dateKey) => `${NS}:game:${dateKey}`,
  resultForDate: (dateKey) => `${NS}:result:${dateKey}`,
  seenRules: `${NS}:seenRules`,
  theme: `${NS}:theme`,
};

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — game still playable this session */
  }
}

// ── daily game state (resumable within the HST day) ──
export function loadGame(dateKey) {
  return read(KEYS.gameForDate(dateKey));
}
export function saveGame(dateKey, state) {
  write(KEYS.gameForDate(dateKey), state);
}

// ── per-day results (weekend picker + stats) ──
// { [dateKey]: { won, guessesUsed, hintsUsed, word, slot } }
export function loadResult(dateKey) {
  return read(KEYS.resultForDate(dateKey));
}
export function saveResult(dateKey, result) {
  write(KEYS.resultForDate(dateKey), result);
}
export function allResults() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${NS}:result:`)) {
        const dateKey = k.slice(`${NS}:result:`.length);
        out[dateKey] = read(k);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

// ── seen-rules flag ──
export function hasSeenRules() {
  return read(KEYS.seenRules, false) === true;
}
export function markRulesSeen() {
  write(KEYS.seenRules, true);
}

// ── theme preference ──
export function loadTheme() {
  return read(KEYS.theme, null); // "light" | "dark" | null (system)
}
export function saveTheme(theme) {
  write(KEYS.theme, theme);
}

// ── dev/testing: wipe all local state (games, results, seen-rules, theme) ──
export function clearAll() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${NS}:`)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
