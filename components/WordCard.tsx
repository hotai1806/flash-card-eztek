import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { Tile } from '@/components/Jigsaw';
import type { Section, Word } from '@/lib/sections';

export type WordCardHandle = { flip: () => void };

type WordCardProps = { section: Section; word: Word; index: number };

const FLIP_HALF_MS = 120;

/** Front: tile + English word. Back: meaning, example, pronunciation. Flip = 2D squash. */
const WordCard = forwardRef<WordCardHandle, WordCardProps>(function WordCard(
  { section, word, index },
  ref,
) {
  const [showBack, setShowBack] = useState(false);
  const scaleX = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  const flip = () => {
    if (animating.current) return;
    animating.current = true;
    Animated.timing(scaleX, { toValue: 0, duration: FLIP_HALF_MS, useNativeDriver: true }).start(() => {
      setShowBack((b) => !b);
      Animated.timing(scaleX, { toValue: 1, duration: FLIP_HALF_MS, useNativeDriver: true }).start(() => {
        animating.current = false;
      });
    });
  };

  useImperativeHandle(ref, () => ({ flip }));

  return (
    <Animated.View style={[styles.face, { transform: [{ scaleX }] }]}>
      {showBack ? (
        <>
          <Text style={styles.meaning}>{word.meaning}</Text>
          {word.example ? <Text style={styles.example}>{word.example}</Text> : null}
          {word.pronunciation ? <Text style={styles.pronunciation}>{word.pronunciation}</Text> : null}
          <Text style={styles.hint}>Tap to flip back</Text>
        </>
      ) : (
        <>
          <Tile section={section} index={index} size={140} />
          <Text style={styles.word}>{word.word}</Text>
          <Text style={styles.hint}>Tap to flip</Text>
        </>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  word: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  meaning: { fontSize: 26, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  example: { fontSize: 16, fontStyle: 'italic', color: '#555', textAlign: 'center' },
  pronunciation: { fontSize: 16, fontFamily: 'SpaceMono', color: '#555', textAlign: 'center' },
  hint: { position: 'absolute', bottom: 16, fontSize: 14, color: '#999' },
});

export default WordCard;
