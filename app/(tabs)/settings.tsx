import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { confirmAsync } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { ALL_LANGS, ALL_MODES, UI_LANGS, type Lang, type PracticeMode } from '@/lib/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const { t, langName } = useI18n();
  const { settings, updateSettings, resetProgress, deleteAllCards } = useStore();

  const onReset = async () => {
    if (await confirmAsync(t('resetProgress'), t('resetProgressBody'), { confirm: t('yes'), cancel: t('cancel') })) resetProgress();
  };
  const onDeleteAll = async () => {
    if (await confirmAsync(t('deleteAll'), t('deleteAllBody'), { confirm: t('delete'), cancel: t('cancel') })) deleteAllCards();
  };

  const toggleMode = (m: PracticeMode) => {
    const has = settings.practiceModes.includes(m);
    if (has && settings.practiceModes.length === 1) return; // keep at least one
    updateSettings({ practiceModes: has ? settings.practiceModes.filter((x) => x !== m) : [...settings.practiceModes, m] });
  };

  const modeLabel = (m: PracticeMode) => (m === 'recognition' ? t('modeRecognition') : m === 'recall' ? t('modeRecall') : t('modeListening'));
  const modeDesc = (m: PracticeMode) => (m === 'recognition' ? t('modeRecognitionDesc') : m === 'recall' ? t('modeRecallDesc') : t('modeListeningDesc'));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settingsTitle')}</Text>

        <Section title={t('learningLanguage')}>
          <LangPicker value={settings.learningLang} options={ALL_LANGS} onChange={(learningLang) => updateSettings({ learningLang })} label={langName} />
        </Section>

        <Section title={t('mainLanguage')} hint={t('mainLanguageHint')}>
          <LangPicker value={settings.mainLang} options={ALL_LANGS} onChange={(mainLang) => updateSettings({ mainLang })} label={langName} />
          {settings.mainLang === settings.learningLang ? <Text style={[styles.warning, { color: theme.warning }]}>{t('langSameWarning')}</Text> : null}
        </Section>

        <Section title={t('uiLanguage')}>
          <LangPicker value={settings.uiLang} options={UI_LANGS} onChange={(uiLang) => updateSettings({ uiLang })} label={langName} />
        </Section>

        <Section title={t('practiceModes')} hint={t('obStep3Hint')}>
          {ALL_MODES.map((m) => (
            <ToggleRow key={m} label={modeLabel(m)} hint={modeDesc(m)} value={settings.practiceModes.includes(m)} onChange={() => toggleMode(m)} />
          ))}
          <ToggleRow label={t('speechEnabled')} value={settings.speechEnabled} onChange={(speechEnabled) => updateSettings({ speechEnabled })} />
        </Section>

        <Section title={t('tabStudy')}>
          <Stepper
            label={t('dailyGoal')}
            value={settings.dailyGoal}
            display={t('reviewsUnit', { n: settings.dailyGoal })}
            onChange={(dailyGoal) => updateSettings({ dailyGoal })}
            step={5}
            min={5}
            max={200}
          />
          <Stepper
            label={t('newPerSession')}
            value={settings.newCardsPerSession}
            display={String(settings.newCardsPerSession)}
            onChange={(newCardsPerSession) => updateSettings({ newCardsPerSession })}
            step={5}
            min={0}
            max={100}
          />
          <ToggleRow label={t('autoTranslate')} value={settings.autoTranslate} onChange={(autoTranslate) => updateSettings({ autoTranslate })} />
        </Section>

        <Section title={t('imageLabel')}>
          <ToggleRow label={t('autoImage')} value={settings.autoImage} onChange={(autoImage) => updateSettings({ autoImage })} />
          <View style={styles.segmentRow}>
            <Segment label="AI" selected={settings.imageProvider === 'ai'} onPress={() => updateSettings({ imageProvider: 'ai' })} />
            <Segment label="Photo" selected={settings.imageProvider === 'photo'} onPress={() => updateSettings({ imageProvider: 'photo' })} />
          </View>
        </Section>

        <Section title={t('about')} hint={t('aboutBody')}>
          <View style={styles.dangerZone}>
            <Button title={t('resetProgress')} variant="secondary" onPress={onReset} />
            <Button title={t('deleteAll')} variant="danger" onPress={onDeleteAll} />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function LangPicker({ value, options, onChange, label }: { value: Lang; options: Lang[]; onChange: (l: Lang) => void; label: (l: Lang) => string }) {
  return (
    <View style={styles.segmentRow}>
      {options.map((l) => (
        <Segment key={l} label={label(l)} selected={l === value} onPress={() => onChange(l)} />
      ))}
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.segment, { backgroundColor: selected ? theme.primary : theme.surfaceAlt, borderColor: selected ? theme.primary : theme.border }]}
    >
      <Text style={[styles.segmentText, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.grow}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: theme.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary }} />
    </View>
  );
}

function Stepper({ label, value, display, onChange, step, min, max }: { label: string; value: number; display: string; onChange: (v: number) => void; step: number; min: number; max: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.rowLabel, styles.grow, { color: theme.text }]}>{label}</Text>
      <View style={styles.stepper}>
        <Button small variant="secondary" title="−" onPress={() => onChange(Math.max(min, value - step))} />
        <Text style={[styles.stepperValue, { color: theme.text }]}>{display}</Text>
        <Button small variant="secondary" title="+" onPress={() => onChange(Math.min(max, value + step))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  section: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  warning: { fontSize: 13 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowLabel: { fontSize: 15 },
  rowHint: { fontSize: 12, marginTop: 2 },
  grow: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperValue: { fontSize: 15, fontWeight: '600', minWidth: 28, textAlign: 'center' },
  dangerZone: { gap: 10, marginTop: 4 },
});
