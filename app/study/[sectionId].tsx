import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { useReducer, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { JigsawGrid } from '@/components/Jigsaw';
import SwipeCard from '@/components/SwipeCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import WordCard, { type WordCardHandle } from '@/components/WordCard';
import { SECTIONS } from '@/content/sections';
import { useRevealed } from '@/hooks/useRevealed';
import { progressStore } from '@/lib/progressStore';
import { countLearned, findSection, type Section } from '@/lib/sections';
import { initStudy, studyReducer } from '@/lib/study';

export default function StudyScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const section = findSection(SECTIONS, String(sectionId ?? ''));
  if (!section) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedView style={styles.centered}>
          <ThemedText type="title">Section not found</ThemedText>
          <Link href="/" style={styles.link}>
            <ThemedText type="link">Back to sections</ThemedText>
          </Link>
        </ThemedView>
      </>
    );
  }
  return <StudySession section={section} />;
}

function goBackToSections() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function StudySession({ section }: { section: Section }) {
  const revealed = useRevealed(section.id);
  const [state, dispatch] = useReducer(studyReducer, undefined, () => initStudy(section, revealed));
  const cardRef = useRef<WordCardHandle>(null);
  const { width, height } = useWindowDimensions();
  const gridWidth = Math.min(width - 40, 200, Math.round(height * 0.22));
  const currentId = state.queue[0];
  const index = section.words.findIndex((w) => w.id === currentId);
  const word = section.words[index];

  const onRight = () => {
    progressStore.reveal(section.id, currentId);
    dispatch({ type: 'right', id: currentId });
  };
  const onWrong = () => dispatch({ type: 'wrong', id: currentId });
  const onRestart = () => {
    progressStore.resetSection(section.id);
    dispatch({ type: 'restart', queue: section.words.map((w) => w.id) });
  };

  if (state.queue.length === 0 || !word) {
    return (
      <>
        <Stack.Screen options={{ title: section.name }} />
        <ThemedView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.completion}>
            <JigsawGrid section={section} revealed={section.words.map((w) => w.id)} width={width - 40} />
            <ThemedText style={styles.sentence}>{section.sentence}</ThemedText>
            <View style={styles.buttons}>
              <Pressable style={[styles.button, styles.restartButton]} onPress={onRestart}>
                <Text style={styles.buttonText}>Study again</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.backButton]} onPress={goBackToSections}>
                <Text style={styles.buttonText}>Back to sections</Text>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: section.name }} />
      <ThemedView style={[styles.screen, styles.study]}>
        <JigsawGrid section={section} revealed={revealed} width={gridWidth} />
        <ThemedText style={styles.count}>
          {`${countLearned(section, revealed)} / ${section.words.length} learned`}
        </ThemedText>
        <View style={styles.cardArea}>
          <SwipeCard
            key={state.step}
            onSwipeRight={onRight}
            onSwipeLeft={onWrong}
            onTap={() => cardRef.current?.flip()}
          >
            <WordCard ref={cardRef} section={section} word={word} index={index} />
          </SwipeCard>
        </View>
        <View style={styles.buttons}>
          <Pressable style={[styles.button, styles.forgotButton]} onPress={onWrong}>
            <Text style={styles.buttonText}>Didn't know</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.knewButton]} onPress={onRight}>
            <Text style={styles.buttonText}>Got it!</Text>
          </Pressable>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  study: { padding: 20, alignItems: 'center', gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  link: { marginTop: 15, paddingVertical: 15 },
  count: { fontSize: 14, color: '#888' },
  cardArea: { flex: 1, minHeight: 200, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  completion: { padding: 20, alignItems: 'center', gap: 20 },
  sentence: { fontSize: 18, lineHeight: 26, textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignSelf: 'stretch' },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  forgotButton: { backgroundColor: '#ff6b6b' },
  knewButton: { backgroundColor: '#4caf50' },
  restartButton: { backgroundColor: '#2196F3' },
  backButton: { backgroundColor: '#666' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
