import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CardForm from '@/components/CardForm';
import { Button } from '@/components/ui/Button';
import { SEED_WORDS } from '@/constants/seedCards';
import { useTheme } from '@/hooks/useTheme';
import { confirmAsync, notify } from '@/lib/confirm';
import { formatRelative } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { isDue, stageOf } from '@/lib/srs';
import { useStore } from '@/lib/store';
import type { Card } from '@/lib/types';

export default function CardsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { cards, settings, deleteCard, loadSamples } = useStore();

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cards.filter(
          (c) =>
            c.word.toLowerCase().includes(q) ||
            Object.values(c.translations).some((v) => v?.toLowerCase().includes(q))
        )
      : cards;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (card: Card) => {
    setEditing(card);
    setFormOpen(true);
  };

  const remove = async (card: Card) => {
    const ok = await confirmAsync(t('deleteConfirmTitle'), t('deleteConfirmBody'), {
      confirm: t('delete'),
      cancel: t('cancel'),
    });
    if (ok) deleteCard(card.id);
  };

  const samples = () => {
    const n = loadSamples();
    notify(t('cardsAdded', { count: n }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('cardsTitle')} <Text style={{ color: theme.textMuted, fontSize: 18 }}>({cards.length})</Text>
        </Text>
        <Button title={`+ ${t('addCard')}`} onPress={openNew} small />
      </View>

      <TextInput
        style={[
          styles.search,
          { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
        ]}
        value={query}
        onChangeText={setQuery}
        placeholder={t('search')}
        placeholderTextColor={theme.textMuted}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CardRow card={item} onPress={() => openEdit(item)} onDelete={() => remove(item)} />
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('emptyDeck')}</Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>{t('emptyDeckBody')}</Text>
            {cards.length === 0 ? (
              <>
                <Button title={t('loadSamples')} variant="secondary" onPress={samples} />
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  {t('loadSamplesBody', { count: SEED_WORDS.length })}
                </Text>
              </>
            ) : null}
          </View>
        }
      />

      <CardForm visible={formOpen} card={editing} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

function CardRow({ card, onPress, onDelete }: { card: Card; onPress: () => void; onDelete: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { settings } = useStore();
  const stage = stageOf(card.review);
  const stageColor = stage === 'new' ? theme.primary : stage === 'mature' ? theme.success : theme.warning;
  const stageLabel = stage === 'new' ? t('newLabel') : stage === 'mature' ? t('mature') : t('learning');
  const due = isDue(card.review);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={[styles.thumb, { backgroundColor: theme.background }]} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: theme.background }]} />
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.word, { color: theme.text }]} numberOfLines={1}>
          {card.word}
        </Text>
        <Text style={[styles.translation, { color: theme.textMuted }]} numberOfLines={1}>
          {card.translations[settings.mainLang] || t('noTranslation')}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.badge, { color: stageColor, borderColor: stageColor }]}>{stageLabel}</Text>
          {stage !== 'new' ? (
            <Text style={[styles.dueText, { color: due ? theme.warning : theme.textMuted }]}>
              {t('due')}: {formatRelative(t, card.review.dueAt)}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  search: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { padding: 20, gap: 10, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  rowBody: { flex: 1, gap: 2 },
  word: { fontSize: 17, fontWeight: '600' },
  translation: { fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  dueText: { fontSize: 12 },
  deleteText: { fontSize: 18, paddingHorizontal: 6 },
  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center' },
});
