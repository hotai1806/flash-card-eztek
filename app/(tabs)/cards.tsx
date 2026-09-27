import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import CardForm from '@/components/CardForm';
import PlantTile from '@/components/PlantTile';
import { Button } from '@/components/ui/Button';
import { SEED_WORDS } from '@/constants/seedCards';
import { useTheme } from '@/hooks/useTheme';
import { confirmAsync, notify } from '@/lib/confirm';
import { formatRelative } from '@/lib/format';
import { plantView, STAGE_EMOJI, STAGE_ORDER, summarizeGarden, type PlantStage } from '@/lib/garden';
import { useI18n } from '@/lib/i18n';
import { isDue } from '@/lib/srs';
import { useStore } from '@/lib/store';
import type { Card } from '@/lib/types';

type ViewMode = 'garden' | 'list';

export default function GardenScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { cards, settings, deleteCard, loadSamples } = useStore();
  const { width } = useWindowDimensions();

  const [view, setView] = useState<ViewMode>('garden');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cards.filter(
          (c) => c.word.toLowerCase().includes(q) || Object.values(c.translations).some((v) => v?.toLowerCase().includes(q))
        )
      : cards;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards, query]);

  // Garden: thirsty first, then by health, then seeds at the end.
  const gardenOrder = useMemo(() => {
    return [...filtered]
      .map((c) => ({ c, v: plantView(c.review, now) }))
      .sort((a, b) => {
        const ta = a.v.thirsty && a.v.stage !== 'seed' ? 0 : a.v.stage === 'seed' ? 2 : 1;
        const tb = b.v.thirsty && b.v.stage !== 'seed' ? 0 : b.v.stage === 'seed' ? 2 : 1;
        if (ta !== tb) return ta - tb;
        return a.v.health - b.v.health;
      })
      .map((x) => x.c);
  }, [filtered, now]);

  const summary = useMemo(() => summarizeGarden(cards, now), [cards, now]);

  const contentWidth = Math.min(width, 640) - 40;
  const columns = Math.max(3, Math.floor(contentWidth / 108));
  const tileSize = Math.floor((contentWidth - (columns - 1) * 10) / columns);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (card: Card) => {
    setEditing(card);
    setFormOpen(true);
  };
  const remove = async (card: Card) => {
    const ok = await confirmAsync(t('deleteConfirmTitle'), t('deleteConfirmBody'), { confirm: t('delete'), cancel: t('cancel') });
    if (ok) deleteCard(card.id);
  };
  const samples = () => notify(t('cardsAdded', { count: loadSamples() }));

  const stageLabel = (s: PlantStage) =>
    s === 'seed' ? t('stageSeed') : s === 'sprout' ? t('stageSprout') : s === 'sapling' ? t('stageSapling') : s === 'tree' ? t('stageTree') : t('stageBloom');

  const header = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('gardenTitle')} <Text style={{ color: theme.textMuted, fontSize: 18 }}>({cards.length})</Text>
        </Text>
        <Button title={`+ ${t('addCard')}`} onPress={openNew} small />
      </View>
      <View style={styles.toolbar}>
        <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
          {(['garden', 'list'] as ViewMode[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === v }}
              style={[styles.segment, view === v && { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.segmentText, { color: view === v ? theme.text : theme.textMuted }]}>
                {v === 'garden' ? `🌿 ${t('viewGarden')}` : `☰ ${t('viewList')}`}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search')}
          placeholderTextColor={theme.textMuted}
        />
      </View>
    </>
  );

  const empty = (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={styles.emptyEmoji}>🪴</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('emptyDeck')}</Text>
      <Text style={[styles.emptyBody, { color: theme.textMuted }]}>{t('emptyDeckBody')}</Text>
      {cards.length === 0 ? (
        <>
          <Button title={t('loadSamples')} variant="secondary" onPress={samples} />
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>{t('loadSamplesBody', { count: SEED_WORDS.length })}</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {view === 'garden' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {header}
          {cards.length ? (
            <View style={[styles.summary, { backgroundColor: theme.garden, borderColor: theme.border }]}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                💧 {t('thirstyCount', { n: summary.thirsty })}   🥀 {summary.wilting} {t('wilting').toLowerCase()}   🌸 {t('bloomingCount', { n: summary.blooming })}
              </Text>
              <Text style={[styles.summaryIntro, { color: theme.textMuted }]}>{t('gardenIntro')}</Text>
            </View>
          ) : null}
          {gardenOrder.length ? (
            <View style={[styles.grid, { gap: 10 }]}>
              {gardenOrder.map((c) => (
                <PlantTile key={c.id} card={c} now={now} size={tileSize} onPress={() => openEdit(c)} />
              ))}
            </View>
          ) : (
            empty
          )}
          {cards.length ? (
            <View style={styles.legend}>
              {STAGE_ORDER.map((s) => (
                <Text key={s} style={[styles.legendItem, { color: theme.textMuted }]}>
                  {STAGE_EMOJI[s]} {stageLabel(s)}
                </Text>
              ))}
              <Text style={[styles.legendItem, { color: theme.textMuted }]}>💧 {t('needsWater')}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={header}
          renderItem={({ item }) => <CardRow card={item} now={now} onPress={() => openEdit(item)} onDelete={() => remove(item)} stageLabel={stageLabel} />}
          ListEmptyComponent={empty}
        />
      )}

      <CardForm visible={formOpen} card={editing} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

function CardRow({ card, now, onPress, onDelete, stageLabel }: { card: Card; now: number; onPress: () => void; onDelete: () => void; stageLabel: (s: PlantStage) => string }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { settings } = useStore();
  const v = plantView(card.review, now);
  const due = isDue(card.review, now);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={[styles.thumb, { backgroundColor: theme.surfaceAlt }]} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={{ fontSize: 22 }}>{v.emoji}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.word, { color: theme.text }]} numberOfLines={1}>
          {card.word}
        </Text>
        <Text style={[styles.translation, { color: theme.textMuted }]} numberOfLines={1}>
          {card.translations[settings.mainLang] || t('noTranslation')}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.badge, { color: theme.textMuted, borderColor: theme.border }]}>
            {v.emoji} {stageLabel(v.stage)}
          </Text>
          {v.stage !== 'seed' ? (
            <Text style={[styles.dueText, { color: due ? theme.warning : theme.textMuted }]}>
              {due ? `💧 ${t('needsWater')}` : `${t('due')}: ${formatRelative(t, card.review.dueAt, now)}`}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('delete')}>
        <Text style={[styles.deleteText, { color: theme.danger }]}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, gap: 12, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  toolbar: { gap: 10 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  summary: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
  summaryText: { fontSize: 13, fontWeight: '600' },
  summaryIntro: { fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
  legendItem: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  word: { fontSize: 17, fontWeight: '700' },
  translation: { fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  dueText: { fontSize: 12 },
  deleteText: { fontSize: 18, paddingHorizontal: 6 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center' },
});
