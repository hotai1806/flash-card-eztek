import * as React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { type ReactTestInstance } from 'react-test-renderer';

import { JigsawGrid, Tile } from '../Jigsaw';
import type { Section } from '@/lib/sections';

function grid(cols: number, rows: number): Section {
  return {
    id: 'g',
    name: 'Grid',
    image: 1,
    cols,
    rows,
    sentence: 'x',
    words: Array.from({ length: cols * rows }, (_, i) => ({ id: `w${i}`, word: `w${i}`, meaning: 'm' })),
  };
}
const grid32 = grid(3, 2);
const grid33 = grid(3, 3);

const hostCovers = (root: ReactTestInstance) =>
  root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'cover');
const hostImage = (root: ReactTestInstance) =>
  root.findAll((n) => typeof n.type === 'string' && (n.type as string) === 'Image')[0];

it('JigsawGrid covers exactly the unrevealed words at tileRect positions', () => {
  const tree = renderer.create(<JigsawGrid section={grid32} revealed={['w0', 'w4', 'ghost']} width={300} />);
  const covers = hostCovers(tree.root);
  expect(covers).toHaveLength(4);
  expect(
    covers.map((c) => {
      const s = StyleSheet.flatten(c.props.style);
      return [s.left, s.top];
    }),
  ).toEqual([
    [100, 0],
    [200, 0],
    [0, 100],
    [200, 100],
  ]);
  const s = StyleSheet.flatten(covers[0].props.style);
  expect([s.width, s.height]).toEqual([101, 101]);
});

it('JigsawGrid with everything revealed has no covers and sizes the image to the grid', () => {
  const tree = renderer.create(
    <JigsawGrid section={grid32} revealed={['w0', 'w1', 'w2', 'w3', 'w4', 'w5']} width={300} />,
  );
  expect(hostCovers(tree.root)).toHaveLength(0);
  expect(StyleSheet.flatten(hostImage(tree.root).props.style)).toMatchObject({ width: 300, height: 200 });
});

it('Tile crops the centre cell of a 3x3', () => {
  const tree = renderer.create(<Tile section={grid33} index={4} size={100} />);
  const img = hostImage(tree.root);
  expect(StyleSheet.flatten(img.props.style)).toMatchObject({ width: 300, height: 300, left: -100, top: -100 });
  expect(img.props.resizeMode).toBe('stretch');
});
