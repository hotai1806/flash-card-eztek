import * as React from 'react';
import { StyleSheet } from 'react-native';
import renderer from 'react-test-renderer';

import WordCard from '../WordCard';
import type { Section } from '@/lib/sections';

// A short phone window (e.g. 16:9 Android at 360x560): the tile must shrink so the
// card's content (tile + word + hint) fits without overlapping.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 560, scale: 2, fontScale: 1 }),
}));

const grid33: Section = {
  id: 'g',
  name: 'Grid',
  image: 1,
  cols: 3,
  rows: 3,
  sentence: 'x',
  words: Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, word: `w${i}`, meaning: 'm' })),
};

it('scales the tile down to 18% of a short window height', () => {
  const tree = renderer.create(<WordCard section={grid33} word={grid33.words[4]} index={4} />);
  const img = tree.root.findAll((n) => typeof n.type === 'string' && (n.type as string) === 'Image')[0];
  // tile = round(560 * 0.18) = 101; the crop image is tile * cols wide
  expect(StyleSheet.flatten(img.props.style)).toMatchObject({ width: 303, height: 303 });
});
