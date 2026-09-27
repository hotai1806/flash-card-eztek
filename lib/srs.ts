/**
 * Spaced-repetition scheduling based on the SuperMemo SM-2 algorithm, with a few
 * Anki-style adjustments (a short "relearning" step after a lapse, and separate
 * multipliers for "hard" and "easy").
 *
 * The scheduling models the forgetting curve: every successful review pushes the
 * next review further out (the curve gets flatter), while a failed review resets
 * the interval so the word is seen again very soon.
 */

import type { Card, Grade, ReviewState } from './types';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Delay before re-showing a card that was answered "again". */
export const RELEARN_DELAY_MS = 10 * MINUTE;

/** Retention we aim for at the moment a card comes due (Anki's default is 90%). */
export const TARGET_RETENTION = 0.9;

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** Interval multiplier applied to "hard" answers instead of the ease factor. */
const HARD_MULTIPLIER = 1.2;
/** Extra bonus multiplier for "easy" answers. */
const EASY_BONUS = 1.3;

const GRADE_QUALITY: Record<Grade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function newReviewState(now: number = Date.now()): ReviewState {
  return {
    repetitions: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE,
    dueAt: now,
    lastReviewedAt: null,
    reviewCount: 0,
    lapses: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the next review state after grading a card.
 * Pure function: does not mutate the input.
 */
export function schedule(state: ReviewState, grade: Grade, now: number = Date.now()): ReviewState {
  const q = GRADE_QUALITY[grade];

  // SM-2 ease update: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const easeDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const easeFactor = round2(Math.max(MIN_EASE, state.easeFactor + easeDelta));

  const base = {
    easeFactor,
    lastReviewedAt: now,
    reviewCount: state.reviewCount + 1,
  };

  if (grade === 'again') {
    return {
      ...state,
      ...base,
      repetitions: 0,
      intervalDays: 0,
      lapses: state.lapses + 1,
      dueAt: now + RELEARN_DELAY_MS,
    };
  }

  let intervalDays: number;
  if (state.repetitions === 0) {
    intervalDays = grade === 'easy' ? 4 : 1;
  } else if (state.repetitions === 1) {
    intervalDays = grade === 'easy' ? 10 : 6;
  } else {
    const previous = Math.max(state.intervalDays, 1);
    if (grade === 'hard') {
      intervalDays = previous * HARD_MULTIPLIER;
    } else if (grade === 'easy') {
      intervalDays = previous * easeFactor * EASY_BONUS;
    } else {
      intervalDays = previous * easeFactor;
    }
  }

  // "hard" on a fresh card should still not push it a full day further than "good".
  if (grade === 'hard' && state.repetitions <= 1) {
    intervalDays = Math.max(1, Math.round(intervalDays * HARD_MULTIPLIER) / 2);
  }

  intervalDays = Math.max(1, Math.round(intervalDays));

  return {
    ...state,
    ...base,
    repetitions: state.repetitions + 1,
    intervalDays,
    dueAt: now + intervalDays * DAY,
  };
}

/** Preview what the interval would be for each grade, for showing under the buttons. */
export function previewIntervals(state: ReviewState, now: number = Date.now()): Record<Grade, number> {
  const out = {} as Record<Grade, number>;
  (['again', 'hard', 'good', 'easy'] as Grade[]).forEach((g) => {
    out[g] = schedule(state, g, now).dueAt - now;
  });
  return out;
}

/**
 * Memory stability, in days: the time after which retention drops to 1/e.
 * We derive it from the current interval so that retention equals
 * TARGET_RETENTION exactly when the card comes due.
 */
export function stabilityDays(state: ReviewState): number {
  const intervalDays = state.intervalDays > 0 ? state.intervalDays : RELEARN_DELAY_MS / DAY;
  return intervalDays / -Math.log(TARGET_RETENTION);
}

/**
 * Estimated probability (0..1) that the card is still remembered right now,
 * using the exponential forgetting curve R = e^(-t / S).
 * Returns 0 for cards that were never reviewed.
 */
export function retention(state: ReviewState, now: number = Date.now()): number {
  if (state.lastReviewedAt == null) return 0;
  const elapsedDays = Math.max(0, now - state.lastReviewedAt) / DAY;
  return Math.exp(-elapsedDays / stabilityDays(state));
}

/** Retention curve samples for plotting: [ [days, retention], ... ]. */
export function retentionCurve(state: ReviewState, points = 24): Array<[number, number]> {
  const s = stabilityDays(state);
  const horizon = Math.max(1, s * 3);
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= points; i++) {
    const d = (horizon * i) / points;
    out.push([d, Math.exp(-d / s)]);
  }
  return out;
}

export type CardStage = 'new' | 'learning' | 'mature';

/** Rough classification used for badges and stats. */
export function stageOf(state: ReviewState): CardStage {
  if (state.reviewCount === 0) return 'new';
  if (state.intervalDays >= 21) return 'mature';
  return 'learning';
}

export function isDue(state: ReviewState, now: number = Date.now()): boolean {
  return state.dueAt <= now;
}

export function isNew(state: ReviewState): boolean {
  return state.reviewCount === 0;
}

/**
 * Build a study queue: every due, previously-seen card (oldest due first), then up
 * to `newLimit` new cards. Cards not yet due are excluded.
 */
export function buildSession(cards: Card[], newLimit: number, now: number = Date.now()): Card[] {
  const due = cards
    .filter((c) => !isNew(c.review) && isDue(c.review, now))
    .sort((a, b) => a.review.dueAt - b.review.dueAt);
  const fresh = cards
    .filter((c) => isNew(c.review))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, Math.max(0, newLimit));
  return [...due, ...fresh];
}

/** Earliest future due time among cards, or null. */
export function nextDueAt(cards: Card[], now: number = Date.now()): number | null {
  let next: number | null = null;
  for (const c of cards) {
    if (c.review.dueAt > now && (next === null || c.review.dueAt < next)) {
      next = c.review.dueAt;
    }
  }
  return next;
}
