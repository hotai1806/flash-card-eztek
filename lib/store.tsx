import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SEED_WORDS } from '@/constants/seedCards';
import { imageUrlForCard } from './images';
import { newReviewState, schedule } from './srs';
import { recordReview } from './stats';
import { ALL_MODES, type Card, type Grade, type Lang, type ReviewLog, type Settings } from './types';

const SETTINGS_KEY = 'flashcards.settings.v1';
const CARDS_KEY = 'flashcards.cards.v1';
const LOG_KEY = 'flashcards.log.v1';

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  uiLang: 'en',
  learningLang: 'en',
  mainLang: 'zh',
  autoImage: true,
  imageProvider: 'ai',
  autoTranslate: true,
  newCardsPerSession: 10,
  practiceModes: ['recognition', 'recall', 'listening'],
  dailyGoal: 20,
  speechEnabled: true,
};

export type NewCardInput = {
  word: string;
  lang: Lang;
  translations: Partial<Record<Lang, string>>;
  imageUrl: string | null;
  note?: string;
};

interface StoreValue {
  ready: boolean;
  settings: Settings;
  cards: Card[];
  log: ReviewLog;
  updateSettings: (patch: Partial<Settings>) => void;
  addCard: (input: NewCardInput) => Card;
  addCards: (inputs: NewCardInput[]) => Card[];
  updateCard: (id: string, patch: Partial<Omit<Card, 'id' | 'review'>>) => void;
  deleteCard: (id: string) => void;
  gradeCard: (id: string, grade: Grade, now?: number) => void;
  resetProgress: () => void;
  deleteAllCards: () => void;
  /** Adds the built-in sample words for the current language pair. Returns how many were added. */
  loadSamples: (learningLang?: Lang) => number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...(raw as Partial<Settings>) };
  const modes = Array.isArray(merged.practiceModes)
    ? merged.practiceModes.filter((m) => ALL_MODES.includes(m))
    : [];
  merged.practiceModes = modes.length ? modes : DEFAULT_SETTINGS.practiceModes;
  // Users who saved settings before onboarding existed have clearly used the app.
  if (typeof (raw as Partial<Settings>).onboarded !== 'boolean') merged.onboarded = true;
  return merged;
}

function normalizeCards(raw: unknown): Card[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === 'object' && typeof c.id === 'string' && typeof c.word === 'string')
    .map((c) => ({
      ...c,
      translations: c.translations ?? {},
      imageUrl: c.imageUrl ?? null,
      review: { ...newReviewState(c.createdAt ?? Date.now()), ...(c.review ?? {}) },
    }));
}

function normalizeLog(raw: unknown): ReviewLog {
  if (!raw || typeof raw !== 'object') return {};
  return raw as ReviewLog;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [cards, setCards] = useState<Card[]>([]);
  const [log, setLog] = useState<ReviewLog>({});
  const loadedRef = useRef(false);

  // Load persisted state once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c, l] = await AsyncStorage.multiGet([SETTINGS_KEY, CARDS_KEY, LOG_KEY]);
        if (cancelled) return;
        if (s[1]) setSettings(normalizeSettings(JSON.parse(s[1])));
        if (c[1]) setCards(normalizeCards(JSON.parse(c[1])));
        if (l[1]) setLog(normalizeLog(JSON.parse(l[1])));
      } catch (e) {
        console.warn('Failed to load saved data', e);
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (after the initial load so we never overwrite saved data with defaults).
  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch((e) =>
      console.warn('Failed to save settings', e)
    );
  }, [settings]);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards)).catch((e) =>
      console.warn('Failed to save cards', e)
    );
  }, [cards]);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(LOG_KEY, JSON.stringify(log)).catch((e) => console.warn('Failed to save log', e));
  }, [log]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const buildCard = useCallback((input: NewCardInput, now: number): Card => {
    return {
      id: makeId(),
      lang: input.lang,
      word: input.word.trim(),
      translations: input.translations,
      imageUrl: input.imageUrl,
      note: input.note?.trim() || undefined,
      createdAt: now,
      review: newReviewState(now),
    };
  }, []);

  const addCards = useCallback(
    (inputs: NewCardInput[]) => {
      const now = Date.now();
      // Stagger createdAt so new-card order is stable.
      const created = inputs.map((input, i) => buildCard(input, now + i));
      setCards((prev) => [...prev, ...created]);
      return created;
    },
    [buildCard]
  );

  const addCard = useCallback((input: NewCardInput) => addCards([input])[0], [addCards]);

  const updateCard = useCallback((id: string, patch: Partial<Omit<Card, 'id' | 'review'>>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const gradeCard = useCallback((id: string, grade: Grade, now: number = Date.now()) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, review: schedule(c.review, grade, now) } : c))
    );
    setLog((prev) => recordReview(prev, grade !== 'again', now));
  }, []);

  const resetProgress = useCallback(() => {
    const now = Date.now();
    setCards((prev) => prev.map((c) => ({ ...c, review: newReviewState(now) })));
    setLog({});
  }, []);

  const deleteAllCards = useCallback(() => setCards([]), []);

  const loadSamples = useCallback(
    (learningLangOverride?: Lang) => {
      const { imageProvider, autoImage } = settings;
      const learningLang = learningLangOverride ?? settings.learningLang;
      const existing = new Set(
        cards.filter((c) => c.lang === learningLang).map((c) => c.word.toLowerCase())
      );
      const inputs: NewCardInput[] = SEED_WORDS.filter(
        (w) => !existing.has(w[learningLang].toLowerCase())
      ).map((w) => {
        const translations: Partial<Record<Lang, string>> = { ...w };
        delete translations[learningLang];
        const base = { word: w[learningLang], lang: learningLang, translations };
        return {
          ...base,
          imageUrl: autoImage ? imageUrlForCard(imageProvider, base) : null,
        };
      });
      if (inputs.length) addCards(inputs);
      return inputs.length;
    },
    [settings, cards, addCards]
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      settings,
      cards,
      log,
      updateSettings,
      addCard,
      addCards,
      updateCard,
      deleteCard,
      gradeCard,
      resetProgress,
      deleteAllCards,
      loadSamples,
    }),
    [
      ready,
      settings,
      cards,
      log,
      updateSettings,
      addCard,
      addCards,
      updateCard,
      deleteCard,
      gradeCard,
      resetProgress,
      deleteAllCards,
      loadSamples,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
