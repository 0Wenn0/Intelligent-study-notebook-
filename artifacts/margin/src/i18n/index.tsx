import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';
export const LANGUAGES: Language[] = ['en', 'es'];
export const LANGUAGE_KEY = 'margin.language';
type Dict = { [k: string]: string | Dict };
const DICTS: Record<Language, Dict> = { en: en as Dict, es: es as Dict };
const LOCALES: Record<Language, string> = { en: 'en-GB', es: 'es-ES' };

function detect(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    /* storage unavailable; fall back to browser language */
  }
  try {
    const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
    return nav.startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

let current: Language = typeof window === 'undefined' ? 'en' : detect();

export function getLanguage(): Language {
  return current;
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Usable outside React. Supports {param} interpolation and _one/_other plurals via params.count. */
export function translate(key: string, params?: Record<string, string | number>, language: Language = current): string {
  const dict = DICTS[language];
  let s: string | undefined;
  if (params && typeof params.count === 'number') {
    s = lookup(dict, `${key}_${params.count === 1 ? 'one' : 'other'}`) ?? lookup(DICTS.en, `${key}_${params.count === 1 ? 'one' : 'other'}`);
  }
  s = s ?? lookup(dict, key) ?? lookup(DICTS.en, key) ?? key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, p: string) => {
      const v = params[p];
      if (v === undefined) return m;
      return typeof v === 'number' ? new Intl.NumberFormat(LOCALES[language]).format(v) : v;
    });
  }
  return s;
}

interface I18nCtx {
  t: (key: string, params?: Record<string, string | number>) => string;
  language: Language;
  setLanguage: (l: Language) => void;
  locale: string;
  formatDate: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  persistFailed: boolean;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(current);
  const [persistFailed, setPersistFailed] = useState(false);
  current = language;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate('app.documentTitle', undefined, language);
  }, [language]);

  const setLanguage = useCallback((l: Language) => {
    current = l;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, l);
      setPersistFailed(false);
    } catch {
      setPersistFailed(true);
    }
    setLang(l);
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const locale = LOCALES[language];
    return {
      language,
      setLanguage,
      locale,
      persistFailed,
      t: (k, p) => translate(k, p, language),
      formatDate: (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(locale, opts).format(new Date(d)),
      formatNumber: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
    };
  }, [language, setLanguage, persistFailed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (c) return c;
  // Fallback for components rendered outside the provider (e.g. top-level error boundary).
  const locale = LOCALES[current];
  return {
    language: current,
    persistFailed: false,
    setLanguage: () => undefined,
    locale,
    t: (k, p) => translate(k, p),
    formatDate: (d, opts) => new Intl.DateTimeFormat(locale, opts).format(new Date(d)),
    formatNumber: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
  };
}
