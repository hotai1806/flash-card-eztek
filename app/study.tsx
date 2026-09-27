import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FlashCard, { type SwipeDirection } from '@/components/FlashCard';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration, formatPercent } from '@/lib/format';
import { plantView } from '@/lib/garden';
import { useI18n } from '@/lib/i18n';
import { stopSpeaking } from '@/lib/speech';
import { buildSession, isNew, previewIntervals } from '@/lib/srs';
import { useStore } from '@/lib/store';
import type { Card, Grade, PracticeMode } from '@/lib/types';

const CRAM_LIMIT = 20;

interface QueueItem {
  id: string;
  mode: PracticeMode;
}

function pickMode(card: Card, modes: PracticeMode[], speechEnabled: boolean): PracticeMode {
  // A word you have never seen can only be recognised, not recalled.
  if (isNew(card.review)) return 'recognition';
  const usable = modes.filter((m) => m !== 'listening' || speechEnabled);
  if (usable.length === 0) return 'recognition';
  return usable[Math.floor(Math.random() * usable.length)];
}

export default function StudyScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { cram } = useLocalSearchParams<{ cram?: string }>();
  const { ready, cards, settings, gradeCard } = useStore();

  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [watered, setWatered] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const startSession = useCallback(
    (ahead: boolean) => {
      const at = Date.now();
      // Practising ahead waters what is already planted first (soonest due first),
      // then plants seeds if there is room.
      const session = ahead
        ? [...cards]
            .sort((a, b) => Number(isNew(a.review)) - Number(isNew(b.review)) || a.review.dueAt - b.review.dueAt)
            .slice(0, CRAM_LIMIT)
        : buildSession(cards, settings.newCardsPerSession, at);
      setQueue(session.map((c) => ({ id: c.id, mode: pickMode(c, settings.practiceModes, settings.speechEnabled) })));
      setReviewed(0);
      setRemembered(0);
      setWatered([]);
      setFlipped(false);
    },
    [cards, settings.newCardsPerSession, settings.practiceModes, settings.speechEnabled]
  );

  useEffect(() => {
    if (ready && queue === null) startSession(cram === '1');
  }, [ready, queue, startSession, cram]);

  useEffect(() => () => stopSpeaking(), []);

  const currentItem = queue?.[0];
  const current = currentItem ? cardById.get(currentItem.id) : undefined;

  // If the current card was deleted elsewhere, drop it from the queue.
  useEffect(() => {
    if (currentItem && !current) {
      setQueue((q) => (q ? q.filter((i) => i.id !== currentItem.id) : q));
    }
  }, [currentItem, current]);

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(g === 'again' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
      stopSpeaking();
      gradeCard(current.id, g);
      setReviewed((n) => n + 1);
      if (g !== 'again') setRemembered((n) => n + 1);
      setWatered((w) => (w.includes(current.id) ? w : [...w, current.id]));
      setFlipped(false);
      setQueue((q) => {
        if (!q) return q;
        const rest = q.slice(1);
        // A forgotten card comes back at the end of this session, in the easiest mode.
        return g === 'again' ? [...rest, { id: current.id, mode: 'recognition' }] : rest;
      });
    },
    [current, gradeCard]
  );

  const onSwipe = useCallback((direction: SwipeDirection) => grade(direction === 'left' ? 'again' : 'good'), [grade]);

  const intervals = useMemo(() => (current ? previewIntervals(current.review, Date.now()) : null), [current]);
  const total = (queue?.length ?? 0) + reviewed;
  const progress = total ? reviewed / total : 0;

  const exit = () => {
    stopSpeaking();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!ready) return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} />;

  if (!current) {
    const now = Date.now();
    const wateredCards = watered.map((id) => cardById.get(id)).filter((c): c is Card => !!c);
    const grew = wateredCards.filter((c) => c.review.repetitions > 0).length;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.summaryWrap}>
          <Text style={styles.summaryEmoji}>{reviewed > 0 ? '🌷' : '🌱'}</Text>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>{reviewed > 0 ? t('summaryTitle') : t('nothingDue')}</Text>
          {reviewed > 0 ? (
            <View style={styles.summaryStats}>
              <Stat value={String(reviewed)} label={t('summaryReviewed', { n: reviewed })} />
              <Stat value={formatPercent(remembered / reviewed)} label={t('summaryAccuracy', { p: '' }).trim()} />
              <Stat value={String(grew)} label={t('summaryGrew')} accent />
            </View>
          ) : (
            <Text style={[styles.summaryBody, { color: theme.textMuted }]}>{t('nothingDueBody')}</Text>
          )}
          {wateredCards.length ? (
            <View style={[styles.wateredBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.wateredTitle, { color: theme.textMuted }]}>{t('summaryWatered')}</Text>
              <View style={styles.chips}>
                {wateredCards.map((c) => {
                  const v = plantView(c.review, now);
                  return (
                    <View key={c.id} style={[styles.chip, { backgroundColor: theme.surfaceAlt }]}>
                      <Text style={styles.chipEmoji}>{v.emoji}</Text>
                      <Text style={[styles.chipText, { color: theme.text }]}>{c.word}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
          <View style={styles.summaryActions}>
            <Button title={t('done')} onPress={exit} />
            {cards.length ? <Button title={t('keepGoing')} variant="secondary" onPress={() => startSession(true)} /> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const modeLabel =
    currentItem!.mode === 'recall' ? t('modeRecall') : currentItem!.mode === 'listening' ? t('modeListening') : t('modeRecognition');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={exit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('exitSession')} style={styles.iconBtn}>
          <MaterialIcons name="close" size={26} color={theme.textMuted} />
        </Pressable>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.counter, { color: theme.textMuted }]}>
          {reviewed}/{total}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <View style={[styles.modeChip, { backgroundColor: theme.surfaceAlt }]}>
          <MaterialIcons
            name={currentItem!.mode === 'recall' ? 'psychology' : currentItem!.mode === 'listening' ? 'hearing' : 'visibility'}
            size={16}
            color={theme.primary}
          />
          <Text style={[styles.modeText, { color: theme.text }]}>{modeLabel}</Text>
        </View>
      </View>

      <View style={styles.cardArea}>
        <FlashCard
          key={`${current.id}-${reviewed}`}
          card={current}
          mainLang={settings.mainLang}
          mode={currentItem!.mode}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onSwipe={onSwipe}
          speechEnabled={settings.speechEnabled}
        />
      </View>

      {flipped || currentItem!.mode === 'recognition' ? (
        <View style={styles.grades}>
          <GradeButton title={t('gradeAgain')} subtitle={intervals ? formatDuration(t, intervals.again) : ''} color={theme.danger} onPress={() => grade('again')} />
          <GradeButton title={t('gradeHard')} subtitle={intervals ? formatDuration(t, intervals.hard) : ''} color={theme.warning} onPress={() => grade('hard')} />
          <GradeButton title={t('gradeGood')} subtitle={intervals ? formatDuration(t, intervals.good) : ''} color={theme.success} onPress={() => grade('good')} />
          <GradeButton title={t('gradeEasy')} subtitle={intervals ? formatDuration(t, intervals.easy) : ''} color={theme.primary} onPress={() => grade('easy')} />
        </View>
      ) : (
        <View style={styles.grades}>
          <Button title={t('reveal')} onPress={() => setFlipped(true)} style={styles.revealBtn} />
        </View>
      )}
      <Text style={[styles.swipeHint, { color: theme.textMuted }]}>{t('swipeHint')}</Text>
    </SafeAreaView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: accent ? theme.success : theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function GradeButton({ title, subtitle, color, onPress }: { title: string; subtitle: string; color: string; onPress: () => void }) {
  return <Button title={title} subtitle={subtitle} onPress={onPress} style={[styles.gradeButton, { backgroundColor: color, borderColor: color }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  counter: { fontSize: 13, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'right' },
  modeRow: { alignItems: 'center', marginTop: 10 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  modeText: { fontSize: 13, fontWeight: '600' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  grades: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  gradeButton: { flex: 1, paddingHorizontal: 4 },
  revealBtn: { flex: 1 },
  swipeHint: { textAlign: 'center', fontSize: 12, marginVertical: 10 },
  summaryWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  summaryEmoji: { fontSize: 64 },
  summaryTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  summaryBody: { fontSize: 15, textAlign: 'center' },
  summaryStats: { flexDirection: 'row', gap: 24, marginTop: 6 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  wateredBox: { width: '100%', borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  wateredTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '600' },
  summaryActions: { width: '100%', gap: 10, marginTop: 8 },
});
