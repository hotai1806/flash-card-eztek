# Picture Jigsaw Flashcards — Design

Date: 2026-11-06
Status: approved in conversation, pending written review
Branch: `claude/lucid-goldberg-duwhw3`

## 1. Intent

Turn the current prototype into a vocabulary flash-card app where every word has a
picture and words are grouped into sections. Each section owns one big picture that is
cut into a grid of tiles. Each word owns exactly one tile; the word's picture *is* that
tile. Getting a word right reveals its tile. When every word in a section is learned,
the whole picture is revealed together with the section's sentence, which uses all of
the section's words.

Decisions confirmed with the product owner:

| Question | Decision |
| --- | --- |
| How word pictures relate to the big picture | Jigsaw reveal: the big picture is cut into tiles, each word's picture is one tile |
| Card faces | Front: tile + English word. Back: Vietnamese meaning, optional English example, optional pronunciation |
| Content source | Three sample sections created now; the owner replaces them later by editing one file and dropping images |
| Language | English word → Vietnamese meaning, plus a short English example |
| Approach | "Smallest correct": reuse the existing PanResponder swipe card, 2D squash flip, exact-fill grid, two routes |
| Grid rule | A section's word count must equal `cols * rows` (every tile is earned) |
| Placeholder art | Emoji scenes drawn by a committed Python script |
| Reveal animation | None in this version |
| Study rules | Grading allowed from either face; words in tile order; missed words go to the end of the queue |
| Persistence | AsyncStorage, learned word ids per section |
| Starter components | Left in place; removed in a separate cleanup commit |

## 2. Goals and non-goals

Goals

- Learn words by swiping cards; see the section picture assemble as words are learned.
- One content file plus one PNG per section is all a content editor touches.
- Progress survives app restarts.
- All decision logic is pure and unit-tested; the UI stays thin.

Non-goals for this version

- Spaced repetition, shuffling, accounts, server content, audio, haptics, reveal
  animations, a tab bar, deleting unused starter components.

## 3. Architecture

Two screens on a flat expo-router Stack. The `(tabs)` group is deleted: its layout file
has no default export (expo-router 4.0.17 only warns and skips it in development, and
would not filter it in a production build), and the product has one linear flow.

```
app/
  _layout.tsx            modified: Stack with index, study/[sectionId], +not-found;
                         awaits progress hydration next to the font gate; dev validation
  index.tsx              new: section list
  study/[sectionId].tsx  new: study screen with inline completion view
  +not-found.tsx         unchanged
components/
  SwipeCard.tsx          modified: children, tap detection, no absolute positioning
  WordCard.tsx           new: front/back faces with squash flip
  Jigsaw.tsx             new: Tile and JigsawGrid
content/
  sections.ts            new: THE content file (3 sample sections)
lib/
  sections.ts            new: types, tile geometry, lookup, validation (no React)
  study.ts               new: study queue reducer (no React)
  progress.ts            new: progress store factory + AsyncStorage adapter (no React)
hooks/
  useRevealed.ts         new: useSyncExternalStore binding to the progress store
assets/sections/
  kitchen.png beach.png classroom.png   new: generated placeholders
scripts/
  make-placeholder-art.py               new: Pillow generator, run by hand
```

Deleted: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`,
`app/(tabs)/indexcopy.tsx`.

Modified in addition: `constants/Colors.ts` (two cover colour tokens), `package.json`
and `package-lock.json` (AsyncStorage, `test:ci` script), `README.md` (editing guide).

### Screens

**Section list (`app/index.tsx`).** A FlatList of rows. Each row: a `JigsawGrid`
thumbnail (width 110) showing the learner's revealed tiles, the section name, "k / n
learned", and a "Complete" badge when `isSectionDone`. Each row is a
`<Link href={{ pathname: '/study/[sectionId]', params: { sectionId } }} asChild>` around
a Pressable. Because progress is read through `useSyncExternalStore`, the list
re-renders on return from the study screen with no focus effect. Fallback if typed
routes reject the object form: the template-string href.

**Study screen (`app/study/[sectionId].tsx`).** Reads `sectionId` with
`useLocalSearchParams`, looks the section up with `findSection`. Unknown id renders a
"Section not found" view with a Link home (same pattern as `+not-found.tsx`). Sets the
native header title with `<Stack.Screen options={{ title: section.name }} />` so Back is
always visible. Layout, top to bottom: mini `JigsawGrid` (width
`min(screenWidth - 40, 200)`), "k / n learned", a fixed-height card container (360)
holding `SwipeCard` + `WordCard`, then the two buttons. When the queue is empty the card
container and buttons are replaced by the completion view (section 7).

### Root layout

Keeps font loading, `ThemeProvider`, and `StatusBar` exactly as now. Adds a `ready`
state set when `progressStore.hydrate()` settles; the splash hides and the Stack renders
only when `loaded && ready` (the existing `return null` gate). At module scope, under
`__DEV__`, runs `validateSections(SECTIONS)` and throws one `Error` whose message joins
every problem, so a content mistake shows as a single red box naming the section and
field.

## 4. Data model and content

`lib/sections.ts` (pure, no React):

```ts
import type { ImageSourcePropType } from 'react-native';

export type Word = {
  id: string;             // unique within the section; progress key; never rename
  word: string;           // English, card FRONT
  meaning: string;        // Vietnamese, card BACK
  example?: string;       // short English sentence, card BACK
  pronunciation?: string; // e.g. '/fɔːrk/', card BACK (rendered in SpaceMono)
};

export type Section = {
  id: string;                   // unique; route param
  name: string;                 // 'Kitchen'
  image: ImageSourcePropType;   // require('@/assets/sections/kitchen.png')
  cols: number;
  rows: number;                 // words.length MUST equal cols * rows
  words: Word[];                // ORDER = tile order, left to right, top to bottom
  sentence: string;             // plain text that uses every word; shown on completion
};

export type TileRect = { row: number; col: number; x: number; y: number; w: number; h: number };

export function tileOf(index: number, cols: number): { row: number; col: number };
export function tileRect(index: number, cols: number, rows: number, gridW: number): TileRect;
export function findSection(sections: readonly Section[], id: string): Section | undefined;
export function isSectionDone(section: Section, revealed: readonly string[]): boolean;
export function validateSections(sections: readonly Section[]): string[]; // [] = ok
```

`tileOf(i, cols)` is `{ row: floor(i / cols), col: i % cols }`. Tiles are square by
construction: `tileRect` uses `tile = gridW / cols` for both width and height.

**Content file.** `content/sections.ts` exports `SECTIONS: Section[]`. It is TypeScript
rather than JSON because images must be static `require()` calls for Metro and because
strict TypeScript flags shape errors in the editor. The `@/assets/...` require form is
already used by the starter code and resolves through Metro and jest-expo. A comment
header states the editing rules:

1. `words.length` must equal `cols * rows`. Practical word counts are therefore 6, 8, 9,
   10, 12; a 7-word section is not possible.
2. Word order is tile order: top-left first, reading order.
3. The picture must have the same shape as the grid (width / height = cols / rows), for
   example 900×900 for 3×3, 1200×600 for 4×2. The image is drawn with
   `resizeMode="stretch"`, so a mismatched shape distorts rather than misaligns.
4. Word and section ids are unique and never renamed; renaming forgets that word's
   progress.

**Validation rules** (`validateSections`, messages in plain English with the section
name and field): section ids unique and non-empty; `cols` and `rows` integers ≥ 1;
`words.length === cols * rows` ("Section 'Beach' has 5 words but a 3×2 grid needs 6");
word ids unique within a section; `name`, `word`, `meaning`, `sentence` non-empty;
`image` truthy. Enforced twice: a Jest test asserts `validateSections(SECTIONS)` is
empty, and the root layout throws in development.

**Sample content.** Emoji are used only by the placeholder-art script, not stored in
the content file. Vietnamese meanings are common dictionary forms written by the
assistant, not a native speaker; the owner should review them (regional variants:
thìa/muỗng, cốc/ly, ô/dù). Pronunciations are approximate IPA.

Kitchen, 3×3, `kitchen.png` 900×900. Sentence: "I set a fork, a spoon and a knife beside
the plate, filled a cup, put the pot and the pan on the stove, and washed up at the
sink."

| # | word | meaning | example | art emoji |
| --- | --- | --- | --- | --- |
| 1 | fork | cái nĩa | Pass me the fork, please. | 🍴 |
| 2 | spoon | cái thìa | I eat soup with a spoon. | 🥄 |
| 3 | knife | con dao | Cut the bread with a knife. | 🔪 |
| 4 | plate | cái đĩa | Put the food on the plate. | 🍽️ |
| 5 | cup | cái cốc | A cup of hot tea. | ☕ |
| 6 | pot | cái nồi | The soup is in the pot. | 🍲 |
| 7 | pan | cái chảo | Fry the eggs in a pan. | 🍳 |
| 8 | stove | bếp | Turn off the stove. | 🔥 |
| 9 | sink | bồn rửa | Wash the dishes in the sink. | 🚰 |

Beach, 3×2, `beach.png` 900×600. Sentence: "Under the umbrella I sat on the warm sand
in the sun, watching a crab run from a wave and picking up a shell."

| # | word | meaning | example | art emoji |
| --- | --- | --- | --- | --- |
| 1 | sand | cát | The sand is warm. | 🏖️ |
| 2 | wave | sóng | A big wave hit the shore. | 🌊 |
| 3 | shell | vỏ sò | I found a pretty shell. | 🐚 |
| 4 | sun | mặt trời | The sun is very hot today. | ☀️ |
| 5 | crab | con cua | A crab ran across the sand. | 🦀 |
| 6 | umbrella | cái ô | We sat under the umbrella. | ⛱️ |

Classroom, 4×2, `classroom.png` 1200×600. Sentence: "I took a book, a pencil, a ruler
and scissors from my backpack, sat on my chair, spun the globe, and watched the clock."

| # | word | meaning | example | art emoji |
| --- | --- | --- | --- | --- |
| 1 | book | quyển sách | Open your book to page ten. | 📖 |
| 2 | pencil | bút chì | Write with a pencil. | ✏️ |
| 3 | chair | cái ghế | Sit on the chair. | 🪑 |
| 4 | clock | đồng hồ | The clock says nine. | 🕒 |
| 5 | backpack | ba lô | My books are in my backpack. | 🎒 |
| 6 | ruler | cái thước | Draw a line with a ruler. | 📏 |
| 7 | globe | quả địa cầu | Find Vietnam on the globe. | 🌍 |
| 8 | scissors | cái kéo | Cut the paper with scissors. | ✂️ |

## 5. Tile rendering

Both components live in `components/Jigsaw.tsx` and use `tileOf` / `tileRect`. No
per-tile assets, no SVG or image library, no dependence on the image's pixel size (so it
works the same on iOS, Android, web and in Jest; `Image.resolveAssetSource` does not
exist on react-native-web and is not used).

**`<Tile section index size />`** — one tile on a card. With `S = size` and
`{ row, col } = tileOf(index, section.cols)`:

```tsx
<View style={{ width: S, height: S, overflow: 'hidden', borderRadius: 12 }}>
  <Image
    source={section.image}
    resizeMode="stretch"
    style={{ position: 'absolute', width: S * cols, height: S * rows, left: -col * S, top: -row * S }}
  />
</View>
```

The whole picture is scaled so each tile is exactly S×S and shifted so the wanted cell
lands in the clip window.

**`<JigsawGrid section revealed width />`** — the section picture with unlearned
tiles covered. With `W = width`, `tile = W / cols`, `H = tile * rows`:

```tsx
<View style={{ width: W, height: H, borderRadius: 12, overflow: 'hidden' }}>
  <Image source={section.image} resizeMode="stretch" style={{ width: W, height: H }} />
  {section.words.map((w, i) => revealed.includes(w.id) ? null : (
    <View key={w.id} testID="cover"
      style={{ position: 'absolute', left: r.x, top: r.y,
               width: Math.ceil(r.w) + 1, height: Math.ceil(r.h) + 1,
               backgroundColor: colors.cover, borderWidth: StyleSheet.hairlineWidth,
               borderColor: colors.coverBorder }} />
  ))}
</View>
```

One image per grid, covers are plain square Views oversized by one pixel to hide
sub-pixel seams and clipped by the rounded outer box; covers themselves are never
rounded (rounded covers would leak the picture at the corners). `cover` and
`coverBorder` are added to `constants/Colors.ts` for light and dark. The same component
serves the list thumbnail (110), the study mini-grid (≤ 200) and the completion picture
(`screenWidth - 40`, all revealed).

**Swapping in real art:** overwrite `assets/sections/<id>.png` with a picture of the
same shape as the grid, reorder `words` so each sits on the cell it depicts, done. No
code changes. Recommended ≤ 2000 px on the long side.

## 6. Placeholder art script

`scripts/make-placeholder-art.py`, run by hand from the repo root with
`python3 scripts/make-placeholder-art.py`; never part of the build. Requires Python 3
and Pillow. It holds its own small table of the three sections (id, cols, rows, and the
emoji per cell in tile order) and writes the three PNGs using a 300 px tile.

Per picture: a simple scene background made of two or three horizontal colour bands
(kitchen: wall, counter, floor; beach: sky, sea, sand; classroom: wall, board, floor),
then one large emoji centred in each cell at about 55 % of the cell size. Emoji are
rendered with `/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf` at font size 109
(the only size that bitmap font accepts in Pillow, verified on the development machine),
with `embedded_color=True`, onto a transparent sprite that is then resized. No word
labels and no grid lines are drawn; covers supply the grid at runtime.

Fallback: if the emoji font is missing or a glyph fails to render, that cell gets a
pastel fill, a simple shape, and the English word in DejaVu Sans, so the script never
fails on another machine. The generated PNGs are committed, so the app never depends on
Python.

## 7. Study flow

**`components/SwipeCard.tsx`** (modified in place; PanResponder + Animated kept). Props
become `{ children, onSwipeLeft, onSwipeRight, onTap }`; the `text` and `id` props go.
`onPanResponderRelease` has three outcomes: `|dx| < 10 && |dy| < 10` → `onTap()` and
spring back; `dx > 25 % of screen width` → animate off right, then `onSwipeRight()`;
`dx < -25 %` → animate off left, then `onSwipeLeft()`; otherwise spring back. The 10 deg
rotation interpolation, thresholds and durations stay. `position: 'absolute'` is removed
(only one card is ever shown) so the parent's fixed-height container sizes it; the card
is `SCREEN_WIDTH - 40` wide and 360 tall.

**`components/WordCard.tsx`** props `{ section, word, index }`. Local `showBack` state
and one `Animated.Value` for `scaleX`. Tap: timing `1 → 0` (120 ms, native driver), flip
`showBack`, timing `0 → 1`. Front: `<Tile size={140} />` centred, the English word in
large text, "Tap to flip". Back: meaning (large), example in italics, pronunciation in
SpaceMono, "Tap to flip back". No 3D rotation and no `backfaceVisibility`, so the flip
behaves identically on iOS, Android and web.

**Gesture meaning.** Swipe right or "Got it!" (green) = learned:
`progressStore.reveal(section.id, currentId)` then `dispatch({ type: 'right' })`; the
tile appears in the mini-grid at once. Swipe left or "Didn't know" (red) = missed:
`dispatch({ type: 'wrong' })`; the word moves to the end of the queue. The buttons call
the same handlers directly without the fly-off animation. Grading is allowed from either
face.

**`lib/study.ts`** (pure):

```ts
export type StudyState = { queue: string[]; step: number };
export type StudyAction = { type: 'right' } | { type: 'wrong' } | { type: 'restart'; queue: string[] };
export function initStudy(section: Section, revealed: readonly string[]): StudyState;
export function studyReducer(state: StudyState, action: StudyAction): StudyState;
```

`initStudy` queues the ids of words not yet revealed, in section order. `right` drops
`queue[0]`; `wrong` moves `queue[0]` to the end; `restart` replaces the queue. Every
action increments `step`. Done is derived: `queue.length === 0`. The study screen
renders `<SwipeCard key={state.step}>` so every presentation mounts fresh, centred and
unflipped, including the case where the only remaining word is missed and comes straight
back. Queue and flip state are session-only; reopening a section rebuilds the queue from
saved progress, so the learner resumes with just the unlearned words. Opening a fully
learned section shows the completion view immediately.

**Completion view** (inline, same route): full-width `JigsawGrid` with all tiles
revealed, the section sentence in readable text, and two buttons. "Back to sections" →
`router.back()`. "Study again" → `progressStore.resetSection(section.id)` then
`dispatch({ type: 'restart', queue: allWordIds })`, which re-covers the picture.

## 8. Progress persistence

**Dependency.** `@react-native-async-storage/async-storage`, added with
`npx expo install @react-native-async-storage/async-storage` so Expo pins the SDK 52
version (1.23.1 per `expo/bundledNativeModules.json`). It is the only new runtime
dependency. It works on iOS, Android and web (localStorage) and is listed as bundled in
Expo Go for SDK 52 (not launch-verified here; a development build definitely works).

**Stored data.** One key, `jigsaw-progress-v1`, holding JSON
`Record<sectionId, revealedWordId[]>`. Nothing else. The version suffix lets a future
schema start clean.

**`lib/progress.ts`** (pure; the only file that imports AsyncStorage):

```ts
export type Progress = Record<string, string[]>;
export interface ProgressStorage { load(): Promise<string | null>; save(raw: string): Promise<void>; }

export function createProgressStore(storage: ProgressStorage): {
  hydrate(): Promise<void>;                       // one load; failure leaves {}
  getRevealed(sectionId: string): readonly string[]; // stable array or shared EMPTY
  reveal(sectionId: string, wordId: string): void;   // idempotent; notifies; saves
  resetSection(sectionId: string): void;             // removes the key; notifies; saves
  subscribe(listener: () => void): () => void;
};
export const asyncStorageProgress: ProgressStorage;    // AsyncStorage getItem/setItem
export const progressStore = createProgressStore(asyncStorageProgress);
```

Writes are fire-and-forget; errors are swallowed (the data is tiny and the next write
repeats it). Per-section arrays are kept referentially stable so `useSyncExternalStore`
snapshots do not churn. The factory means tests use an in-memory `ProgressStorage` and
never mock the native module.

**`hooks/useRevealed.ts`**: `useRevealed(sectionId)` returns
`useSyncExternalStore(progressStore.subscribe, () => progressStore.getRevealed(sectionId))`.

Word ids that no longer exist in the content are simply never rendered: `isSectionDone`
counts only current words, `initStudy` queues only current unrevealed words, and
`JigsawGrid` only uncovers words it has. Editing content therefore never corrupts state.

## 9. Error handling

| Situation | Behaviour |
| --- | --- |
| Progress read fails at startup | Progress is `{}`; app proceeds |
| Progress write fails | Ignored; next change writes the whole object again |
| Stored JSON is malformed or not an object | Treated as `{}` |
| Content rule broken | Development: one red box listing every problem. CI: the content test fails |
| Unknown `sectionId` in the URL | "Section not found" view with a link home |
| Picture shape does not match the grid | Documented rule; image stretches, alignment still holds |

## 10. Testing

Run once with `npm run test:ci` (new script `"test:ci": "jest"`; the existing `test`
script stays `jest --watchAll`). `npx tsc --noEmit` must stay clean (strict mode).

Pure unit tests (no React Native rendering):

- `lib/__tests__/sections-test.ts`: `tileOf` for indices 0–8 at 3 columns;
  `tileRect(4, 3, 3, 300)` → row 1, col 1, x 100, y 100, 100×100;
  `tileRect(7, 4, 2, 400)` → row 1, col 3, x 300, y 100, 100×100; `validateSections`
  reports word-count mismatch, duplicate word ids, duplicate section ids, zero rows;
  `validateSections(SECTIONS)` on the real content returns `[]` (jest-expo turns PNG
  requires into `1`, so importing the content file is safe).
- `lib/__tests__/study-test.ts`: `initStudy` skips revealed words and keeps order;
  `right` drops the head and bumps `step`; `wrong` moves the head to the tail; `wrong`
  on a one-item queue keeps the queue and bumps `step`; `restart` replaces the queue;
  done when the queue is empty.
- `lib/__tests__/progress-test.ts` with an in-memory `ProgressStorage`: `reveal` twice
  is idempotent; `resetSection` removes the key; `hydrate` reads back what was saved;
  malformed stored JSON yields `{}`; listeners fire once per change; `getRevealed`
  returns the same array reference until the section changes.

Render tests (react-test-renderer, like the existing ThemedText test):

- `components/__tests__/Jigsaw-test.tsx`: `JigsawGrid` for a 3×2 section with 2
  revealed renders exactly 4 nodes with `testID="cover"` at the positions `tileRect`
  gives; `Tile` for index 4 of a 3×3 at size 100 has an Image style of width 300,
  height 300, left -100, top -100.

Manual checks before calling the work done: on a device or simulator and in
`npm run web`: tap flips; a short drag springs back; a drag past a quarter of the width
commits; a missed word returns after the others; the mini-grid uncovers tiles as words
are learned; completion shows the full picture and sentence; "Study again" re-covers the
picture; killing and relaunching the app keeps revealed tiles; the section list shows
updated counts on return.

## 11. Risks and fallbacks

- PanResponder tap-on-release on react-native-web is plausible but unverified; if text
  inside the card gets selected during a drag, add `userSelect: 'none'` to the card.
- `overflow: 'hidden'` with `borderRadius` may not round the corners of the clipped
  tile image on some Android versions; cosmetic only, fallback is to drop the radius on
  the tile.
- `useNativeDriver: true` on react-native-web falls back to the JS driver with a warning
  (already true of the existing SwipeCard).
- Newer emoji in the placeholder art (🪑 chair) may not be in the Noto build on another
  machine; the script's per-cell fallback covers that, and the committed PNGs are what
  the app uses.
- Deleting `app/(tabs)/` removes the prototype's dead code wholesale; git history keeps
  it.
- Typed routes (`.expo/types`) are generated by `expo start`; before the first start,
  `tsc` sees the loose `Href` type. Not a runtime risk.

## 12. Follow-ups (not in this change)

- Separate cleanup commit removing `ParallaxScrollView`, `Collapsible`, `ExternalLink`,
  `HelloWave`, `HapticTab`, `ui/IconSymbol*`, `ui/TabBarBackground*` once nothing
  references them.
- Optional: cover fade animation, shuffle per round, "must flip before Got it", haptics,
  an imperative `swipe(direction)` on SwipeCard so the buttons animate too.
- Owner review of the Vietnamese meanings and English example sentences.
