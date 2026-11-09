import type { ImageSourcePropType } from 'react-native';

export type Word = {
  id: string; // unique within the section; progress key; never rename
  word: string; // English, card FRONT
  meaning: string; // Vietnamese, card BACK
  example?: string; // short English sentence, card BACK
  pronunciation?: string; // e.g. '/fɔːrk/', card BACK
};

export type Section = {
  id: string; // unique; route param
  name: string;
  image: ImageSourcePropType; // require('@/assets/sections/<id>.png')
  cols: number;
  rows: number; // words.length MUST equal cols * rows
  words: Word[]; // ORDER = tile order, left to right, top to bottom
  sentence: string; // plain text that uses every word; shown on completion
};

export type TileRect = { row: number; col: number; x: number; y: number; w: number; h: number };

export function tileOf(index: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(index / cols), col: index % cols };
}

export function tileRect(index: number, cols: number, rows: number, gridW: number): TileRect {
  void rows; // tiles are square: height follows width
  const tile = gridW / cols;
  const { row, col } = tileOf(index, cols);
  return { row, col, x: col * tile, y: row * tile, w: tile, h: tile };
}

export function findSection(sections: readonly Section[], id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}

export function countLearned(section: Section, revealed: readonly string[]): number {
  const set = new Set(revealed);
  return section.words.filter((w) => set.has(w.id)).length;
}

export function isSectionDone(section: Section, revealed: readonly string[]): boolean {
  return countLearned(section, revealed) === section.words.length;
}

function isPositiveInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 1;
}

export function validateSections(sections: readonly Section[]): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const section of sections) {
    const label = section.name || section.id;
    const at = `Section '${label}'`;

    if (!section.id) problems.push('A section has an empty id');
    else if (seenIds.has(section.id)) problems.push(`Duplicate section id '${section.id}'`);
    else seenIds.add(section.id);

    if (!section.name) problems.push(`${at} has an empty name`);

    const gridValid = isPositiveInteger(section.cols) && isPositiveInteger(section.rows);
    if (!isPositiveInteger(section.cols)) {
      problems.push(`${at} has cols ${section.cols}; cols and rows must be integers >= 1`);
    }
    if (!isPositiveInteger(section.rows)) {
      problems.push(`${at} has rows ${section.rows}; cols and rows must be integers >= 1`);
    }
    if (gridValid && section.words.length !== section.cols * section.rows) {
      problems.push(
        `${at} has ${section.words.length} words but a ${section.cols}×${section.rows} grid needs ${section.cols * section.rows}`,
      );
    }

    const seenWordIds = new Set<string>();
    for (const w of section.words) {
      if (!w.id) problems.push(`${at} has a word with an empty id`);
      else if (seenWordIds.has(w.id)) problems.push(`${at} has duplicate word id '${w.id}'`);
      else seenWordIds.add(w.id);
      if (!w.word) problems.push(`${at} word '${w.id}' has an empty word`);
      if (!w.meaning) problems.push(`${at} word '${w.id}' has an empty meaning`);
    }

    if (!section.sentence) problems.push(`${at} has an empty sentence`);
    if (!section.image) problems.push(`${at} has no image`);
  }

  return problems;
}
