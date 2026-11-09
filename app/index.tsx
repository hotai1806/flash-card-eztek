import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { JigsawGrid } from '@/components/Jigsaw';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SECTIONS } from '@/content/sections';
import { useRevealed } from '@/hooks/useRevealed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { countLearned, isSectionDone, type Section } from '@/lib/sections';

function SectionRow({ section }: { section: Section }) {
  const revealed = useRevealed(section.id);
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'cover');
  const k = countLearned(section, revealed);
  const n = section.words.length;
  return (
    <Link href={{ pathname: '/study/[sectionId]', params: { sectionId: section.id } }} asChild>
      <Pressable style={[styles.row, { backgroundColor: background, borderColor: border }]}>
        <JigsawGrid section={section} revealed={revealed} width={110} />
        <View style={styles.info}>
          <ThemedText style={styles.name}>{section.name}</ThemedText>
          <ThemedText style={styles.count}>{`${k} / ${n} learned`}</ThemedText>
          {isSectionDone(section, revealed) ? (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>Complete</ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

export default function SectionsScreen() {
  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={SECTIONS}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SectionRow section={item} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: '600' },
  count: { fontSize: 14, color: '#888' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, lineHeight: 16, color: '#fff' },
});
