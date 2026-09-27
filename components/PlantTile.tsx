import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { plantView } from '@/lib/garden';
import type { Card } from '@/lib/types';

interface PlantTileProps {
  card: Card;
  now: number;
  size: number;
  onPress?: () => void;
}

/**
 * One plant in the Memory Garden. Growth stage comes from the review interval,
 * droop and fading from the estimated retention, and a water drop marks a
 * card that is due.
 */
export default function PlantTile({ card, now, size, onPress }: PlantTileProps) {
  const theme = useTheme();
  const v = plantView(card.review, now);
  const fade = v.stage === 'seed' ? 1 : 0.35 + 0.65 * v.health;
  const droop = v.wilting ? `${Math.round((1 - v.health) * 40)}deg` : '0deg';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={card.word}
      style={({ pressed }) => [
        styles.tile,
        { width: size, backgroundColor: v.thirsty && v.stage !== 'seed' ? theme.surfaceAlt : theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.soil, { backgroundColor: theme.soil }]} />
      <Text style={[styles.emoji, { opacity: fade, transform: [{ rotate: droop }] }]}>{v.emoji}</Text>
      {v.thirsty && v.stage !== 'seed' ? <Text style={styles.drop}>💧</Text> : null}
      <Text style={[styles.word, { color: theme.text }]} numberOfLines={1}>
        {card.word}
      </Text>
      <View style={[styles.healthTrack, { backgroundColor: v.stage === 'seed' ? 'transparent' : theme.border }]}>
        {v.stage !== 'seed' ? (
          <View
            style={[
              styles.healthFill,
              { width: `${Math.round(v.health * 100)}%`, backgroundColor: v.wilting ? theme.warning : theme.gardenDeep },
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  soil: { position: 'absolute', left: 0, right: 0, top: 54, height: 10, opacity: 0.55 },
  emoji: { fontSize: 38, lineHeight: 46, marginBottom: 6 },
  drop: { position: 'absolute', top: 6, right: 8, fontSize: 14 },
  word: { fontSize: 12, fontWeight: '600', maxWidth: '100%' },
  healthTrack: { height: 3, borderRadius: 2, width: '80%', marginTop: 6, overflow: 'hidden' },
  healthFill: { height: 3, borderRadius: 2 },
});
