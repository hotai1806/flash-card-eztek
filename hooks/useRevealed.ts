import { useSyncExternalStore } from 'react';

import { progressStore } from '@/lib/progressStore';

export function useRevealed(sectionId: string): readonly string[] {
  return useSyncExternalStore(progressStore.subscribe, () => progressStore.getRevealed(sectionId));
}
