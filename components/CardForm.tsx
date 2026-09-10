import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { buildImageUrl } from '@/lib/images';
import { useI18n } from '@/lib/i18n';
import type { NewCardInput } from '@/lib/store';
import { useStore } from '@/lib/store';
import { translateText, translateToAll } from '@/lib/translate';
import { ALL_LANGS, type Card, type Lang } from '@/lib/types';

interface CardFormProps {
  visible: boolean;
  /** Existing card to edit, or null to create a new one. */
  card: Card | null;
  onClose: () => void;
}

/**
 * Modal form for creating / editing a card. On save it fills in whatever the
 * user left blank: the translation (via the translate API) and the picture
 * (via the image provider), according to the Settings toggles.
 */
export default function CardForm({ visible, card, onClose }: CardFormProps) {
  const theme = useTheme();
  const { t, langName } = useI18n();
  const { settings, addCard, updateCard } = useStore();

  const lang: Lang = card?.lang ?? settings.learningLang;
  const mainLang = settings.mainLang;

  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageVariant, setImageVariant] = useState(0);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setWord(card?.word ?? '');
    setTranslation(card?.translations[mainLang] ?? '');
    setNote(card?.note ?? '');
    setImageUrl(card?.imageUrl ?? '');
    setImageVariant(0);
    setError(null);
    setSaving(false);
    setTranslating(false);
  }, [visible, card, mainLang]);

  const englishHint = lang === 'en' ? word : mainLang === 'en' ? translation : card?.translations.en;

  const generateImage = (variant: number) => {
    if (!word.trim()) {
      setError(t('wordRequired'));
      return;
    }
    setError(null);
    setImageVariant(variant);
    setImageUrl(buildImageUrl(settings.imageProvider, word, englishHint, variant));
  };

  const autoTranslate = async () => {
    if (!word.trim()) {
      setError(t('wordRequired'));
      return;
    }
    setError(null);
    setTranslating(true);
    try {
      setTranslation(await translateText(word, lang, mainLang));
    } catch {
      setError(t('translateFailed'));
    } finally {
      setTranslating(false);
    }
  };

  const save = async () => {
    const w = word.trim();
    if (!w) {
      setError(t('wordRequired'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const translations: Partial<Record<Lang, string>> = { ...(card?.translations ?? {}) };
      delete translations[lang];
      if (translation.trim()) translations[mainLang] = translation.trim();

      // Fill in missing translations (main language first, then the others so the
      // card keeps working if the user switches main language later).
      const wordChanged = !card || card.word !== w;
      const missing = ALL_LANGS.filter(
        (l) => l !== lang && (!translations[l] || (wordChanged && l !== mainLang))
      );
      if (settings.autoTranslate && missing.length) {
        const fetched = await translateToAll(w, lang, missing);
        for (const l of missing) {
          if (fetched[l]) translations[l] = fetched[l];
        }
      }

      let image = imageUrl.trim() || null;
      if (!image && settings.autoImage) {
        const hint = lang === 'en' ? w : translations.en;
        image = buildImageUrl(settings.imageProvider, w, hint, imageVariant);
      }

      const input: NewCardInput = { word: w, lang, translations, imageUrl: image, note };
      if (card) {
        updateCard(card.id, input);
      } else {
        addCard(input);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={[styles.title, { color: theme.text }]}>
              {card ? t('editCard') : t('addCard')}
            </Text>

            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('wordLabel', { lang: langName(lang) })}
            </Text>
            <TextInput
              style={inputStyle}
              value={word}
              onChangeText={setWord}
              placeholder={t('wordPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('translationLabel', { lang: langName(mainLang) })}
            </Text>
            <View style={styles.row}>
              <TextInput
                style={[inputStyle, styles.grow]}
                value={translation}
                onChangeText={setTranslation}
                placeholder={t('translationPlaceholder')}
                placeholderTextColor={theme.textMuted}
              />
              <Button
                small
                variant="secondary"
                title={translating ? t('translating') : t('autoTranslateBtn')}
                onPress={autoTranslate}
                loading={translating}
              />
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>{t('imageLabel')}</Text>
            <TextInput
              style={inputStyle}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder={t('imagePlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.row}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={[styles.preview, { backgroundColor: theme.background }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.preview, { backgroundColor: theme.background }]} />
              )}
              <View style={styles.grow}>
                <Button
                  small
                  variant="secondary"
                  title={imageUrl ? t('regenerateImage') : t('generateImage')}
                  onPress={() => generateImage(imageUrl ? imageVariant + 1 : 0)}
                />
                <Text style={[styles.hint, { color: theme.textMuted }]}>{t('offlineImageHint')}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>{t('noteLabel')}</Text>
            <TextInput
              style={[inputStyle, styles.multiline]}
              value={note}
              onChangeText={setNote}
              multiline
              placeholderTextColor={theme.textMuted}
            />

            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button title={t('cancel')} variant="secondary" onPress={onClose} style={styles.grow} />
              <Button title={t('save')} onPress={save} loading={saving} style={styles.grow} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  sheetContent: { padding: 20, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 13, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 8 },
  grow: { flex: 1 },
  preview: { width: 96, height: 96, borderRadius: 12 },
  hint: { fontSize: 11, marginTop: 6 },
  error: { marginTop: 10, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
