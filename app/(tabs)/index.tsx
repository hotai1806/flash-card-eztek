import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FlashCard, { type SwipeDirection } from '@/components/FlashCard';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration, formatRelative } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { buildSession, isDue, isNew, nextDueAt, previewIntervals } from '@/lib/srs';
import { useStore } from '@/lib/store';
import type { Card, Grade } from '@/lib/types';

const CRAM_LIMIT = 20;

export default function StudyScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { ready, cards, settings, gradeCard } = useStore();

  /** Ordered ids of the cards left in the current session. */
  const [queue, setQueue] = useState<string[] | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Refresh "now" once a minute so due counts stay accurate on long-lived screens.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const dueCount = useMemo(
    () => cards.filter((c) => !isNew(c.review) && isDue(c.review, now)).length,
    [cards, now]
  );
  const newCount = useMemo(() => cards.filter((c) => isNew(c.review)).length, [cards]);

  const startSession = useCallback(
    (cram = false) => {
      const at = Date.now();
      setNow(at);
      let session: Card[];
      if (cram) {
        session = [...cards].sort((a, b) => a.review.dueAt - b.review.dueAt).slice(0, CRAM_LIMIT);
      } else {
        session = buildSession(cards, settings.newCardsPerSession, at);
      }
      setQueue(session.map((c) => c.id));
      setReviewed(0);
      setFlipped(false);
    },
    [cards, settings.newCardsPerSession]
  );

  // Build the first session once data is loaded, and rebuild if the deck becomes non-empty.
  useEffect(() => {
    if (ready && queue === null) startSession();
  }, [ready, queue, startSession]);

  const currentId = queue?.[0];
  const current = currentId ? cardById.get(currentId) : undefined;

  // If the current card was deleted elsewhere, drop it from the queue.
  useEffect(() => {
    if (currentId && !current) {
      setQueue((q) => (q ? q.filter((id) => id !== currentId) : q));
    }
  }, [currentId, current]);

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      gradeCard(current.id, g);
      setReviewed((n) => n + 1);
      setFlipped(false);
      setQueue((q) => {
        if (!q) return q;
        const rest = q.slice(1);
        // A forgotten card comes back at the end of this session.
        return g === 'again' ? [...rest, current.id] : rest;
      });
    },
    [current, gradeCard]
  );

  const onSwipe = useCallback(
    (direction: SwipeDirection) => grade(direction === 'left' ? 'again' : 'good'),
    [grade]
  );

  const intervals = useMemo(
    () => (current ? previewIntervals(current.review, Date.now()) : null),
    [current]
  );

  const sessionTotal = (queue?.length ?? 0) + reviewed;

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.text }]}>{t('studyTitle')}</Text>
      <View style={styles.counters}>
        <Counter label={t('dueNow')} value={dueCount} color={theme.warning} />
        <Counter label={t('newCards')} value={newCount} color={theme.primary} />
      </View>
    </View>
  );

  if (!ready) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  if (!current) {
    const next = nextDueAt(cards, now);
    const finishedSession = reviewed > 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {header}
        <ScrollView contentContainerStyle={styles.emptyWrap}>
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {finishedSession ? t('sessionDone') : t('nothingDue')}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
              {finishedSession ? t('sessionDoneBody', { count: reviewed }) : t('nothingDueBody')}
            </Text>
            {next ? (
              <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                {t('nextDueIn', { when: formatRelative(t, next, now) })}
              </Text>
            ) : null}
            <View style={styles.emptyActions}>
              {cards.length > 0 ? (
                <Button title={t('studyAgain')} variant="secondary" onPress={() => startSession(true)} />
              ) : null}
              <Button title={t('addCards')} onPress={() => router.push('/cards')} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {header}
      <Text style={[styles.progress, { color: theme.textMuted }]}>
        {t('sessionProgress', { done: reviewed, total: sessionTotal })}
      </Text>

      <View style={styles.cardArea}>
        <FlashCard
          key={current.id}
          card={current}
          mainLang={settings.mainLang}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onSwipe={onSwipe}
        />
      </View>

      <Text style={[styles.swipeHint, { color: theme.textMuted }]}>{t('swipeHint')}</Text>

      <View style={styles.grades}>
        <GradeButton
          title={t('gradeAgain')}
          subtitle={intervals ? formatDuration(t, intervals.again) : ''}
          color={theme.danger}
          onPress={() => grade('again')}
        />
        <GradeButton
          title={t('gradeHard')}
          subtitle={intervals ? formatDuration(t, intervals.hard) : ''}
          color={theme.warning}
          onPress={() => grade('hard')}
        />
        <GradeButton
          title={t('gradeGood')}
          subtitle={intervals ? formatDuration(t, intervals.good) : ''}
          color={theme.success}
          onPress={() => grade('good')}
        />
        <GradeButton
          title={t('gradeEasy')}
          subtitle={intervals ? formatDuration(t, intervals.easy) : ''}
          color={theme.primary}
          onPress={() => grade('easy')}
        />
      </View>
    </SafeAreaView>
  );
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.counter, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={[styles.counterLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function GradeButton({
  title,
  subtitle,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Button
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      style={[styles.gradeButton, { backgroundColor: color, borderColor: color }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  counters: { flexDirection: 'row', gap: 8 },
  counter: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  counterValue: { fontSize: 18, fontWeight: '700' },
  counterLabel: { fontSize: 11 },
  progress: { textAlign: 'center', marginTop: 8, fontSize: 13 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  swipeHint: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
  grades: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  gradeButton: { flex: 1, paddingHorizontal: 4 },
  emptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyCard: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 15, textAlign: 'center' },
  emptyActions: { marginTop: 10, gap: 10, width: '100%' },
});
