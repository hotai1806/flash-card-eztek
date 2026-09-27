import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SEED_WORDS } from '@/constants/seedCards';
import { useTheme } from '@/hooks/useTheme';
import { STAGE_EMOJI } from '@/lib/garden';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { ALL_LANGS, ALL_MODES, type Lang, type PracticeMode } from '@/lib/types';

const NATIVE_NAMES: Record<Lang, string> = { en: 'English', zh: '中文', vi: 'Tiếng Việt' };
const MODE_EMOJI: Record<PracticeMode, string> = { recognition: '👀', recall: '🧠', listening: '👂' };

export default function OnboardingScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { settings, updateSettings, loadSamples } = useStore();

  const [step, setStep] = useState(0);
  const [learning, setLearning] = useState<Lang>(settings.learningLang);
  const [main, setMain] = useState<Lang | null>(settings.mainLang !== settings.learningLang ? settings.mainLang : null);
  const [modes, setModes] = useState<PracticeMode[]>(settings.practiceModes);

  const finish = (withSamples: boolean) => {
    const mainLang = main ?? (learning === 'en' ? 'zh' : 'en');
    updateSettings({ onboarded: true, learningLang: learning, mainLang, uiLang: mainLang, practiceModes: modes.length ? modes : ['recognition'] });
    if (withSamples) loadSamples(learning);
    router.replace('/');
  };

  const toggleMode = (m: PracticeMode) =>
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 ? (
          <View style={styles.hero}>
            <LinearGradient colors={[theme.cardBack, theme.cardBackAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <View style={styles.heroPlants}>
                {(['seed', 'sprout', 'sapling', 'tree', 'bloom'] as const).map((s, i) => (
                  <Text key={s} style={[styles.heroPlant, { fontSize: 28 + i * 6 }]}>
                    {STAGE_EMOJI[s]}
                  </Text>
                ))}
              </View>
              <Text style={styles.heroTitle}>{t('obWelcome')}</Text>
              <Text style={styles.heroBody}>{t('obTagline')}</Text>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? theme.primary : theme.border }]} />
          ))}
        </View>

        {step === 0 ? (
          <>
            <Text style={[styles.question, { color: theme.text }]}>{t('obStep1')}</Text>
            {ALL_LANGS.map((l) => (
              <Choice key={l} label={NATIVE_NAMES[l]} sub={t(`lang_${l}`)} selected={learning === l} onPress={() => { setLearning(l); if (main === l) setMain(null); }} />
            ))}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={[styles.question, { color: theme.text }]}>{t('obStep2')}</Text>
            {ALL_LANGS.filter((l) => l !== learning).map((l) => (
              <Choice key={l} label={NATIVE_NAMES[l]} sub={t(`lang_${l}`)} selected={main === l} onPress={() => setMain(l)} />
            ))}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={[styles.question, { color: theme.text }]}>{t('obStep3')}</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>{t('obStep3Hint')}</Text>
            {ALL_MODES.map((m) => (
              <Choice
                key={m}
                emoji={MODE_EMOJI[m]}
                label={m === 'recognition' ? t('modeRecognition') : m === 'recall' ? t('modeRecall') : t('modeListening')}
                sub={m === 'recognition' ? t('modeRecognitionDesc') : m === 'recall' ? t('modeRecallDesc') : t('modeListeningDesc')}
                selected={modes.includes(m)}
                onPress={() => toggleMode(m)}
                multi
              />
            ))}
          </>
        ) : null}

        <View style={styles.actions}>
          {step > 0 ? <Button title={t('obBack')} variant="ghost" onPress={() => setStep((s) => s - 1)} /> : null}
          {step < 2 ? (
            <Button title={t('obContinue')} onPress={() => setStep((s) => s + 1)} disabled={step === 1 && !main} style={styles.grow} />
          ) : (
            <View style={[styles.grow, { gap: 10 }]}>
              <Button title={t('obStart', { count: SEED_WORDS.length })} onPress={() => finish(true)} disabled={modes.length === 0} />
              <Button title={t('obStartEmpty')} variant="ghost" onPress={() => finish(false)} disabled={modes.length === 0} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({ label, sub, emoji, selected, onPress, multi }: { label: string; sub?: string; emoji?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: selected ? theme.primary : theme.surface, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {emoji ? <Text style={styles.choiceEmoji}>{emoji}</Text> : null}
      <View style={styles.grow}>
        <Text style={[styles.choiceLabel, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text>
        {sub ? <Text style={[styles.choiceSub, { color: selected ? 'rgba(255,255,255,0.8)' : theme.textMuted }]}>{sub}</Text> : null}
      </View>
      <Text style={[styles.check, { color: selected ? theme.onPrimary : theme.border }]}>{selected ? '✓' : '○'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  hero: { marginBottom: 6 },
  heroCard: { borderRadius: 28, padding: 24, gap: 10 },
  heroPlants: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  heroPlant: { lineHeight: 60 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  heroBody: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  question: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  hint: { fontSize: 14, marginTop: -6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 16 },
  choiceEmoji: { fontSize: 26 },
  choiceLabel: { fontSize: 18, fontWeight: '700' },
  choiceSub: { fontSize: 13, marginTop: 2 },
  check: { fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'flex-start' },
  grow: { flex: 1 },
});
