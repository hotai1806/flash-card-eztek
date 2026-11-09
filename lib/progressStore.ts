// The only file that imports AsyncStorage. Tests import lib/progress.ts instead.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createProgressStore, type ProgressStorage } from './progress';

const KEY = 'jigsaw-progress-v1';

export const asyncStorageProgress: ProgressStorage = {
  load: () => AsyncStorage.getItem(KEY),
  save: (raw) => AsyncStorage.setItem(KEY, raw),
};

export const progressStore = createProgressStore(asyncStorageProgress);
