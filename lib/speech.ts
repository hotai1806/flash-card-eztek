import * as Speech from 'expo-speech';

import type { Lang } from './types';

const SPEECH_LOCALES: Record<Lang, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  vi: 'vi-VN',
};

/**
 * Read a word aloud with the platform's text-to-speech engine
 * (SpeechSynthesis on web). Fails silently when no voice is available.
 */
export function speak(text: string, lang: Lang): void {
  const t = text.trim();
  if (!t) return;
  try {
    Speech.stop();
    Speech.speak(t, { language: SPEECH_LOCALES[lang], rate: 0.9 });
  } catch (e) {
    console.warn('speech failed', e);
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
