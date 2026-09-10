import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { formatDuration, formatPercent, formatRelative } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { DAY, isDue, isNew, retention, stageOf } from '@/lib/srs';
import { useStore } from '@/lib/store';

export default function StatsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { cards, settings } = useStore();
  const now = Date.now();

  const stats = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const seen = cards.filter((c) => !isNew(c.review));
    const dueToday = seen.filter((c) => c.review.dueAt <= endOfToday.getTime()).length;
    const reviews = cards.reduce((sum, c) => sum + c.review.reviewCount, 0);
    const avgRetention = seen.length
      ? seen.reduce((sum, c) => sum + retention(c.review, now), 0) / seen.length
      : 0;
    const counts = { new: 0, learning: 0, mature: 0 };
    cards.forEach((c) => {
      counts[stageOf(c.review)] += 1;
    });
    const weakest = seen
      .map((c) => ({ card: c, r: retention(c.review, now) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, 8);
    return { seen, dueToday, reviews, avgRetention, counts, weakest };
  }, [cards, now]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t('statsTitle')}</Text>

        <View style={styles.tiles}>
          <Tile label={t('totalCards')} value={String(cards.length)} />
          <Tile label={t('dueToday')} value={String(stats.dueToday)} />
          <Tile label={t('reviewsDone')} value={String(stats.reviews)} />
          <Tile
            label={t('estimatedRetention')}
            value={stats.seen.length ? formatPercent(stats.avgRetention) : '–'}
          />
        </View>

        <View style={[styles.stageRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <StageCount label={t('newLabel')} value={stats.counts.new} color={theme.primary} />
          <StageCount label={t('learning')} value={stats.counts.learning} color={theme.warning} />
          <StageCount label={t('mature')} value={stats.counts.mature} color={theme.success} />
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
            stats.weakest.map(({ card, r }) => (
              <View key={card.id} style={styles.weakRow}>
                <View style={styles.weakHeader}>
                  <Text style={[styles.weakWord, { color: theme.text }]} numberOfLines={1}>
                    {card.word}
                    <Text style={{ color: theme.textMuted, fontWeight: '400' }}>
                      {'  '}
                      {card.translations[settings.mainLang] ?? ''}
                    </Text>
                  </Text>
                  <Text style={[styles.weakValue, { color: theme.text }]}>{formatPercent(r)}</Text>
                </View>
                <View style={[styles.meterTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.meterFill,
                      { width: `${Math.round(r * 100)}%`, backgroundColor: theme.primary },
                    ]}
                  />
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

function StageCount({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stage}>
      <View style={[styles.stageDot, { backgroundColor: color }]} />
      <Text style={[styles.stageValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.stageLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  tileValue: { fontSize: 26, fontWeight: '700' },
  tileLabel: { fontSize: 13, marginTop: 2 },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  stage: { alignItems: 'center', gap: 2 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageValue: { fontSize: 18, fontWeight: '700' },
  stageLabel: { fontSize: 12 },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  weakRow: { gap: 4, paddingVertical: 6 },
  weakHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  weakWord: { fontSize: 15, fontWeight: '600', flex: 1 },
  weakValue: { fontSize: 14, fontVariant: ['tabular-nums'] },
  meterTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2 },
  weakMeta: { fontSize: 12 },
});
