import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/lib/i18n';
import type { Card, Lang } from '@/lib/types';

export type SwipeDirection = 'left' | 'right';

interface FlashCardProps {
  card: Card;
  /** Language shown on the back. */
  mainLang: Lang;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: SwipeDirection) => void;
  /** Set false to disable swiping (e.g. while the queue is updating). */
  enabled?: boolean;
}

const SWIPE_OUT_DURATION = 220;
const TAP_SLOP = 6;

/**
 * A flashcard with the word and its picture on the front and the translation on
 * the back. Tap to flip; drag horizontally to grade (left = forgot, right =
 * remembered). Works with touch and mouse (web).
 */
export default function FlashCard({
  card,
  mainLang,
  flipped,
  onFlip,
  onSwipe,
  enabled = true,
}: FlashCardProps) {
  const theme = useTheme();
  const { t, langName } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const cardWidth = Math.min(windowWidth - 40, 440);
  const cardHeight = Math.min(Math.max(windowHeight * 0.55, 360), 560);
  const imageSize = Math.min(cardWidth - 48, cardHeight * 0.5);
  const swipeThreshold = Math.max(80, cardWidth * 0.3);

  const position = useRef(new Animated.ValueXY()).current;
  const flip = useRef(new Animated.Value(0)).current;
  const [imageState, setImageState] = useState<'loading' | 'ok' | 'error'>(
    card.imageUrl ? 'loading' : 'error'
  );

  // Keep refs so the PanResponder (created once) always sees the latest callbacks.
  const onFlipRef = useRef(onFlip);
  const onSwipeRef = useRef(onSwipe);
  const enabledRef = useRef(enabled);
  const animatingRef = useRef(false);
  onFlipRef.current = onFlip;
  onSwipeRef.current = onSwipe;
  enabledRef.current = enabled;

  useEffect(() => {
    Animated.spring(flip, {
      toValue: flipped ? 1 : 0,
      friction: 8,
      tension: 12,
      useNativeDriver: true,
    }).start();
  }, [flipped, flip]);

  const swipeOut = (direction: SwipeDirection) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    const x = direction === 'right' ? windowWidth + cardWidth : -(windowWidth + cardWidth);
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      onSwipeRef.current(direction);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > TAP_SLOP,
        onPanResponderMove: (_, g) => {
          if (!enabledRef.current || animatingRef.current) return;
          position.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_, g) => {
          if (animatingRef.current) return;
          const isTap = Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP;
          if (isTap) {
            onFlipRef.current();
            return;
          }
          if (enabledRef.current && g.dx > swipeThreshold) {
            swipeOut('right');
          } else if (enabledRef.current && g.dx < -swipeThreshold) {
            swipeOut('left');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 6,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: true,
          }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swipeThreshold, windowWidth, cardWidth]
  );

  const rotate = position.x.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const leftHintOpacity = position.x.interpolate({
    inputRange: [-swipeThreshold, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const rightHintOpacity = position.x.interpolate({
    inputRange: [0, 20, swipeThreshold],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5001, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 0.4999, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const translation = card.translations[mainLang];

  return (
    <View style={{ width: cardWidth, height: cardHeight }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.wrapper,
          {
            transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
          },
        ]}
      >
        {/* Front */}
        <Animated.View
          style={[
            styles.face,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <View style={[styles.imageBox, { width: imageSize, height: imageSize, backgroundColor: theme.background }]}>
            {card.imageUrl && imageState !== 'error' ? (
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoad={() => setImageState('ok')}
                onError={() => setImageState('error')}
                accessibilityLabel={card.word}
              />
            ) : (
              <Text style={[styles.noImage, { color: theme.textMuted }]}>{t('noImage')}</Text>
            )}
            {card.imageUrl && imageState === 'loading' ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null}
          </View>
          <Text style={[styles.word, { color: theme.text }]} numberOfLines={3} adjustsFontSizeToFit>
            {card.word}
          </Text>
          <Text style={[styles.langTag, { color: theme.textMuted }]}>{langName(card.lang)}</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>{t('tapToFlip')}</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.face,
            styles.back,
            {
              backgroundColor: theme.cardBack,
              borderColor: theme.cardBack,
              opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            },
          ]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <Text style={[styles.langTag, { color: theme.onCardBack, opacity: 0.8 }]}>
            {langName(mainLang)}
          </Text>
          <Text
            style={[styles.translation, { color: theme.onCardBack }]}
            numberOfLines={4}
            adjustsFontSizeToFit
          >
            {translation || t('noTranslation')}
          </Text>
          {card.note ? (
            <Text style={[styles.note, { color: theme.onCardBack }]} numberOfLines={4}>
              {card.note}
            </Text>
          ) : null}
          <Text style={[styles.backWord, { color: theme.onCardBack }]}>{card.word}</Text>
          <Text style={[styles.hint, { color: theme.onCardBack, opacity: 0.8 }]}>{t('tapToFlipBack')}</Text>
        </Animated.View>

        {/* Swipe hints */}
        <Animated.View style={[styles.badge, styles.badgeLeft, { opacity: leftHintOpacity, backgroundColor: theme.danger }]}
          pointerEvents="none">
          <Text style={styles.badgeText}>{t('gradeAgain')}</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.badgeRight, { opacity: rightHintOpacity, backgroundColor: theme.success }]}
          pointerEvents="none">
          <Text style={styles.badgeText}>{t('gradeGood')}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  back: {},
  imageBox: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImage: {
    fontSize: 14,
  },
  word: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  langTag: {
    marginTop: 6,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  translation: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  note: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  backWord: {
    marginTop: 20,
    fontSize: 18,
    opacity: 0.85,
  },
  hint: {
    position: 'absolute',
    bottom: 16,
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeLeft: {
    right: 20,
    transform: [{ rotate: '12deg' }],
  },
  badgeRight: {
    left: 20,
    transform: [{ rotate: '-12deg' }],
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
  },
});
