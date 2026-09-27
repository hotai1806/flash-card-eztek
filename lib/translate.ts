/**
 * Automatic translation of a word between the supported languages.
 *
 * Uses the free MyMemory translation API (no key required, rate limited per IP;
 * see https://mymemory.translated.net/doc/spec.php). Results are cached in
 * memory for the session. If the request fails the caller falls back to
 * manual entry, so the app keeps working offline.
 */

import type { Lang } from './types';

const MYMEMORY_CODES: Record<Lang, string> = {
  en: 'en',
  zh: 'zh-CN',
  vi: 'vi',
};

const cache = new Map<string, string>();

export class TranslateError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TranslateError('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function translateText(text: string, from: Lang, to: Lang): Promise<string> {
  const q = text.trim();
  if (!q) return '';
  if (from === to) return q;

  const key = `${from}|${to}|${q.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}` +
    `&langpair=${MYMEMORY_CODES[from]}|${MYMEMORY_CODES[to]}`;

  const res = await withTimeout(fetch(url), 10000);
  if (!res.ok) throw new TranslateError(`HTTP ${res.status}`);

  const json = (await res.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
  };
  const status = Number(json.responseStatus);
  const translated = json.responseData?.translatedText?.trim();
  if (status !== 200 || !translated) {
    throw new TranslateError(`bad response (${json.responseStatus})`);
  }
  // MyMemory echoes the input (often upper-cased) when it has no translation.
  if (translated.toLowerCase() === q.toLowerCase() && from !== to) {
    throw new TranslateError('no translation found');
  }

  cache.set(key, translated);
  return translated;
}

/**
 * Translate a word into every other supported language. Failures for a single
 * target are ignored so a partial result is still useful.
 */
export async function translateToAll(
  text: string,
  from: Lang,
  targets: Lang[]
): Promise<Partial<Record<Lang, string>>> {
  const out: Partial<Record<Lang, string>> = {};
  await Promise.all(
    targets
      .filter((t) => t !== from)
      .map(async (t) => {
        try {
          out[t] = await translateText(text, from, t);
        } catch {
          // leave missing
        }
      })
  );
  return out;
}
