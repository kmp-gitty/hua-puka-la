// All day/week math resolves in Hawaiʻi Standard Time (HST, UTC−10, no DST).
// The day flips at Hawaiʻi midnight; "today's word" is globally identical.
// Build Spec §3.2. Pure and shared (Node scripts + client).

export const HST_OFFSET_MS = 10 * 60 * 60 * 1000; // UTC−10

// A Date shifted so that its UTC fields read as HST wall-clock fields.
function hstParts(date = new Date()) {
  const shifted = new Date(date.getTime() - HST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-based
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0=Sun … 6=Sat
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

// "today" in HST as YYYY-MM-DD — the per-day persistence key.
export function hstDateKey(date = new Date()) {
  const p = hstParts(date);
  const mm = String(p.month + 1).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

// HST weekday, 0=Sun … 6=Sat. (Mon–Fri carry words; Sat/Sun are catch-up.)
export function hstWeekday(date = new Date()) {
  return hstParts(date).weekday;
}

export function isWeekend(date = new Date()) {
  const wd = hstWeekday(date);
  return wd === 0 || wd === 6;
}

// UTC Date at the given HST midnight (start of that HST calendar day).
function hstMidnightUTC(year, month, day) {
  return new Date(Date.UTC(year, month, day) + HST_OFFSET_MS);
}

// The Monday (HST) that begins the week containing `date`. Returns {year,month,day}.
export function hstWeekMonday(date = new Date()) {
  const p = hstParts(date);
  // days since Monday: Sun(0)->6, Mon(1)->0, ... Sat(6)->5
  const sinceMonday = (p.weekday + 6) % 7;
  const monday = new Date(Date.UTC(p.year, p.month, p.day) - sinceMonday * 86400000);
  return {
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth(),
    day: monday.getUTCDate(),
  };
}

// ISO-8601 week id "YYYY-Www" for the week containing `date` (Mon-based).
export function hstWeekId(date = new Date()) {
  const m = hstWeekMonday(date);
  // ISO week: Thursday of this week decides the year.
  const thursday = new Date(Date.UTC(m.year, m.month, m.day) + 3 * 86400000);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.floor((thursday - jan1) / 86400000 / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

// Milliseconds until the next HST midnight (for the countdown screen).
export function msUntilHstMidnight(date = new Date()) {
  const p = hstParts(date);
  const nextMidnight = hstMidnightUTC(p.year, p.month, p.day + 1);
  return nextMidnight.getTime() - date.getTime();
}

// Format a ms duration as HH:MM:SS (tabular countdown).
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Weekday index (0=Mon … 4=Fri) for a Mon–Fri puzzle slot, or -1 on weekends.
export function weekdaySlot(date = new Date()) {
  const wd = hstWeekday(date);
  if (wd === 0 || wd === 6) return -1;
  return wd - 1; // Mon(1)->0 … Fri(5)->4
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Format a YYYY-MM-DD key as "Jul 3, 2026". Parses parts directly (no Date, no TZ drift).
export function formatShortDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// The YYYY-MM-DD date key for a given Mon–Fri slot within `date`'s HST week.
// Used to persist/read per-day state (today's puzzle and weekend replays).
export function dateKeyForSlot(date, slot) {
  const m = hstWeekMonday(date);
  const d = new Date(Date.UTC(m.year, m.month, m.day) + slot * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}
