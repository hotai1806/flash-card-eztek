import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { formatDuration, formatPercent, formatRelative } from '@/lib/format';
import { plantView, summarizeGarden } from '@/lib/garden';
import { useI18n } from '@/lib/i18n';
import { DAY, isDue, isNew } from '@/lib/srs';
import { bestStreak, currentStreak, lastDays } from '@/lib/stats';
import { useStore } from '@/lib/store';

export default function StatsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { cards, settings, log } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const stats = useMemo(() => {
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const seen = cards.filter((c) => !isNew(c.review));
    const dueToday = seen.filter((c) => c.review.dueAt <= endOfToday.getTime()).length;
    const reviews = cards.reduce((sum, c) => sum + c.review.reviewCount, 0);
    const garden = summarizeGarden(cards, now);
    const weakest = seen
      .map((c) => ({ card: c, v: plantView(c.review, now) }))
      .sort((a, b) => a.v.health - b.v.health)
      .slice(0, 8);
    return { seen, dueToday, reviews, garden, weakest };
  }, [cards, now]);

  const days = lastDays(log, 14, now);
  const maxReviews = Math.max(1, ...days.map((d) => d.log.reviews));
  const streak = currentStreak(log, now);
  const best = bestStreak(log);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t('statsTitle')}</Text>

        <View style={styles.tiles}>
          <Tile label={t('labelStreak')} value={`${streak} 🔥`} />
          <Tile label={t('bestStreak')} value={String(best)} />
          <Tile label={t('dueToday')} value={String(stats.dueToday)} />
          <Tile label={t('gardenHealth')} value={stats.seen.length ? formatPercent(stats.garden.health) : '–'} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('last14')}</Text>
          <View style={styles.bars}>
            {days.map((d) => {
              const h = d.log.reviews ? Math.max(6, Math.round((d.log.reviews / maxReviews) * 72)) : 4;
              const hitGoal = d.log.reviews >= settings.dailyGoal;
              return (
                <View key={d.key} style={styles.barCol}>
                  <View style={[styles.bar, { height: h, backgroundColor: d.log.reviews ? (hitGoal ? theme.gardenDeep : theme.primary) : theme.border }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.barLabels}>
            <Text style={[styles.barLabel, { color: theme.textMuted }]}>
              {new Date(`${days[0].key}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={[styles.barLabel, { color: theme.textMuted }]}>{t('todayTitle')}</Text>
          </View>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {t('reviewsDone')}: {stats.reviews} · {t('totalCards')}: {cards.length}
          </Text>
        </View>

        <View style={[styles.stageRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <StageCount emoji="🌱" label={t('labelSeeds')} value={stats.garden.seeds} />
          <StageCount emoji="🌿" label={t('labelGrowing')} value={stats.garden.growing} />
          <StageCount emoji="🌸" label={t('labelBlooming')} value={stats.garden.blooming} />
          <StageCount emoji="💧" label={t('labelThirsty')} value={stats.garden.thirsty} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('retentionTitle')}</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>{t('retentionBody')}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('weakestCards')}</Text>
          {stats.weakest.length === 0 ? (
            <Text style={[styles.body, { color: theme.textMuted }]}>{t('noStats')}</Text>
          ) : (
            stats.weakest.map(({ card, v }) => (
              <View key={card.id} style={styles.weakRow}>
                <View style={styles.weakHeader}>
                  <Text style={[styles.weakWord, { color: theme.text }]} numberOfLines={1}>
                    {v.emoji} {card.word}
                    <Text style={{ color: theme.textMuted, fontWeight: '400' }}>
                      {'  '}
                      {card.translations[settings.mainLang] ?? ''}
                    </Text>
                  </Text>
                  <Text style={[styles.weakValue, { color: theme.text }]}>{formatPercent(v.health)}</Text>
                </View>
                <View style={[styles.meterTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.meterFill, { width: `${Math.round(v.health * 100)}%`, backgroundColor: v.wilting ? theme.warning : theme.gardenDeep }]} />
                </View>
                <Text style={[styles.weakMeta, { color: theme.textMuted }]}>
                  {t('nextReview')}: {isDue(card.review, now) ? t('now') : formatRelative(t, card.review.dueAt, now)}
                  {'  ·  '}
                  {t('interval')}: {formatDuration(t, Math.max(card.review.intervalDays, 0) * DAY || 0)}
                  {'  ·  '}
                  {t('ease')}: {card.review.easeFactor.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function StageCount({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stage}>
      <Text style={styles.stageEmoji}>{emoji}</Text>
      <Text style={[styles.stageValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.stageLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: 18, padding: 14 },
  tileValue: { fontSize: 26, fontWeight: '800' },
  tileLabel: { fontSize: 13, marginTop: 2 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderRadius: 18, padding: 14 },
  stage: { alignItems: 'center', gap: 2 },
  stageEmoji: { fontSize: 20 },
  stageValue: { fontSize: 18, fontWeight: '700' },
  stageLabel: { fontSize: 11 },
  section: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 11 },
  weakRow: { gap: 4, paddingVertical: 6 },
  weakHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  weakWord: { fontSize: 15, fontWeight: '600', flex: 1 },
  weakValue: { fontSize: 14, fontVariant: ['tabular-nums'] },
  meterTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2 },
  weakMeta: { fontSize: 12 },
});
