# Picture Jigsaw Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the swipe-card prototype with a vocabulary app where each section's big picture is revealed tile by tile as the learner gets words right, with three sample sections and progress that survives restarts.

**Architecture:** Two expo-router screens (section list, study screen with an inline completion view) over pure, unit-tested modules in `lib/` (tile geometry + validation, study queue reducer, progress store). A word's picture is cropped at runtime from the section's single image; the jigsaw is that image with opaque covers over unlearned tiles. The existing PanResponder `SwipeCard` is modified in place; the flip is a 2D squash.

**Tech Stack:** Expo SDK 52, expo-router 4.0.17, React Native 0.76.7, React 18.3.1, TypeScript strict, jest-expo + react-test-renderer, `@react-native-async-storage/async-storage` 1.23.1 (the only new dependency), Python 3 + Pillow for the one-off placeholder art script.

**Spec:** `docs/superpowers/specs/2026-11-06-picture-jigsaw-flashcards-design.md`

## Global Constraints

- Branch: `claude/lucid-goldberg-duwhw3`. Commit after every task; every commit message ends with the two trailer lines `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih`.
- The only new runtime dependency is `@react-native-async-storage/async-storage` at exactly `1.23.1`. No reanimated, gesture-handler, expo-image, react-native-svg or expo-asset usage.
- Files under `lib/` import no React. `lib/progress.ts` has no imports at all. `lib/progressStore.ts` is the only file that imports AsyncStorage, and no test imports it.
- `npx tsc --noEmit` (strict) must exit 0 after every task. `npm run test:ci` must pass after every task from Task 1 on.
- Test files live in `__tests__/` folders next to the code and end in `-test.ts` / `-test.tsx` (the existing convention).
- Tiles are square: `tileRect` uses `gridW / cols` for both width and height; images are drawn with `resizeMode="stretch"`.
- Sample content ids: sections `kitchen`, `beach`, `classroom`; word ids are the lowercase English word. Word order is tile order. `words.length === cols * rows`.
- The `(tabs)` group, the prototype screen and the two starter screens are deleted. Unused starter components (`ParallaxScrollView`, `Collapsible`, `ExternalLink`, `HelloWave`, `HapticTab`, `ui/*`) are NOT deleted in this plan.
- Nothing in this plan adds spaced repetition, shuffling, haptics, animations on reveal, or a tab bar.

## Review Focus

1. Stored progress that is valid JSON but not an object (`[]`, `"x"`, `null`): the app must start with empty progress, not crash. Test in Task 4.
2. Stored progress whose section value is not an array of strings (`{"kitchen":"fork"}`, `{"kitchen":[1,2]}`): that section reads as empty. Test in Task 4.
3. A revealed list containing duplicate ids (`['fork','fork']`): `countLearned` counts each word once and never exceeds `words.length`. Test in Task 1.
4. A section whose `cols` is not an integer (`2.5`): `validateSections` reports it instead of producing fractional tiles. Test in Task 1.
5. A revealed list containing ids the section does not have: `JigsawGrid` still renders one cover per unrevealed word and nothing else. Test in Task 6.

---

### Task 1: Section model, tile geometry, validation

**Files:**
- Create: `lib/sections.ts`
- Create: `lib/__tests__/sections-test.ts`
- Modify: `package.json` (add script `"test:ci": "jest"` next to `"test"`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Word = { id: string; word: string; meaning: string; example?: string; pronunciation?: string }`
  - `type Section = { id: string; name: string; image: ImageSourcePropType; cols: number; rows: number; words: Word[]; sentence: string }`
  - `type TileRect = { row: number; col: number; x: number; y: number; w: number; h: number }`
  - `tileOf(index: number, cols: number): { row: number; col: number }`
  - `tileRect(index: number, cols: number, rows: number, gridW: number): TileRect`
  - `findSection(sections: readonly Section[], id: string): Section | undefined`
  - `countLearned(section: Section, revealed: readonly string[]): number`
  - `isSectionDone(section: Section, revealed: readonly string[]): boolean`
  - `validateSections(sections: readonly Section[]): string[]`

- [ ] **Step 1: Add the `test:ci` script**

In `package.json` scripts add `"test:ci": "jest"` (keep `"test": "jest --watchAll"`).

- [ ] **Step 2: Write the failing tests**

`lib/__tests__/sections-test.ts`. Fixture: `makeSection(over: Partial<Section> = {}): Section` returning `{ id: 'beach', name: 'Beach', image: 1, cols: 3, rows: 2, sentence: 'x', words: ['sand','wave','shell','sun','crab','umbrella'].map(id => ({ id, word: id, meaning: 'm' })), ...over }`.

```ts
describe('tileOf', () => {
  it('maps indices 0-8 of a 3-column grid to reading order', () => {
    expect([0,1,2,3,4,5,6,7,8].map(i => tileOf(i, 3))).toEqual([
      {row:0,col:0},{row:0,col:1},{row:0,col:2},
      {row:1,col:0},{row:1,col:1},{row:1,col:2},
      {row:2,col:0},{row:2,col:1},{row:2,col:2}]);
  });
});
describe('tileRect', () => {
  it('centre tile of a 3x3 at 300 wide', () => {
    expect(tileRect(4, 3, 3, 300)).toEqual({ row: 1, col: 1, x: 100, y: 100, w: 100, h: 100 });
  });
  it('last tile of a 4x2 at 400 wide', () => {
    expect(tileRect(7, 4, 2, 400)).toEqual({ row: 1, col: 3, x: 300, y: 100, w: 100, h: 100 });
  });
});
describe('findSection', () => {
  it('finds by id and returns undefined otherwise', () => {
    const s = makeSection();
    expect(findSection([s], 'beach')).toBe(s);
    expect(findSection([s], 'nope')).toBeUndefined();
    expect(findSection([s], '')).toBeUndefined();
  });
});
describe('countLearned / isSectionDone', () => {
  it('counts only current words, once each', () => {
    const s = makeSection();
    expect(countLearned(s, ['sand', 'stale', 'sand'])).toBe(1);
    expect(isSectionDone(s, ['sand','wave','shell','sun','crab'])).toBe(false);
    expect(isSectionDone(s, ['sand','wave','shell','sun','crab','umbrella','stale'])).toBe(true);
  });
});
describe('validateSections', () => {
  it('accepts a valid section', () => expect(validateSections([makeSection()])).toEqual([]));
  it('reports a word count that does not fill the grid', () => {
    const s = makeSection({ words: makeSection().words.slice(0, 5) });
    expect(validateSections([s])).toEqual(["Section 'Beach' has 5 words but a 3×2 grid needs 6"]);
  });
  it('reports duplicate word ids', () => {
    const w = makeSection().words; w[1] = { ...w[1], id: 'sand' };
    expect(validateSections([makeSection({ words: w })])).toContain("Section 'Beach' has duplicate word id 'sand'");
  });
  it('reports an empty word id', () => {
    const w = makeSection().words; w[0] = { ...w[0], id: '' };
    expect(validateSections([makeSection({ words: w })])).toContain("Section 'Beach' has a word with an empty id");
  });
  it('reports duplicate section ids', () => {
    expect(validateSections([makeSection(), makeSection()])).toContain("Duplicate section id 'beach'");
  });
  it('reports zero rows and non-integer cols', () => {
    expect(validateSections([makeSection({ rows: 0, words: [] })])).toContain("Section 'Beach' has rows 0; cols and rows must be integers >= 1");
    expect(validateSections([makeSection({ cols: 2.5 })])).toContain("Section 'Beach' has cols 2.5; cols and rows must be integers >= 1");
  });
  it('reports empty text fields and a missing image, labelling by id when the name is empty', () => {
    const errors = validateSections([makeSection({ name: '', sentence: '', image: 0 as never })]);
    expect(errors).toContain("Section 'beach' has an empty name");
    expect(errors).toContain("Section 'beach' has an empty sentence");
    expect(errors).toContain("Section 'beach' has no image");
  });
  it('reports an empty word or meaning', () => {
    const w = makeSection().words; w[2] = { ...w[2], word: '', meaning: '' };
    const errors = validateSections([makeSection({ words: w })]);
    expect(errors).toContain("Section 'Beach' word 'shell' has an empty word");
    expect(errors).toContain("Section 'Beach' word 'shell' has an empty meaning");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:ci -- lib/__tests__/sections-test.ts`
Expected: FAIL, cannot find module `../sections`.

- [ ] **Step 4: Implement `lib/sections.ts`**

Export the types and six functions with the signatures in Interfaces. `import type { ImageSourcePropType } from 'react-native'` is the only import. `validateSections` collects every problem into one `string[]`. Every per-section message starts with `Section '<label>'` where `label = section.name || section.id`. Per section, in this order: name empty → `... has an empty name`; cols/rows not a positive integer → `... has cols <v>; cols and rows must be integers >= 1` (same wording with `rows`); word count → `... has <n> words but a <cols>×<rows> grid needs <cols*rows>` (skipped when cols or rows is invalid); empty word id → `... has a word with an empty id`; duplicate word id → `... has duplicate word id '<id>'`; empty `word` / `meaning` → `... word '<id>' has an empty word` / `... word '<id>' has an empty meaning`; sentence empty → `... has an empty sentence`; image falsy → `... has no image`. Across sections, a repeated id → `Duplicate section id '<id>'` (once per repeat); an empty section id → `A section has an empty id`. `countLearned` counts `section.words` whose id is in `revealed` (a `Set` of revealed ids).

- [ ] **Step 5: Run the tests and the type check**

Run: `npm run test:ci` then `npx tsc --noEmit`
Expected: both suites PASS (ThemedText + sections); tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/sections.ts lib/__tests__/sections-test.ts
git commit -m "feat: add section model, tile geometry and content validation" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 2: Study queue reducer

**Files:**
- Create: `lib/study.ts`
- Create: `lib/__tests__/study-test.ts`

**Interfaces:**
- Consumes: `Section` from `lib/sections.ts`.
- Produces:
  - `type StudyState = { queue: string[]; step: number }`
  - `type StudyAction = { type: 'right' } | { type: 'wrong' } | { type: 'restart'; queue: string[] }`
  - `initStudy(section: Section, revealed: readonly string[]): StudyState`
  - `studyReducer(state: StudyState, action: StudyAction): StudyState`

- [ ] **Step 1: Write the failing tests**

Use the same `makeSection` fixture shape as Task 1 (copy the helper; 6 words `sand…umbrella`).

```ts
it('initStudy queues unrevealed words in section order with step 0', () => {
  expect(initStudy(makeSection(), ['wave', 'stale'])).toEqual({ queue: ['sand','shell','sun','crab','umbrella'], step: 0 });
});
it('initStudy with everything revealed yields an empty queue', () => {
  expect(initStudy(makeSection(), ['sand','wave','shell','sun','crab','umbrella']).queue).toEqual([]);
});
it('right drops the head and bumps step', () => {
  expect(studyReducer({ queue: ['a','b'], step: 3 }, { type: 'right' })).toEqual({ queue: ['b'], step: 4 });
});
it('wrong moves the head to the tail and bumps step', () => {
  expect(studyReducer({ queue: ['a','b','c'], step: 0 }, { type: 'wrong' })).toEqual({ queue: ['b','c','a'], step: 1 });
});
it('wrong on a one-item queue keeps the queue and bumps step', () => {
  expect(studyReducer({ queue: ['a'], step: 5 }, { type: 'wrong' })).toEqual({ queue: ['a'], step: 6 });
});
it('restart replaces the queue and bumps step', () => {
  expect(studyReducer({ queue: [], step: 9 }, { type: 'restart', queue: ['a','b'] })).toEqual({ queue: ['a','b'], step: 10 });
});
it('does not mutate the previous state', () => {
  const s = { queue: ['a','b'], step: 0 };
  studyReducer(s, { type: 'wrong' });
  expect(s).toEqual({ queue: ['a','b'], step: 0 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:ci -- lib/__tests__/study-test.ts`
Expected: FAIL, cannot find module `../study`.

- [ ] **Step 3: Implement `lib/study.ts`**

Pure functions per the Interfaces block; return new objects, never mutate. `right`/`wrong` on an empty queue return the same queue with `step + 1`.

- [ ] **Step 4: Run tests and type check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/study.ts lib/__tests__/study-test.ts
git commit -m "feat: add study queue reducer" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 3: Placeholder art script, sample pictures, content file, README

**Files:**
- Create: `scripts/make-placeholder-art.py`
- Create: `assets/sections/kitchen.png`, `assets/sections/beach.png`, `assets/sections/classroom.png` (generated, committed)
- Create: `content/sections.ts`
- Modify: `lib/__tests__/sections-test.ts` (append one describe block)
- Modify: `README.md`

**Interfaces:**
- Consumes: `Section`, `validateSections` from `lib/sections.ts`.
- Produces: `export const SECTIONS: Section[]` from `content/sections.ts` with ids `kitchen`, `beach`, `classroom` in that order.

- [ ] **Step 1: Write the failing content test**

Append to `lib/__tests__/sections-test.ts`:

```ts
import { SECTIONS } from '@/content/sections';
describe('shipped content', () => {
  it('validates cleanly', () => expect(validateSections(SECTIONS)).toEqual([]));
  it('has the three sample sections in order with full grids', () => {
    expect(SECTIONS.map(s => s.id)).toEqual(['kitchen', 'beach', 'classroom']);
    expect(SECTIONS.map(s => [s.cols, s.rows, s.words.length])).toEqual([[3,3,9],[3,2,6],[4,2,8]]);
  });
  it('uses every word in its sentence', () => {
    for (const s of SECTIONS) for (const w of s.words) expect(s.sentence.toLowerCase()).toContain(w.word);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:ci -- lib/__tests__/sections-test.ts`
Expected: FAIL, cannot find module `@/content/sections`.

- [ ] **Step 3: Write `scripts/make-placeholder-art.py`**

Standard library + Pillow only; no arguments; run from the repo root; writes `assets/sections/<id>.png`. Constants: `TILE = 300`, `EMOJI_FONT = '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'` (loaded with `ImageFont.truetype(EMOJI_FONT, 109)` inside a `try`), `TEXT_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'`. A `SECTIONS` list of dicts `{id, cols, rows, bands, cells}` where `bands` is a list of 2–3 hex colours painted as equal horizontal stripes top to bottom and `cells` is the `(word, emoji)` list in tile order, exactly:

| id | cols×rows | bands (top→bottom) | cells |
| --- | --- | --- | --- |
| kitchen | 3×3 | `#f6e7c1` wall, `#c9a27e` counter, `#8d6e63` floor | fork 🍴, spoon 🥄, knife 🔪, plate 🍽️, cup ☕, pot 🍲, pan 🍳, stove 🔥, sink 🚰 |
| beach | 3×2 | `#bfe3ff` sky, `#5aa9e6` sea, `#f3dba5` sand | sand 🏖️, wave 🌊, shell 🐚, sun ☀️, crab 🦀, umbrella ⛱️ |
| classroom | 4×2 | `#e8f1e4` wall, `#2f5d50` board, `#c8b08a` floor | book 📖, pencil ✏️, chair 🪑, clock 🕒, backpack 🎒, ruler 📏, globe 🌍, scissors ✂️ |

Per cell: render the emoji with `draw.text((0, 0), emoji, font=emoji_font, embedded_color=True)` onto a transparent `RGBA` sprite sized to the glyph's bbox, resize it so its larger side is `round(TILE * 0.55)`, and alpha-composite it centred in the cell. Fallback (emoji font failed to load, the glyph raised, or the rendered sprite's bbox is empty): fill the cell with a pastel from a fixed 8-colour list indexed by cell number, draw a centred circle of diameter `round(TILE * 0.55)` in a darker shade, and draw the word centred in DejaVu Sans Bold at size 40. No grid lines, no labels otherwise. Print one line per file written with its size.

- [ ] **Step 4: Generate the pictures and verify their dimensions**

Run: `python3 scripts/make-placeholder-art.py`
Then: `python3 -I -c "from PIL import Image; [print(n, Image.open(f'assets/sections/{n}.png').size) for n in ('kitchen','beach','classroom')]"`
Expected: `kitchen (900, 900)`, `beach (900, 600)`, `classroom (1200, 600)`. Open each PNG (Read tool) and confirm emoji, not fallback shapes, are visible.

- [ ] **Step 5: Write `content/sections.ts`**

`export const SECTIONS: Section[]` with the three sections. `image: require('@/assets/sections/<id>.png')`. Words in table order, `id` = `word` = the lowercase English word; `meaning`, `example` exactly as in spec section 4; `pronunciation` values: fork `/fɔːrk/`, spoon `/spuːn/`, knife `/naɪf/`, plate `/pleɪt/`, cup `/kʌp/`, pot `/pɒt/`, pan `/pæn/`, stove `/stoʊv/`, sink `/sɪŋk/`, sand `/sænd/`, wave `/weɪv/`, shell `/ʃel/`, sun `/sʌn/`, crab `/kræb/`, umbrella `/ʌmˈbrelə/`, book `/bʊk/`, pencil `/ˈpensəl/`, chair `/tʃeər/`, clock `/klɒk/`, backpack `/ˈbækpæk/`, ruler `/ˈruːlər/`, globe `/ɡloʊb/`, scissors `/ˈsɪzərz/`. Sentences verbatim from spec section 4. A comment header above the array states the four editing rules from spec section 4 and that Vietnamese meanings should be reviewed by a native speaker.

- [ ] **Step 6: Run tests and type check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS including the three `shipped content` tests; tsc exits 0.

- [ ] **Step 7: Rewrite `README.md`**

Keep the title line and the "Get started" steps (install, `npx expo start`) from the current file. Delete everything after them and add two sections. "Editing content": the four rules (word count = cols × rows; word order = tile order top-left first; picture shape = cols : rows, e.g. 900×900 for 3×3 and 1200×600 for 4×2, ≤ 2000 px on the long side; ids unique, lowercase, never renamed), how to add or replace a section (one entry in `content/sections.ts` plus one PNG in `assets/sections/`), how to swap in real art (overwrite the PNG, reorder `words` to match the cells), and `python3 scripts/make-placeholder-art.py` (needs Python 3 and Pillow) to regenerate placeholders. "Checks": `npm run test:ci` and `npx tsc --noEmit` confirm a content edit is valid; a broken rule also shows a red error box in development.

- [ ] **Step 8: Commit**

```bash
git add scripts/make-placeholder-art.py assets/sections content/sections.ts lib/__tests__/sections-test.ts README.md
git commit -m "feat: add sample sections, placeholder art script and content guide" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 4: Progress store (pure)

**Files:**
- Create: `lib/progress.ts`
- Create: `lib/__tests__/progress-test.ts`

**Interfaces:**
- Consumes: nothing (this file has no imports).
- Produces:
  - `type Progress = Record<string, string[]>`
  - `interface ProgressStorage { load(): Promise<string | null>; save(raw: string): Promise<void> }`
  - `type ProgressStore = { hydrate(): Promise<void>; getRevealed(sectionId: string): readonly string[]; reveal(sectionId: string, wordId: string): void; resetSection(sectionId: string): void; subscribe(listener: () => void): () => void }`
  - `createProgressStore(storage: ProgressStorage): ProgressStore`

- [ ] **Step 1: Write the failing tests**

Helper, defined at the top of the test file:

```ts
function memoryStorage(initial: string | null = null) {
  const box = { raw: initial };
  return {
    box,
    load: jest.fn(async () => box.raw),
    save: jest.fn(async (r: string) => { box.raw = r; }),
  };
}
```

```ts
it('starts empty and returns the same EMPTY array for unknown sections', async () => {
  const store = createProgressStore(memoryStorage());
  await store.hydrate();
  expect(store.getRevealed('kitchen')).toEqual([]);
  expect(store.getRevealed('kitchen')).toBe(store.getRevealed('beach'));
});
it('reveal adds an id, notifies once, and saves JSON under the data shape', async () => {
  const s = memoryStorage(); const store = createProgressStore(s); await store.hydrate();
  const listener = jest.fn(); store.subscribe(listener);
  store.reveal('kitchen', 'fork');
  expect(store.getRevealed('kitchen')).toEqual(['fork']);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(JSON.parse(s.box.raw!)).toEqual({ kitchen: ['fork'] });
});
it('a second reveal of the same id is a no-op', async () => {
  const s = memoryStorage(); const store = createProgressStore(s); await store.hydrate();
  store.reveal('kitchen', 'fork');
  const before = store.getRevealed('kitchen'); const saves = s.save.mock.calls.length;
  const listener = jest.fn(); store.subscribe(listener);
  store.reveal('kitchen', 'fork');
  expect(store.getRevealed('kitchen')).toBe(before);
  expect(listener).not.toHaveBeenCalled();
  expect(s.save.mock.calls.length).toBe(saves);
});
it('keeps array references stable per section until that section changes', async () => {
  const store = createProgressStore(memoryStorage()); await store.hydrate();
  store.reveal('kitchen', 'fork'); store.reveal('beach', 'sand');
  const k = store.getRevealed('kitchen');
  store.reveal('beach', 'wave');
  expect(store.getRevealed('kitchen')).toBe(k);
});
it('resetSection removes the key, notifies and saves; no-op when absent', async () => {
  const s = memoryStorage(); const store = createProgressStore(s); await store.hydrate();
  store.reveal('kitchen', 'fork');
  const listener = jest.fn(); store.subscribe(listener);
  store.resetSection('kitchen');
  expect(store.getRevealed('kitchen')).toEqual([]);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(JSON.parse(s.box.raw!)).toEqual({});
  store.resetSection('kitchen');
  expect(listener).toHaveBeenCalledTimes(1);
});
it('hydrate reads back what was saved', async () => {
  const store = createProgressStore(memoryStorage('{"kitchen":["fork","spoon"]}')); await store.hydrate();
  expect(store.getRevealed('kitchen')).toEqual(['fork', 'spoon']);
});
it.each(['not json', '[]', '"x"', 'null', '{"kitchen":"fork"}', '{"kitchen":[1,2]}'])('treats %s as empty', async (raw) => {
  const store = createProgressStore(memoryStorage(raw)); await store.hydrate();
  expect(store.getRevealed('kitchen')).toEqual([]);
});
it('survives a failing load and a failing save', async () => {
  const store = createProgressStore({ load: async () => { throw new Error('x'); }, save: async () => { throw new Error('y'); } });
  await expect(store.hydrate()).resolves.toBeUndefined();
  expect(() => store.reveal('kitchen', 'fork')).not.toThrow();
  await Promise.resolve();
  expect(store.getRevealed('kitchen')).toEqual(['fork']);
});
it('unsubscribe stops notifications', async () => {
  const store = createProgressStore(memoryStorage()); await store.hydrate();
  const listener = jest.fn(); const off = store.subscribe(listener); off();
  store.reveal('kitchen', 'fork');
  expect(listener).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:ci -- lib/__tests__/progress-test.ts`
Expected: FAIL, cannot find module `../progress`.

- [ ] **Step 3: Implement `lib/progress.ts`**

Closure over `let progress: Progress = {}`, a `Set` of listeners and a frozen shared `EMPTY: readonly string[]`. `hydrate` parses in a `try`; keeps only entries whose value is an array of strings (other values and non-object roots give `{}`). `reveal` builds `{ ...progress, [sectionId]: [...prev, wordId] }` only when `wordId` is absent, then notifies every listener and calls `storage.save(JSON.stringify(progress)).catch(() => {})`. `resetSection` copies without the key when present. `getRevealed` returns `progress[sectionId] ?? EMPTY`.

- [ ] **Step 4: Run tests and type check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/progress.ts lib/__tests__/progress-test.ts
git commit -m "feat: add pure progress store" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 5: AsyncStorage adapter, singleton and hook

**Files:**
- Modify: `package.json`, `package-lock.json` (dependency)
- Create: `lib/progressStore.ts`
- Create: `hooks/useRevealed.ts`

**Interfaces:**
- Consumes: `createProgressStore`, `ProgressStorage` from `lib/progress.ts`.
- Produces:
  - `export const asyncStorageProgress: ProgressStorage` and `export const progressStore: ProgressStore` from `lib/progressStore.ts`
  - `useRevealed(sectionId: string): readonly string[]` from `hooks/useRevealed.ts`

- [ ] **Step 1: Install the dependency**

Run: `npx expo install @react-native-async-storage/async-storage`
If that fails for network reasons (the Expo versions API is unreachable in some environments), run instead: `npm install --save-exact @react-native-async-storage/async-storage@1.23.1`
Verify: `grep async-storage package.json` shows `1.23.1` (a `^1.23.1` range from expo install is acceptable).

- [ ] **Step 2: Create `lib/progressStore.ts`**

`import AsyncStorage from '@react-native-async-storage/async-storage'`; `const KEY = 'jigsaw-progress-v1'`; `asyncStorageProgress = { load: () => AsyncStorage.getItem(KEY), save: (raw) => AsyncStorage.setItem(KEY, raw) }`; `progressStore = createProgressStore(asyncStorageProgress)`.

- [ ] **Step 3: Create `hooks/useRevealed.ts`**

`useRevealed(sectionId)` returns `useSyncExternalStore(progressStore.subscribe, () => progressStore.getRevealed(sectionId))` (import `useSyncExternalStore` from `react`).

- [ ] **Step 4: Verify tests still pass without touching the adapter, and the types check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS with the same suites as before (no suite imports `lib/progressStore.ts`); tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/progressStore.ts hooks/useRevealed.ts
git commit -m "feat: persist progress with AsyncStorage" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 6: Jigsaw components and cover colours

**Files:**
- Modify: `constants/Colors.ts`
- Create: `components/Jigsaw.tsx`
- Create: `components/__tests__/Jigsaw-test.tsx`

**Interfaces:**
- Consumes: `Section`, `tileOf`, `tileRect` from `lib/sections.ts`; `useThemeColor` from `hooks/useThemeColor.ts`.
- Produces:
  - `Tile(props: { section: Section; index: number; size: number }): JSX.Element`
  - `JigsawGrid(props: { section: Section; revealed: readonly string[]; width: number }): JSX.Element`

- [ ] **Step 1: Add colour tokens**

In `constants/Colors.ts` add `cover` and `coverBorder` to both maps: light `cover: '#d9dde3'`, `coverBorder: '#ffffff'`; dark `cover: '#2b2f33'`, `coverBorder: '#3d4248'`.

- [ ] **Step 2: Write the failing tests**

Fixture: `grid32` = a `Section` with `id: 'g'`, `cols: 3`, `rows: 2`, `image: 1`, words `w0…w5`; `grid33` the same with `cols: 3`, `rows: 3`, words `w0…w8`.

```ts
const hostCovers = (root: ReactTestInstance) =>
  root.findAll(n => typeof n.type === 'string' && n.props.testID === 'cover');

it('JigsawGrid covers exactly the unrevealed words at tileRect positions', () => {
  const tree = renderer.create(<JigsawGrid section={grid32} revealed={['w0', 'w4', 'ghost']} width={300} />);
  const covers = hostCovers(tree.root);
  expect(covers).toHaveLength(4);
  expect(covers.map(c => { const s = StyleSheet.flatten(c.props.style); return [s.left, s.top]; }))
    .toEqual([[100, 0], [200, 0], [0, 100], [200, 100]]);
  const s = StyleSheet.flatten(covers[0].props.style);
  expect([s.width, s.height]).toEqual([101, 101]);
});
it('JigsawGrid with everything revealed has no covers and sizes the image to the grid', () => {
  const tree = renderer.create(<JigsawGrid section={grid32} revealed={['w0','w1','w2','w3','w4','w5']} width={300} />);
  expect(hostCovers(tree.root)).toHaveLength(0);
  const img = tree.root.findAll(n => typeof n.type === 'string' && n.type === 'Image')[0];
  expect(StyleSheet.flatten(img.props.style)).toMatchObject({ width: 300, height: 200 });
});
it('Tile crops the centre cell of a 3x3', () => {
  const tree = renderer.create(<Tile section={grid33} index={4} size={100} />);
  const img = tree.root.findAll(n => typeof n.type === 'string' && n.type === 'Image')[0];
  expect(StyleSheet.flatten(img.props.style)).toMatchObject({ width: 300, height: 300, left: -100, top: -100 });
  expect(img.props.resizeMode).toBe('stretch');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:ci -- components/__tests__/Jigsaw-test.tsx`
Expected: FAIL, cannot find module `../Jigsaw`.

- [ ] **Step 4: Implement `components/Jigsaw.tsx`**

Two named exports per spec section 5. `Tile`: outer `View` `{ width: S, height: S, overflow: 'hidden', borderRadius: 12 }` containing one `Image` with `resizeMode="stretch"` and style `{ position: 'absolute', width: S * cols, height: S * rows, left: -col * S, top: -row * S }`. `JigsawGrid`: `tile = width / cols`, `H = tile * rows`; outer `View` `{ width, height: H, borderRadius: 12, overflow: 'hidden' }`; one `Image` `{ width, height: H }` with `resizeMode="stretch"`; for each word not in `revealed` (use a `Set`), a `View` with `testID="cover"` at `tileRect(i, cols, rows, width)` with `width: Math.ceil(r.w) + 1`, `height: Math.ceil(r.h) + 1`, `backgroundColor` from `useThemeColor({}, 'cover')`, `borderWidth: StyleSheet.hairlineWidth`, `borderColor` from `useThemeColor({}, 'coverBorder')`. Covers have no border radius.

- [ ] **Step 5: Run tests and type check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add constants/Colors.ts components/Jigsaw.tsx components/__tests__/Jigsaw-test.tsx
git commit -m "feat: add Tile and JigsawGrid components" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 7: SwipeCard changes and WordCard

**Files:**
- Modify: `components/SwipeCard.tsx`
- Create: `components/WordCard.tsx`
- Create: `components/__tests__/WordCard-test.tsx`
- Create: `components/__tests__/SwipeCard-test.tsx`

**Interfaces:**
- Consumes: `Tile` from `components/Jigsaw.tsx`; `Section`, `Word` from `lib/sections.ts`.
- Produces:
  - `SwipeCard(props: { children: React.ReactNode; onSwipeLeft?: () => void; onSwipeRight?: () => void; onTap?: () => void }): JSX.Element` (default export, as today)
  - `type WordCardHandle = { flip: () => void }`
  - `WordCard`: `forwardRef<WordCardHandle, { section: Section; word: Word; index: number }>` (default export)

- [ ] **Step 1: Write the failing tests**

`components/__tests__/WordCard-test.tsx` (fixture `grid33` as in Task 6, word = `grid33.words[4]` with `word: 'cup'`, `meaning: 'cái cốc'`, `example: 'A cup of hot tea.'`, `pronunciation: '/kʌp/'`):

```ts
const text = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());
it('shows the tile, the word and the hint on the front', () => {
  const tree = renderer.create(<WordCard section={grid33} word={word} index={4} />);
  expect(text(tree)).toContain('cup');
  expect(text(tree)).toContain('Tap to flip');
  expect(text(tree)).not.toContain('cái cốc');
});
it('flip() shows the back after the squash, and flipping back restores the front', () => {
  jest.useFakeTimers();
  const ref = React.createRef<WordCardHandle>();
  const tree = renderer.create(<WordCard ref={ref} section={grid33} word={word} index={4} />);
  act(() => { ref.current!.flip(); });
  act(() => { jest.advanceTimersByTime(300); });
  expect(text(tree)).toContain('cái cốc');
  expect(text(tree)).toContain('A cup of hot tea.');
  expect(text(tree)).toContain('/kʌp/');
  expect(text(tree)).toContain('Tap to flip back');
  act(() => { ref.current!.flip(); });
  act(() => { jest.advanceTimersByTime(300); });
  expect(text(tree)).not.toContain('cái cốc');
});
it('a flip() during the animation is ignored', () => {
  jest.useFakeTimers();
  const ref = React.createRef<WordCardHandle>();
  const tree = renderer.create(<WordCard ref={ref} section={grid33} word={word} index={4} />);
  act(() => { ref.current!.flip(); ref.current!.flip(); });
  act(() => { jest.advanceTimersByTime(300); });
  expect(text(tree)).toContain('cái cốc');
});
```

`components/__tests__/SwipeCard-test.tsx`:

```ts
it('renders its children', () => {
  const tree = renderer.create(<SwipeCard><Text>inner</Text></SwipeCard>);
  expect(JSON.stringify(tree.toJSON())).toContain('inner');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:ci -- components/__tests__/WordCard-test.tsx components/__tests__/SwipeCard-test.tsx`
Expected: WordCard suite FAILS (module missing); SwipeCard suite FAILS on types/props (`children` is not a prop yet) or renders without children.

- [ ] **Step 3: Modify `components/SwipeCard.tsx`**

Change exactly: (a) props become `{ children, onSwipeLeft?, onSwipeRight?, onTap? }`; remove `text` and the `id={text}` attribute; render `{children}` in place of the `<Text>`. (b) In `onPanResponderRelease`, first check `Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10` → call `onTap?.()` then `resetPosition()`; the existing right/left/reset branches follow. (c) In `swipeOffScreen`'s completion callback, delete the `position.setValue({ x: 0, y: 0 })` line. (d) In `styles.card` remove `position: 'absolute'` and change `height: 300` to `height: 360`. Everything else (threshold 25 % of width, 250 ms fly-off, ±10° rotation, spring reset, native driver, shadow) stays.

- [ ] **Step 4: Implement `components/WordCard.tsx`**

`forwardRef` with `useImperativeHandle(ref, () => ({ flip }))`. State `showBack` (boolean), `scaleX = useRef(new Animated.Value(1)).current`, `animating = useRef(false)`. `flip`: if `animating.current` return; set it true; `Animated.timing(scaleX, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => { setShowBack(b => !b); Animated.timing(scaleX, { toValue: 1, duration: 120, useNativeDriver: true }).start(() => { animating.current = false; }); })`. Render one `Animated.View` filling the card (`flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`, `padding: 20`, `transform: [{ scaleX }]`). Front: `<Tile section index size={140} />`, the word at fontSize 28 bold, hint "Tap to flip" at 14 in `#999` positioned at the bottom. Back: meaning at 26 bold, example at 16 italic (when present), pronunciation at 16 in `fontFamily: 'SpaceMono'` (when present), hint "Tap to flip back".

- [ ] **Step 5: Run tests and type check**

Run: `npm run test:ci` and `npx tsc --noEmit`
Expected: PASS (ThemedText, sections, study, progress, Jigsaw, WordCard, SwipeCard); tsc exits 0. Note: `app/(tabs)/index.tsx` still passes `text=` to SwipeCard, so tsc will fail here. Fix by changing that one call site to `<SwipeCard ...><Text>{cards1[cardIndex]}</Text></SwipeCard>` (the file is deleted in Task 8).

- [ ] **Step 6: Commit**

```bash
git add components/SwipeCard.tsx components/WordCard.tsx components/__tests__/WordCard-test.tsx components/__tests__/SwipeCard-test.tsx "app/(tabs)/index.tsx"
git commit -m "feat: add WordCard with squash flip and make SwipeCard composable" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 8: Root layout, section list, delete the tabs group

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/index.tsx`
- Delete: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/indexcopy.tsx`

**Interfaces:**
- Consumes: `SECTIONS` from `content/sections.ts`; `validateSections`, `countLearned`, `isSectionDone` from `lib/sections.ts`; `progressStore` from `lib/progressStore.ts`; `useRevealed` from `hooks/useRevealed.ts`; `JigsawGrid` from `components/Jigsaw.tsx`.
- Produces: route `/` (section list). Rows link to `/study/[sectionId]`, which Task 9 creates.

- [ ] **Step 1: Delete the tabs group**

```bash
git rm -r "app/(tabs)"
```

- [ ] **Step 2: Modify `app/_layout.tsx`**

Keep fonts, `ThemeProvider`, `StatusBar`, `SplashScreen.preventAutoHideAsync()`. Add at module scope:

```ts
if (__DEV__) {
  const problems = validateSections(SECTIONS);
  if (problems.length) throw new Error(problems.join('\n'));
}
```

In the component add `const [ready, setReady] = useState(false)`; `useEffect(() => { progressStore.hydrate().finally(() => setReady(true)); }, [])`; change the splash effect to hide when `loaded && ready` and the gate to `if (!loaded || !ready) return null`. Replace the `(tabs)` screen with `<Stack.Screen name="index" options={{ title: 'Sections' }} />`; keep `+not-found`.

- [ ] **Step 3: Create `app/index.tsx`**

Default export `SectionsScreen`: a `FlatList` over `SECTIONS` (`keyExtractor` = id, `contentContainerStyle` padding 20, gap 12) rendering `<SectionRow section={item} />`. `SectionRow` (same file): `const revealed = useRevealed(section.id)`; `k = countLearned(section, revealed)`, `n = section.words.length`; `<Link href={{ pathname: '/study/[sectionId]', params: { sectionId: section.id } }} asChild>` around a `Pressable` row (flexDirection row, gap 14, padding 12, radius 12, background from `useThemeColor({}, 'background')`, hairline border) containing `<JigsawGrid section={section} revealed={revealed} width={110} />`, then a column with the name (18, `fontWeight: '600'`), `${k} / ${n} learned` (14, `#888`), and when `isSectionDone(section, revealed)` a pill `Complete` (12, white on `#4caf50`, radius 10, paddingHorizontal 8). Use `ThemedText`/`ThemedView` for text and the row background. If the object href fails to type-check, use the template string `` `/study/${section.id}` ``.

- [ ] **Step 4: Run the type check and tests, then export the web build**

Run: `npx tsc --noEmit` and `npm run test:ci`
Expected: tsc exits 0; all suites PASS.
Run: `CI=1 npx expo export --platform web --output-dir /tmp/claude-0/-home-user-flash-card-eztek/6814d999-e6cb-562d-991a-442994fdcfc7/scratchpad/export-check`
Expected: exits 0 and the "Static routes" list contains `/ (index)` and `/+not-found` and no `(tabs)`, `/explore` or `/indexcopy` entries.

- [ ] **Step 5: Commit**

```bash
git add -A app
git commit -m "feat: add section list and replace the tabs group with a stack" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 9: Study screen with inline completion

**Files:**
- Create: `app/study/[sectionId].tsx`
- Modify: `app/_layout.tsx` (add one `Stack.Screen`)

**Interfaces:**
- Consumes: `SECTIONS`; `findSection`, `countLearned`; `initStudy`, `studyReducer`; `progressStore`; `useRevealed`; `JigsawGrid`; `SwipeCard`; `WordCard`, `WordCardHandle`.
- Produces: route `/study/[sectionId]`.

- [ ] **Step 1: Register the screen in the root layout**

Add `<Stack.Screen name="study/[sectionId]" />` after the `index` screen.

- [ ] **Step 2: Create `app/study/[sectionId].tsx`**

Default export `StudyScreen`: `const { sectionId } = useLocalSearchParams<{ sectionId: string }>()`; `const section = findSection(SECTIONS, String(sectionId ?? ''))`; if undefined render `<Stack.Screen options={{ title: 'Not found' }} />` plus a centred `ThemedView` with `ThemedText` "Section not found" and `<Link href="/">Back to sections</Link>` (mirror `+not-found.tsx`); else `<StudySession section={section} />`.

`StudySession` (same file, props `{ section: Section }`):
- `const revealed = useRevealed(section.id)`; `const [state, dispatch] = useReducer(studyReducer, undefined, () => initStudy(section, revealed))`; `const cardRef = useRef<WordCardHandle>(null)`; `const { width } = useWindowDimensions()`; `const currentId = state.queue[0]`; `const index = section.words.findIndex(w => w.id === currentId)`; `const word = section.words[index]`.
- Handlers: `onRight = () => { progressStore.reveal(section.id, currentId); dispatch({ type: 'right' }); }`; `onWrong = () => dispatch({ type: 'wrong' })`; `onRestart = () => { progressStore.resetSection(section.id); dispatch({ type: 'restart', queue: section.words.map(w => w.id) }); }`.
- Always render `<Stack.Screen options={{ title: section.name }} />`.
- When `state.queue.length === 0` render the completion view: `<JigsawGrid section revealed={section.words.map(w => w.id)} width={width - 40} />`, the sentence (`fontSize: 18`, `lineHeight: 26`, centred, margin 20), and two buttons: "Study again" (`#2196F3`) → `onRestart`; "Back to sections" (`#666`) → `router.back()`.
- Otherwise render, in a `SafeAreaView`/`ThemedView` column with padding 20: `<JigsawGrid section revealed width={Math.min(width - 40, 200)} />` centred; `${countLearned(section, revealed)} / ${section.words.length} learned` (14, `#888`); a `View` of `height: 360`, `alignItems: 'center'` containing `<SwipeCard key={state.step} onSwipeRight={onRight} onSwipeLeft={onWrong} onTap={() => cardRef.current?.flip()}><WordCard ref={cardRef} section={section} word={word} index={index} /></SwipeCard>`; then a row with "Didn't know" (`#ff6b6b`) → `onWrong` and "Got it!" (`#4caf50`) → `onRight`, each 48 % wide, padding 15, radius 8, white bold 16 text (the prototype's button styles).

- [ ] **Step 3: Type check, tests, web export**

Run: `npx tsc --noEmit` and `npm run test:ci`
Expected: tsc exits 0; all suites PASS.
Run: `CI=1 npx expo export --platform web --output-dir /tmp/claude-0/-home-user-flash-card-eztek/6814d999-e6cb-562d-991a-442994fdcfc7/scratchpad/export-check`
Expected: exits 0; the "Static routes" list includes `/study/[sectionId]`.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx "app/study/[sectionId].tsx"
git commit -m "feat: add study screen with jigsaw progress and completion view" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_014w5JyV5gbMbwSVf3tk15ih"
```

---

### Task 10: Final verification and push

**Files:** none new.

- [ ] **Step 1: Full checks from a clean tree**

Run: `git status --short` (expect empty), `npx tsc --noEmit`, `npm run test:ci`, and the web export command from Task 9.
Expected: all green; the export lists exactly `/ (index)`, `/study/[sectionId]`, `/_sitemap`, `/+not-found`.

- [ ] **Step 2: Manual checks on a device, simulator, or `npm run web`**

Confirm each of: tap flips the card; a short drag springs back; a drag past a quarter of the width commits; "Didn't know" brings the word back after the others; the mini-grid uncovers a tile on "Got it!"; completion shows the full picture and the sentence; "Study again" re-covers the picture and restarts with all words; kill and relaunch keeps revealed tiles; the section list shows updated counts and the Complete badge on return. Record any failure as a follow-up rather than marking this task done.

- [ ] **Step 3: Push**

```bash
git push -u origin claude/lucid-goldberg-duwhw3
```
