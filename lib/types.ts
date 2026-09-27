/**
 * Shared domain types for the flashcard app.
 */

/** Languages the app can show words / translations in. */
export type Lang = 'en' | 'zh' | 'vi';

export const ALL_LANGS: Lang[] = ['en', 'zh', 'vi'];

/** Languages the user interface itself is translated into. */
export const UI_LANGS: Lang[] = ['en', 'zh', 'vi'];

/**
 * How a card is practised in a session.
 *  - recognition: word + picture on the front, meaning on the back
 *  - recall:      picture + meaning on the front, produce the word yourself
 *  - listening:   hear the word, then reveal the card
 */
export type PracticeMode = 'recognition' | 'recall' | 'listening';

export const ALL_MODES: PracticeMode[] = ['recognition', 'recall', 'listening'];

/** Per-card spaced-repetition state (SM-2 style). */
export interface ReviewState {
  /** Number of consecutive successful reviews. */
  repetitions: number;
  /** Current inter-review interval, in days. */
  intervalDays: number;
  /** SM-2 ease factor (>= 1.3). */
  easeFactor: number;
  /** Epoch ms when the card is next due. */
  dueAt: number;
  /** Epoch ms of the last review, or null if never reviewed. */
  lastReviewedAt: number | null;
  /** Total number of reviews. */
  reviewCount: number;
  /** Number of times the user answered "again". */
  lapses: number;
}

export interface Card {
  id: string;
  /** Language of the word on the front. */
  lang: Lang;
  /** The word / phrase on the front. */
  word: string;
  /** Translations keyed by language. Missing keys are simply not translated yet. */
  translations: Partial<Record<Lang, string>>;
  /** URL of the picture shown on the front (may be auto generated). */
  imageUrl: string | null;
  /** Optional example sentence or note (shown on the back). */
  note?: string;
  createdAt: number;
  review: ReviewState;
}

export interface Settings {
  /** Whether the first-run setup has been completed. */
  onboarded: boolean;
  /** Language the UI is displayed in. */
  uiLang: Lang;
  /** Language the user is learning (front of card). */
  learningLang: Lang;
  /** The user's main language (back of card). */
  mainLang: Lang;
  /** Whether to auto generate a picture when a card is created. */
  autoImage: boolean;
  /** Which keyless picture service to use (see lib/images.ts). */
  imageProvider: 'ai' | 'photo';
  /** Whether to auto translate when a card is created. */
  autoTranslate: boolean;
  /** Max new cards introduced per study session. */
  newCardsPerSession: number;
  /** Practice modes that sessions draw from (at least one). */
  practiceModes: PracticeMode[];
  /** Reviews per day the user is aiming for. */
  dailyGoal: number;
  /** Read words aloud with text-to-speech. */
  speechEnabled: boolean;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** One day's activity, keyed by local date "YYYY-MM-DD" in ReviewLog. */
export interface DayLog {
  reviews: number;
  /** Reviews graded hard/good/easy. */
  remembered: number;
}

export type ReviewLog = Record<string, DayLog>;
