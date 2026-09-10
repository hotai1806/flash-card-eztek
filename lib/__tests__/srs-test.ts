import {
  buildSession,
  DAY,
  isDue,
  newReviewState,
  nextDueAt,
  previewIntervals,
  RELEARN_DELAY_MS,
  retention,
  schedule,
  stageOf,
  TARGET_RETENTION,
} from '../srs';
import type { Card } from '../types';

const NOW = 1_700_000_000_000;

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    lang: 'en',
    word: id,
    translations: {},
    imageUrl: null,
    createdAt: NOW,
    review: newReviewState(NOW),
    ...overrides,
  };
}

describe('schedule (SM-2)', () => {
  it('starts a new card as due now with the default ease', () => {
    const s = newReviewState(NOW);
    expect(s.dueAt).toBe(NOW);
    expect(s.easeFactor).toBe(2.5);
    expect(isDue(s, NOW)).toBe(true);
    expect(stageOf(s)).toBe('new');
  });

  it('grows the interval on successive "good" answers', () => {
    let s = newReviewState(NOW);
    s = schedule(s, 'good', NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(NOW + DAY);

    s = schedule(s, 'good', s.dueAt);
    expect(s.intervalDays).toBe(6);

    const third = schedule(s, 'good', s.dueAt);
    expect(third.intervalDays).toBeGreaterThan(6);
    expect(third.repetitions).toBe(3);
    expect(third.reviewCount).toBe(3);
  });

  it('resets the interval and schedules a quick relearn on "again"', () => {
    let s = newReviewState(NOW);
    s = schedule(s, 'good', NOW);
    s = schedule(s, 'good', NOW + DAY);
    const lapsed = schedule(s, 'again', NOW + 7 * DAY);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.dueAt).toBe(NOW + 7 * DAY + RELEARN_DELAY_MS);
    expect(lapsed.easeFactor).toBeLessThan(s.easeFactor);
  });

  it('never lets ease drop below 1.3', () => {
    let s = newReviewState(NOW);
    for (let i = 0; i < 20; i++) s = schedule(s, 'again', NOW + i);
    expect(s.easeFactor).toBe(1.3);
  });

  it('orders intervals again < hard < good < easy', () => {
    let s = newReviewState(NOW);
    s = schedule(s, 'good', NOW);
    s = schedule(s, 'good', NOW + DAY);
    const p = previewIntervals(s, NOW + 7 * DAY);
    expect(p.again).toBeLessThan(p.hard);
    expect(p.hard).toBeLessThan(p.good);
    expect(p.good).toBeLessThan(p.easy);
  });

  it('does not mutate the input state', () => {
    const s = newReviewState(NOW);
    const copy = { ...s };
    schedule(s, 'easy', NOW);
    expect(s).toEqual(copy);
  });
});

describe('retention (forgetting curve)', () => {
  it('is 0 for unreviewed cards and 1 right after a review', () => {
    const fresh = newReviewState(NOW);
    expect(retention(fresh, NOW)).toBe(0);
    const reviewed = schedule(fresh, 'good', NOW);
    expect(retention(reviewed, NOW)).toBeCloseTo(1, 5);
  });

  it('decays to the target retention exactly when the card comes due', () => {
    const s = schedule(schedule(newReviewState(NOW), 'good', NOW), 'good', NOW + DAY);
    expect(retention(s, s.dueAt)).toBeCloseTo(TARGET_RETENTION, 5);
    expect(retention(s, s.dueAt + 30 * DAY)).toBeLessThan(TARGET_RETENTION);
  });
});

describe('buildSession', () => {
  it('returns due cards first, then a limited number of new cards', () => {
    const dueEarly = makeCard('dueEarly', {
      review: { ...schedule(newReviewState(NOW - 10 * DAY), 'good', NOW - 10 * DAY) },
    });
    const dueLate = makeCard('dueLate', {
      review: { ...schedule(newReviewState(NOW - 2 * DAY), 'good', NOW - 2 * DAY) },
    });
    const notDue = makeCard('notDue', {
      review: { ...schedule(newReviewState(NOW), 'easy', NOW) },
    });
    const n1 = makeCard('n1', { createdAt: NOW - 3 });
    const n2 = makeCard('n2', { createdAt: NOW - 2 });
    const n3 = makeCard('n3', { createdAt: NOW - 1 });

    const session = buildSession([n3, notDue, dueLate, n1, dueEarly, n2], 2, NOW);
    expect(session.map((c) => c.id)).toEqual(['dueEarly', 'dueLate', 'n1', 'n2']);
  });

  it('reports the next future due time', () => {
    const soon = makeCard('soon', { review: schedule(newReviewState(NOW), 'good', NOW) });
    const later = makeCard('later', { review: schedule(newReviewState(NOW), 'easy', NOW) });
    expect(nextDueAt([later, soon], NOW)).toBe(NOW + DAY);
    expect(nextDueAt([], NOW)).toBeNull();
  });
});
