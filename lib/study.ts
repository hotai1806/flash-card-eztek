import type { Section } from './sections';

export type StudyState = { queue: string[]; step: number };

export type StudyAction =
  | { type: 'right'; id: string } // id = the word being graded; ignored if it is no longer the queue head
  | { type: 'wrong'; id: string }
  | { type: 'restart'; queue: string[] };

export function initStudy(section: Section, revealed: readonly string[]): StudyState {
  const done = new Set(revealed);
  return { queue: section.words.filter((w) => !done.has(w.id)).map((w) => w.id), step: 0 };
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  const step = state.step + 1;
  switch (action.type) {
    case 'right':
      if (state.queue[0] !== action.id) return state; // stale swipe callback
      return { queue: state.queue.slice(1), step };
    case 'wrong':
      if (state.queue[0] !== action.id) return state;
      return { queue: [...state.queue.slice(1), state.queue[0]], step };
    case 'restart':
      return { queue: [...action.queue], step };
  }
}
