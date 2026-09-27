import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/lib/i18n';
import { speak } from '@/lib/speech';
import type { Card, Lang, PracticeMode } from '@/lib/types';

export type SwipeDirection = 'left' | 'right';

interface FlashCardProps {
  card: Card;
  /** Language shown as the meaning. */
  mainLang: Lang;
  mode: PracticeMode;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: SwipeDirection) => void;
  /** Set false to disable swiping (e.g. while the queue is updating). */
  enabled?: boolean;
  speechEnabled?: boolean;
}

const SWIPE_OUT_DURATION = 220;
const TAP_SLOP = 6;

/**
 * The flashcard. Front depends on the practice mode:
 *  - recognition: picture + word, flip for the meaning
 *  - recall:      picture + meaning, flip for the word
 *  - listening:   blurred picture + play button, flip for everything
 * Back always shows word, pronunciation, meaning and note.
 * Tap to flip; drag horizontally to grade (left = forgot, right = remembered).
 */
export default function FlashCard({
  card,
  mainLang,
  mode,
  flipped,
  onFlip,
  onSwipe,
  enabled = true,
  speechEnabled = true,
}: FlashCardProps) {
  const theme = useTheme();
  const { t, langName } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const cardWidth = Math.min(windowWidth - 40, 420);
  const cardHeight = Math.min(Math.max(windowHeight * 0.56, 380), 600);
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

  // Listening mode: play the word as soon as the card appears.
  useEffect(() => {
    if (mode === 'listening' && speechEnabled) {
      const id = setTimeout(() => speak(card.word, card.lang), 350);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [mode, speechEnabled, card.word, card.lang]);

  // Read the word aloud when the back is revealed (not in recognition mode: the
  // user already saw it, and the button is right there).
  useEffect(() => {
    if (flipped && speechEnabled && mode === 'recall') speak(card.word, card.lang);
  }, [flipped, speechEnabled, mode, card.word, card.lang]);

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
            Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
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
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });

  const translation = card.translations[mainLang] || t('noTranslation');
  const hasImage = !!card.imageUrl && imageState !== 'error';

  const speakButton = (light: boolean, size = 22) => (
    <Pressable
      onPress={() => speak(card.word, card.lang)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('pronounce')}
      style={({ pressed }) => [
        styles.speaker,
        { backgroundColor: light ? 'rgba(255,255,255,0.22)' : theme.surfaceAlt, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialIcons name="volume-up" size={size} color={light ? '#fff' : theme.text} />
    </Pressable>
  );

  const picture = (blur: boolean) => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceAlt }]}>
      {hasImage ? (
        <Image
          source={{ uri: card.imageUrl! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={blur ? 30 : 0}
          onLoad={() => setImageState('ok')}
          onError={() => setImageState('error')}
          accessibilityLabel={card.word}
        />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageEmoji}>🌱</Text>
          <Text style={[styles.noImageText, { color: theme.textMuted }]}>{t('noImage')}</Text>
        </View>
      )}
      {card.imageUrl && imageState === 'loading' ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}
    </View>
  );

  const renderFront = () => {
    if (mode === 'listening') {
      return (
        <>
          {picture(true)}
          <View style={styles.listenOverlay}>
            <Pressable
              onPress={() => speak(card.word, card.lang)}
              accessibilityRole="button"
              accessibilityLabel={t('playAgain')}
              style={({ pressed }) => [styles.playButton, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialIcons name="volume-up" size={44} color="#fff" />
            </Pressable>
            <Text style={styles.listenHint}>{t('modeHintListening')}</Text>
            <Text style={styles.listenSub}>{t('playAgain')} · {t('tapToFlip')}</Text>
          </View>
        </>
      );
    }
    if (mode === 'recall') {
      return (
        <>
          {picture(false)}
          <LinearGradient colors={['transparent', 'rgba(10,8,30,0.85)']} style={styles.gradient} pointerEvents="none" />
          <View style={styles.frontBottom}>
            <Text style={styles.overlayTag}>{t('modeHintRecall')}</Text>
            <Text style={styles.overlayWord} numberOfLines={3} adjustsFontSizeToFit>
              {translation}
            </Text>
            <Text style={styles.overlayHint}>{t('tapToFlip')}</Text>
          </View>
        </>
      );
    }
    return (
      <>
        {picture(false)}
        <LinearGradient colors={['transparent', 'rgba(10,8,30,0.85)']} style={styles.gradient} pointerEvents="none" />
        <View style={styles.frontTopRight}>{speakButton(true)}</View>
        <View style={styles.frontBottom}>
          <Text style={styles.overlayTag}>{langName(card.lang)}</Text>
          <Text style={styles.overlayWord} numberOfLines={3} adjustsFontSizeToFit>
            {card.word}
          </Text>
          <Text style={styles.overlayHint}>{t('tapToFlip')}</Text>
        </View>
      </>
    );
  };

  return (
    <View style={{ width: cardWidth, height: cardHeight }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.wrapper, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
      >
        {/* Front */}
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: theme.surface, opacity: frontOpacity, transform: [{ perspective: 1200 }, { rotateY: frontRotate }] },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          {renderFront()}
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[styles.face, { opacity: backOpacity, transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <LinearGradient colors={[theme.cardBack, theme.cardBackAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.back}>
            {hasImage ? (
              <Image source={{ uri: card.imageUrl! }} style={styles.backThumb} resizeMode="cover" />
            ) : null}
            <View style={styles.backWordRow}>
              <Text style={[styles.backWord, { color: theme.onCardBack }]} numberOfLines={2} adjustsFontSizeToFit>
                {card.word}
              </Text>
              {speakButton(true, 24)}
            </View>
            <Text style={[styles.backTag, { color: theme.onCardBack }]}>{langName(card.lang)}</Text>
            <View style={styles.backDivider} />
            <Text style={[styles.backTag, { color: theme.onCardBack }]}>{langName(mainLang)}</Text>
            <Text style={[styles.backMeaning, { color: theme.onCardBack }]} numberOfLines={3} adjustsFontSizeToFit>
              {translation}
            </Text>
            {card.note ? (
              <Text style={[styles.backNote, { color: theme.onCardBack }]} numberOfLines={4}>
                {card.note}
              </Text>
            ) : null}
            <Text style={[styles.overlayHint, { position: 'absolute', bottom: 16 }]}>{t('tapToFlipBack')}</Text>
          </View>
        </Animated.View>

        {/* Swipe hints */}
        <Animated.View style={[styles.badge, styles.badgeLeft, { opacity: leftHintOpacity, backgroundColor: theme.danger }]} pointerEvents="none">
          <Text style={styles.badgeText}>{t('gradeAgain')}</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.badgeRight, { opacity: rightHintOpacity, backgroundColor: theme.success }]} pointerEvents="none">
          <Text style={styles.badgeText}>{t('gradeGood')}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    shadowColor: '#1c1a2e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noImageEmoji: { fontSize: 56 },
  noImageText: { fontSize: 13 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frontTopRight: { position: 'absolute', top: 16, right: 16 },
  frontBottom: { position: 'absolute', left: 22, right: 22, bottom: 22 },
  overlayTag: { color: 'rgba(255,255,255,0.75)', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  overlayWord: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -0.5, lineHeight: 46 },
  overlayHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 },
  speaker: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  listenOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,8,30,0.45)', gap: 14 },
  playButton: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  listenHint: { color: '#fff', fontSize: 20, fontWeight: '700' },
  listenSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  back: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  backThumb: { width: 88, height: 88, borderRadius: 20, marginBottom: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  backWordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '100%' },
  backWord: { fontSize: 36, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  backTag: { fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.75, marginTop: 4 },
  backDivider: { width: 48, height: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 16, borderRadius: 1 },
  backMeaning: { fontSize: 30, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  backNote: { marginTop: 14, fontSize: 15, textAlign: 'center', opacity: 0.9, lineHeight: 21 },
  badge: { position: 'absolute', top: 24, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  badgeLeft: { right: 20, transform: [{ rotate: '12deg' }] },
  badgeRight: { left: 20, transform: [{ rotate: '-12deg' }] },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 1 },
});
