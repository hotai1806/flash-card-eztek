// Pure progress store: no imports, no React, no storage library. The storage is
// injected so tests use an in-memory fake and the app uses AsyncStorage (lib/progressStore.ts).

export type Progress = Record<string, string[]>;

export interface ProgressStorage {
  load(): Promise<string | null>;
  save(raw: string): Promise<void>;
}

export type ProgressStore = {
  hydrate(): Promise<void>; // one load; failure or bad JSON leaves {}
  getRevealed(sectionId: string): readonly string[]; // stable array per section, or a shared EMPTY
  reveal(sectionId: string, wordId: string): void; // no-op if already revealed; else notify + save
  resetSection(sectionId: string): void; // no-op if no key; else remove, notify + save
  subscribe(listener: () => void): () => void;
};

const EMPTY: readonly string[] = Object.freeze([]);

function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const progress: Progress = {};
  for (const [sectionId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      progress[sectionId] = value as string[];
    }
  }
  return progress;
}

export function createProgressStore(storage: ProgressStorage): ProgressStore {
  let progress: Progress = {};
  const listeners = new Set<() => void>();

  const commit = (next: Progress) => {
    progress = next;
    listeners.forEach((listener) => listener());
    storage.save(JSON.stringify(progress)).catch(() => {});
  };

  return {
    async hydrate() {
      try {
        progress = parseProgress(await storage.load());
      } catch {
        progress = {};
      }
    },
    getRevealed(sectionId) {
      return progress[sectionId] ?? EMPTY;
    },
    reveal(sectionId, wordId) {
      const current = progress[sectionId] ?? EMPTY;
      if (current.includes(wordId)) return;
      commit({ ...progress, [sectionId]: [...current, wordId] });
    },
    resetSection(sectionId) {
      if (!(sectionId in progress)) return;
      const { [sectionId]: _removed, ...rest } = progress;
      commit(rest);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
