import { DAY } from './srs';
import type { DayLog, ReviewLog } from './types';

/** Local calendar date key, e.g. "2026-09-27". */
export function dateKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const EMPTY: DayLog = { reviews: 0, remembered: 0 };

export function dayLog(log: ReviewLog, ts: number = Date.now()): DayLog {
  return log[dateKey(ts)] ?? EMPTY;
}

/**
 * Consecutive days with at least one review, counting back from today.
 * Today counts if it has activity; otherwise the streak is still alive if
 * yesterday had activity (the user simply hasn't studied yet today).
 */
export function currentStreak(log: ReviewLog, now: number = Date.now()): number {
  let streak = 0;
  let cursor = now;
  if ((log[dateKey(cursor)]?.reviews ?? 0) === 0) {
    cursor -= DAY;
    if ((log[dateKey(cursor)]?.reviews ?? 0) === 0) return 0;
  }
  while ((log[dateKey(cursor)]?.reviews ?? 0) > 0) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

/** Longest run of consecutive active days anywhere in the log. */
export function bestStreak(log: ReviewLog): number {
  const days = Object.keys(log)
    .filter((k) => (log[k]?.reviews ?? 0) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const t = new Date(`${k}T00:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Activity for the last `n` days, oldest first. */
export function lastDays(log: ReviewLog, n: number, now: number = Date.now()): Array<{ key: string; log: DayLog }> {
  const out: Array<{ key: string; log: DayLog }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = dateKey(now - i * DAY);
    out.push({ key, log: log[key] ?? EMPTY });
  }
  return out;
}

/** Record one review into the log (pure). */
export function recordReview(log: ReviewLog, remembered: boolean, ts: number = Date.now()): ReviewLog {
  const key = dateKey(ts);
  const prev = log[key] ?? EMPTY;
  return {
    ...log,
    [key]: { reviews: prev.reviews + 1, remembered: prev.remembered + (remembered ? 1 : 0) },
  };
}
