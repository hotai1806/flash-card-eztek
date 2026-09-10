import React, { createContext, useCallback, useContext, useMemo } from 'react';

import type { Lang } from '@/lib/types';
import { DICTIONARIES, type UIKey } from './translations';

type Params = Record<string, string | number>;

export type Translate = (key: UIKey, params?: Params) => string;

interface I18nValue {
  lang: Lang;
  t: Translate;
  /** Name of a language, written in the current UI language. */
  langName: (lang: Lang) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/** Pure lookup, usable outside React (e.g. in Alert callbacks). */
export function translate(lang: Lang, key: UIKey, params?: Params): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  const template = dict[key] ?? DICTIONARIES.en[key] ?? key;
  return interpolate(template, params);
}

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = useCallback<Translate>((key, params) => translate(lang, key, params), [lang]);
  const langName = useCallback((l: Lang) => translate(lang, `lang_${l}` as UIKey), [lang]);
  const value = useMemo(() => ({ lang, t, langName }), [lang, t, langName]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

export type { UIKey } from './translations';
