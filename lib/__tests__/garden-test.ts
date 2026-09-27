import { plantStage, plantView, summarizeGarden } from '../garden';
import { DAY, newReviewState, schedule } from '../srs';
import { bestStreak, currentStreak, dateKey, lastDays, recordReview } from '../stats';
import type { Card, ReviewLog } from '../types';

const NOW = new Date('2026-09-27T12:00:00').getTime();

function card(id: string, review = newReviewState(NOW)): Card {
  return { id, lang: 'en', word: id, translations: {}, imageUrl: null, createdAt: NOW, review };
}

describe('garden', () => {
  it('grows with the review interval', () => {
    let s = newReviewState(NOW);
    expect(plantStage(s)).toBe('seed');
    s = schedule(s, 'good', NOW); // 1 day
    expect(plantStage(s)).toBe('sprout');
    s = schedule(s, 'good', s.dueAt); // 6 days
    expect(plantStage(s)).toBe('sapling');
    s = schedule(s, 'good', s.dueAt); // ~15 days
    expect(plantStage(s)).toBe('tree');
    s = schedule(s, 'easy', s.dueAt); // > 30 days
    expect(plantStage(s)).toBe('bloom');
  });

  it('wilts as retention drops and becomes thirsty when due', () => {
    const s = schedule(newReviewState(NOW), 'good', NOW);
    const fresh = plantView(s, NOW);
    expect(fresh.health).toBeCloseTo(1, 5);
    expect(fresh.wilting).toBe(false);
    expect(fresh.thirsty).toBe(false);

    const late = plantView(s, NOW + 5 * DAY);
    expect(late.health).toBeLessThan(0.75);
    expect(late.wilting).toBe(true);
    expect(late.thirsty).toBe(true);
  });

  it('summarises the garden', () => {
    const seed = card('seed');
    const sprout = card('sprout', schedule(newReviewState(NOW), 'good', NOW));
    const thirsty = card('thirsty', schedule(newReviewState(NOW - 5 * DAY), 'good', NOW - 5 * DAY));
    const s = summarizeGarden([seed, sprout, thirsty], NOW);
    expect(s.total).toBe(3);
    expect(s.seeds).toBe(1);
    expect(s.growing).toBe(2);
    expect(s.thirsty).toBe(1);
    expect(s.wilting).toBe(1);
    expect(s.health).toBeLessThan(1);
    expect(s.health).toBeGreaterThan(0);
  });
});

describe('stats', () => {
  it('records reviews per local day', () => {
    let log: ReviewLog = {};
    log = recordReview(log, true, NOW);
    log = recordReview(log, false, NOW);
    expect(log[dateKey(NOW)]).toEqual({ reviews: 2, remembered: 1 });
  });

  it('computes the current streak, keeping it alive before today’s first review', () => {
    let log: ReviewLog = {};
    log = recordReview(log, true, NOW - 2 * DAY);
    log = recordReview(log, true, NOW - DAY);
    expect(currentStreak(log, NOW)).toBe(2);
    log = recordReview(log, true, NOW);
    expect(currentStreak(log, NOW)).toBe(3);
    expect(currentStreak({}, NOW)).toBe(0);
    expect(currentStreak(recordReview({}, true, NOW - 3 * DAY), NOW)).toBe(0);
  });

  it('finds the best streak and lists recent days oldest first', () => {
    let log: ReviewLog = {};
    for (const d of [10, 9, 8, 5, 4]) log = recordReview(log, true, NOW - d * DAY);
    expect(bestStreak(log)).toBe(3);
    const days = lastDays(log, 3, NOW);
    expect(days).toHaveLength(3);
    expect(days[2].key).toBe(dateKey(NOW));
  });
});
