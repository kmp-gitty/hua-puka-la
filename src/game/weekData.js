// Loads the sealed week + accept list (static JSON served as assets — Option A,
// no backend). The client computes the current HST week id and fetches that
// week file; if unavailable it falls back to the newest sealed week.

import { hstWeekId } from "./hstTime.js";

const BASE = `${import.meta.env.BASE_URL}data`;

let acceptCache = null;

export async function loadAcceptSet() {
  if (acceptCache) return acceptCache;
  const res = await fetch(`${BASE}/accept.json`);
  const list = await res.json();
  acceptCache = new Set(list);
  return acceptCache;
}

async function loadManifest() {
  const res = await fetch(`${BASE}/manifest.json`);
  return res.json();
}

async function loadWeekFile(weekId) {
  const res = await fetch(`${BASE}/week-${weekId}.json`);
  if (!res.ok) throw new Error(`week ${weekId} not found`);
  return res.json();
}

// Returns the sealed week for "now" (HST). Falls back to newest available.
export async function loadCurrentWeek(now = new Date()) {
  const wantId = hstWeekId(now);
  const manifest = await loadManifest();
  const available = manifest.weeks ?? [];
  const id = available.includes(wantId)
    ? wantId
    : available[available.length - 1];
  if (!id) throw new Error("no sealed weeks available");
  const week = await loadWeekFile(id);
  return { week, requestedId: wantId, servedId: id, isCurrent: id === wantId };
}
