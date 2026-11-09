import { initStudy, studyReducer } from '../study';
import type { Section } from '../sections';

function makeSection(over: Partial<Section> = {}): Section {
  return {
    id: 'beach',
    name: 'Beach',
    image: 1,
    cols: 3,
    rows: 2,
    sentence: 'x',
    words: ['sand', 'wave', 'shell', 'sun', 'crab', 'umbrella'].map((id) => ({
      id,
      word: id,
      meaning: 'm',
    })),
    ...over,
  };
}

it('initStudy queues unrevealed words in section order with step 0', () => {
  expect(initStudy(makeSection(), ['wave', 'stale'])).toEqual({
    queue: ['sand', 'shell', 'sun', 'crab', 'umbrella'],
    step: 0,
  });
});

it('initStudy with everything revealed yields an empty queue', () => {
  expect(initStudy(makeSection(), ['sand', 'wave', 'shell', 'sun', 'crab', 'umbrella']).queue).toEqual([]);
});

it('right drops the head and bumps step', () => {
  expect(studyReducer({ queue: ['a', 'b'], step: 3 }, { type: 'right', id: 'a' })).toEqual({ queue: ['b'], step: 4 });
});

it('wrong moves the head to the tail and bumps step', () => {
  expect(studyReducer({ queue: ['a', 'b', 'c'], step: 0 }, { type: 'wrong', id: 'a' })).toEqual({
    queue: ['b', 'c', 'a'],
    step: 1,
  });
});

it('wrong on a one-item queue keeps the queue and bumps step', () => {
  expect(studyReducer({ queue: ['a'], step: 5 }, { type: 'wrong', id: 'a' })).toEqual({ queue: ['a'], step: 6 });
});

it('restart replaces the queue and bumps step', () => {
  expect(studyReducer({ queue: [], step: 9 }, { type: 'restart', queue: ['a', 'b'] })).toEqual({
    queue: ['a', 'b'],
    step: 10,
  });
});

it('does not mutate the previous state', () => {
  const s = { queue: ['a', 'b'], step: 0 };
  studyReducer(s, { type: 'wrong', id: 'a' });
  expect(s).toEqual({ queue: ['a', 'b'], step: 0 });
});

it('right with an id that is not the queue head leaves the state untouched (stale swipe callback)', () => {
  const s = { queue: ['a', 'b'], step: 3 };
  expect(studyReducer(s, { type: 'right', id: 'zzz' })).toBe(s);
});

it('wrong with an id that is not the queue head leaves the state untouched', () => {
  const s = { queue: ['a', 'b'], step: 3 };
  expect(studyReducer(s, { type: 'wrong', id: 'b' })).toBe(s);
});
