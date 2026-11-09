import * as React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import WordCard, { type WordCardHandle } from '../WordCard';
import type { Section } from '@/lib/sections';

const grid33: Section = {
  id: 'g',
  name: 'Grid',
  image: 1,
  cols: 3,
  rows: 3,
  sentence: 'x',
  words: Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, word: `w${i}`, meaning: 'm' })),
};
const word = { id: 'cup', word: 'cup', meaning: 'cái cốc', example: 'A cup of hot tea.', pronunciation: '/kʌp/' };

const text = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());

it('shows the tile, the word and the hint on the front', () => {
  const tree = renderer.create(<WordCard section={grid33} word={word} index={4} />);
  expect(text(tree)).toContain('cup');
  expect(text(tree)).toContain('Tap to flip');
  expect(text(tree)).not.toContain('cái cốc');
});

it('flip() shows the back after the squash, and flipping back restores the front', () => {
  jest.useFakeTimers();
  const ref = React.createRef<WordCardHandle>();
  const tree = renderer.create(<WordCard ref={ref} section={grid33} word={word} index={4} />);
  act(() => {
    ref.current!.flip();
  });
  act(() => {
    jest.advanceTimersByTime(300);
  });
  expect(text(tree)).toContain('cái cốc');
  expect(text(tree)).toContain('A cup of hot tea.');
  expect(text(tree)).toContain('/kʌp/');
  expect(text(tree)).toContain('Tap to flip back');
  act(() => {
    ref.current!.flip();
  });
  act(() => {
    jest.advanceTimersByTime(300);
  });
  expect(text(tree)).not.toContain('cái cốc');
});

it('a flip() during the animation is ignored', () => {
  jest.useFakeTimers();
  const ref = React.createRef<WordCardHandle>();
  const tree = renderer.create(<WordCard ref={ref} section={grid33} word={word} index={4} />);
  act(() => {
    ref.current!.flip();
    ref.current!.flip();
  });
  act(() => {
    jest.advanceTimersByTime(300);
  });
  expect(text(tree)).toContain('cái cốc');
});
