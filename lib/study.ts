import type { Section } from './sections';

export type StudyState = { queue: string[]; step: number };

export type StudyAction = { type: 'right' } | { type: 'wrong' } | { type: 'restart'; queue: string[] };

export function initStudy(section: Section, revealed: readonly string[]): StudyState {
  const done = new Set(revealed);
  return { queue: section.words.filter((w) => !done.has(w.id)).map((w) => w.id), step: 0 };
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  const step = state.step + 1;
  switch (action.type) {
    case 'right':
      return { queue: state.queue.slice(1), step };
    case 'wrong':
      return state.queue.length === 0
        ? { queue: [], step }
        : { queue: [...state.queue.slice(1), state.queue[0]], step };
    case 'restart':
      return { queue: [...action.queue], step };
  }
}
