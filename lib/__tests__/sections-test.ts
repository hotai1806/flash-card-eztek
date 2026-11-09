import {
  countLearned,
  findSection,
  isSectionDone,
  tileOf,
  tileRect,
  validateSections,
  type Section,
} from '../sections';

function makeSection(over: Partial<Section> = {}): Section {
  return {
    id: 'beach',
    name: 'Beach',
    image: 1,
    cols: 3,
    rows: 2,
    sentence: 'x',
    words: ['sand', 'wave', 'shell', 'sun', 'crab', 'umbrella'].map((id) => ({
      id,
      word: id,
      meaning: 'm',
    })),
    ...over,
  };
}

describe('tileOf', () => {
  it('maps indices 0-8 of a 3-column grid to reading order', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => tileOf(i, 3))).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
    ]);
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
    expect(isSectionDone(s, ['sand', 'wave', 'shell', 'sun', 'crab'])).toBe(false);
    expect(isSectionDone(s, ['sand', 'wave', 'shell', 'sun', 'crab', 'umbrella', 'stale'])).toBe(true);
  });
});

describe('validateSections', () => {
  it('accepts a valid section', () => {
    expect(validateSections([makeSection()])).toEqual([]);
  });
  it('reports a word count that does not fill the grid', () => {
    const s = makeSection({ words: makeSection().words.slice(0, 5) });
    expect(validateSections([s])).toEqual(["Section 'Beach' has 5 words but a 3×2 grid needs 6"]);
  });
  it('reports duplicate word ids', () => {
    const w = makeSection().words;
    w[1] = { ...w[1], id: 'sand' };
    expect(validateSections([makeSection({ words: w })])).toContain("Section 'Beach' has duplicate word id 'sand'");
  });
  it('reports an empty word id', () => {
    const w = makeSection().words;
    w[0] = { ...w[0], id: '' };
    expect(validateSections([makeSection({ words: w })])).toContain("Section 'Beach' has a word with an empty id");
  });
  it('reports duplicate section ids', () => {
    expect(validateSections([makeSection(), makeSection()])).toContain("Duplicate section id 'beach'");
  });
  it('reports zero rows and non-integer cols', () => {
    expect(validateSections([makeSection({ rows: 0, words: [] })])).toContain(
      "Section 'Beach' has rows 0; cols and rows must be integers >= 1",
    );
    expect(validateSections([makeSection({ cols: 2.5 })])).toContain(
      "Section 'Beach' has cols 2.5; cols and rows must be integers >= 1",
    );
  });
  it('reports empty text fields and a missing image, labelling by id when the name is empty', () => {
    const errors = validateSections([makeSection({ name: '', sentence: '', image: 0 as never })]);
    expect(errors).toContain("Section 'beach' has an empty name");
    expect(errors).toContain("Section 'beach' has an empty sentence");
    expect(errors).toContain("Section 'beach' has no image");
  });
  it('reports an empty word or meaning', () => {
    const w = makeSection().words;
    w[2] = { ...w[2], word: '', meaning: '' };
    const errors = validateSections([makeSection({ words: w })]);
    expect(errors).toContain("Section 'Beach' word 'shell' has an empty word");
    expect(errors).toContain("Section 'Beach' word 'shell' has an empty meaning");
  });
});
