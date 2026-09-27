import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CardForm from '@/components/CardForm';
import PlantTile from '@/components/PlantTile';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { formatPercent, formatRelative } from '@/lib/format';
import { plantView, summarizeGarden } from '@/lib/garden';
import { useI18n } from '@/lib/i18n';
import { buildSession, isDue, isNew, nextDueAt } from '@/lib/srs';
import { currentStreak, dayLog, lastDays } from '@/lib/stats';
import { useStore } from '@/lib/store';

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { cards, settings, log } = useStore();
  const [now, setNow] = useState(() => Date.now());
  const [formOpen, setFormOpen] = useState(false);

  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const due = useMemo(() => cards.filter((c) => !isNew(c.review) && isDue(c.review, now)).length, [cards, now]);
  const fresh = useMemo(() => cards.filter((c) => isNew(c.review)).length, [cards]);
  const session = useMemo(() => buildSession(cards, settings.newCardsPerSession, now), [cards, settings.newCardsPerSession, now]);
  const garden = useMemo(() => summarizeGarden(cards, now), [cards, now]);
  const today = dayLog(log, now);
  const streak = currentStreak(log, now);
  const week = lastDays(log, 7, now);
  const goalPct = Math.min(1, today.reviews / Math.max(1, settings.dailyGoal));

  const thirstyPlants = useMemo(
    () =>
      cards
        .filter((c) => !isNew(c.review))
        .map((c) => ({ c, v: plantView(c.review, now) }))
        .sort((a, b) => a.v.health - b.v.health)
        .slice(0, 8),
    [cards, now]
  );

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening');
  const next = nextDueAt(cards, now);

  const ctaTitle =
    due > 0 ? t('startSession', { n: session.length }) : session.length > 0 ? t('startSessionNew', { n: session.length }) : t('practiceAhead');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textMuted }]}>{greeting}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{t('todayTitle')}</Text>
          </View>
          <View style={[styles.streak, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.streakFlame}>{streak > 0 ? '🔥' : '🌤️'}</Text>
            <Text style={[styles.streakText, { color: theme.text }]}>{streak > 0 ? t('streakDays', { n: streak }) : t('streakNone')}</Text>
          </View>
        </View>

        {/* Hero: today's session */}
        <LinearGradient colors={[theme.cardBack, theme.cardBackAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.grow}>
              <Text style={styles.heroLabel}>{t('gardenHealth')}</Text>
              <Text style={styles.heroBig}>{formatPercent(garden.health)}</Text>
              <Text style={styles.heroSub}>
                {t('thirstyCount', { n: garden.thirsty })} · {t('growingCount', { n: garden.growing })} · {t('bloomingCount', { n: garden.blooming })}
              </Text>
            </View>
            <Text style={styles.heroEmoji}>{garden.thirsty > 0 ? '🥀' : garden.blooming > 0 ? '🌸' : '🌱'}</Text>
          </View>
          <View style={styles.goalRow}>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${Math.round(goalPct * 100)}%` }]} />
            </View>
            <Text style={styles.goalText}>{t('goalProgress', { done: today.reviews, goal: settings.dailyGoal })}</Text>
          </View>
          {session.length > 0 ? (
            <Button title={ctaTitle} onPress={() => router.push('/study')} textColor={theme.primaryDark} style={[styles.cta, { backgroundColor: '#fff', borderColor: '#fff' }]} />
          ) : (
            <View style={styles.caughtUp}>
              <Text style={styles.caughtUpTitle}>{t('allCaughtUp')}</Text>
              <Text style={styles.caughtUpBody}>
                {t('allCaughtUpBody', { when: next ? formatRelative(t, next, now) : '—' })}
              </Text>
              {cards.length ? (
                <Button title={t('practiceAhead')} onPress={() => router.push('/study?cram=1')} textColor="#fff" style={[styles.cta, { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.4)' }]} />
              ) : null}
            </View>
          )}
        </LinearGradient>

        {/* Week strip */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.weekRow}>
            {week.map((d, i) => {
              const active = d.log.reviews > 0;
              const goal = d.log.reviews >= settings.dailyGoal;
              const label = new Date(`${d.key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });
              return (
                <View key={d.key} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekDot,
                      {
                        backgroundColor: goal ? theme.gardenDeep : active ? theme.garden : theme.surfaceAlt,
                        borderColor: i === week.length - 1 ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    {active ? <Text style={styles.weekDotText}>{goal ? '🌸' : '🌱'}</Text> : null}
                  </View>
                  <Text style={[styles.weekLabel, { color: theme.textMuted }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Thirsty plants */}
        {thirstyPlants.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('weakestCards')}</Text>
              <Pressable onPress={() => router.push('/cards')} accessibilityRole="button">
                <Text style={[styles.link, { color: theme.primary }]}>{t('openGarden')} ›</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plantRow}>
              {thirstyPlants.map(({ c }) => (
                <PlantTile key={c.id} card={c} now={now} size={104} onPress={() => router.push('/cards')} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="add" label={t('quickAdd')} onPress={() => setFormOpen(true)} />
          <QuickAction icon="local-florist" label={t('openGarden')} onPress={() => router.push('/cards')} />
          <QuickAction icon="fast-forward" label={t('practiceAhead')} onPress={() => router.push('/study?cram=1')} disabled={cards.length === 0} />
        </View>

        {fresh > 0 || due > 0 ? (
          <Text style={[styles.footnote, { color: theme.textMuted }]}>
            {t('dueNow')}: {due} · {t('newCards')}: {fresh} · {t('seedsCount', { n: garden.seeds })}
          </Text>
        ) : null}
      </ScrollView>
      <CardForm visible={formOpen} card={null} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quick, { backgroundColor: theme.surface, borderColor: theme.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: theme.surfaceAlt }]}>
        <MaterialIcons name={icon} size={22} color={theme.primary} />
      </View>
      <Text style={[styles.quickLabel, { color: theme.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  greeting: { fontSize: 14 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  streakFlame: { fontSize: 16 },
  streakText: { fontSize: 13, fontWeight: '700' },
  hero: { borderRadius: 28, padding: 22, gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  heroBig: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, lineHeight: 50 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroEmoji: { fontSize: 56 },
  goalRow: { gap: 6 },
  goalTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  goalFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  goalText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  cta: { marginTop: 2 },
  caughtUp: { gap: 6 },
  caughtUpTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  caughtUpBody: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 20, padding: 14 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  weekDotText: { fontSize: 16 },
  weekLabel: { fontSize: 11 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '600' },
  plantRow: { gap: 10, paddingVertical: 2 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center', gap: 8 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  footnote: { fontSize: 12, textAlign: 'center' },
});
