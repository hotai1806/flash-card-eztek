/**
 * Automatic picture generation for a word.
 *
 * Two keyless providers are supported so the app works without any API setup:
 *
 *  - "ai":    Pollinations image generation. The URL itself is the request, so
 *             the picture is generated (and cached by the CDN) when the <Image>
 *             loads it. https://image.pollinations.ai/prompt/<prompt>
 *  - "photo": LoremFlickr, which returns a real photo tagged with the keyword.
 *             https://loremflickr.com/<w>/<h>/<keyword>
 *
 * Both are third-party services; if one goes away, switch the provider in
 * Settings or add another builder below.
 */

import type { Card, Lang } from './types';

export type ImageProvider = 'ai' | 'photo';

export const IMAGE_SIZE = 512;

function seedFor(text: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0) % 100000;
}

/**
 * Build a picture URL for a word. `englishHint` (the English translation, when
 * known) is preferred for the prompt because image models and photo tags work
 * best in English. `variant` lets the user ask for a different picture.
 */
export function buildImageUrl(
  provider: ImageProvider,
  word: string,
  englishHint: string | undefined,
  variant = 0
): string {
  const subject = (englishHint && englishHint.trim()) || word.trim();
  const seed = seedFor(subject.toLowerCase(), variant);

  if (provider === 'photo') {
    const keyword = encodeURIComponent(subject.toLowerCase().replace(/\s+/g, ','));
    return `https://loremflickr.com/${IMAGE_SIZE}/${IMAGE_SIZE}/${keyword}?lock=${seed}`;
  }

  const prompt = encodeURIComponent(
    `A clear, simple illustration of "${subject}" for a language flashcard, centered, plain background`
  );
  return (
    `https://image.pollinations.ai/prompt/${prompt}` +
    `?width=${IMAGE_SIZE}&height=${IMAGE_SIZE}&nologo=true&seed=${seed}`
  );
}

/** Convenience: pick the best prompt text for a card. */
export function imageUrlForCard(
  provider: ImageProvider,
  card: Pick<Card, 'word' | 'lang' | 'translations'>,
  variant = 0
): string {
  const english = card.lang === 'en' ? card.word : card.translations.en;
  return buildImageUrl(provider, card.word, english, variant);
}

export function isEnglish(lang: Lang): boolean {
  return lang === 'en';
}
