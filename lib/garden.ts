/**
 * The Memory Garden: every card is a plant.
 *
 * Growth follows the spaced-repetition interval (how long the memory is
 * expected to last), and wilting follows the forgetting curve (how much of it
 * is estimated to remain right now). Reviewing a card "waters" it.
 */

import { isDue, retention } from './srs';
import type { Card, ReviewState } from './types';

export type PlantStage = 'seed' | 'sprout' | 'sapling' | 'tree' | 'bloom';

export interface PlantView {
  stage: PlantStage;
  emoji: string;
  /** 0..1 estimated retention; drives the wilt look. */
  health: number;
  /** Due for review (needs water). */
  thirsty: boolean;
  /** Retention has dropped low enough that the plant visibly droops. */
  wilting: boolean;
}

export const STAGE_EMOJI: Record<PlantStage, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🪴',
  tree: '🌳',
  bloom: '🌸',
};

export const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'sapling', 'tree', 'bloom'];

export function plantStage(state: ReviewState): PlantStage {
  if (state.reviewCount === 0) return 'seed';
  if (state.intervalDays < 3) return 'sprout';
  if (state.intervalDays < 10) return 'sapling';
  if (state.intervalDays < 30) return 'tree';
  return 'bloom';
}

export const WILT_THRESHOLD = 0.75;

export function plantView(state: ReviewState, now: number = Date.now()): PlantView {
  const stage = plantStage(state);
  const health = stage === 'seed' ? 1 : retention(state, now);
  const thirsty = isDue(state, now);
  return {
    stage,
    emoji: STAGE_EMOJI[stage],
    health,
    thirsty,
    wilting: stage !== 'seed' && health < WILT_THRESHOLD,
  };
}

export interface GardenSummary {
  total: number;
  seeds: number;
  growing: number;
  blooming: number;
  thirsty: number;
  wilting: number;
  /** Average health of planted (reviewed) cards, 0..1. 1 when nothing planted. */
  health: number;
}

export function summarizeGarden(cards: Card[], now: number = Date.now()): GardenSummary {
  const s: GardenSummary = { total: cards.length, seeds: 0, growing: 0, blooming: 0, thirsty: 0, wilting: 0, health: 1 };
  let healthSum = 0;
  let planted = 0;
  for (const c of cards) {
    const v = plantView(c.review, now);
    if (v.stage === 'seed') s.seeds += 1;
    else if (v.stage === 'bloom') s.blooming += 1;
    else s.growing += 1;
    if (v.thirsty && v.stage !== 'seed') s.thirsty += 1;
    if (v.wilting) s.wilting += 1;
    if (v.stage !== 'seed') {
      healthSum += v.health;
      planted += 1;
    }
  }
  s.health = planted ? healthSum / planted : 1;
  return s;
}
