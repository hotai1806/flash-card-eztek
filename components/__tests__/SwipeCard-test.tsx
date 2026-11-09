import * as React from 'react';
import { Text } from 'react-native';
import renderer from 'react-test-renderer';

import SwipeCard from '../SwipeCard';

it('renders its children', () => {
  const tree = renderer.create(
    <SwipeCard>
      <Text>inner</Text>
    </SwipeCard>,
  );
  expect(JSON.stringify(tree.toJSON())).toContain('inner');
});
