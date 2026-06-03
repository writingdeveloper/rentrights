'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CATALOG, Locale } from './catalog';
import { translate } from './t';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {} });

export function LocaleProvider({ initialLocale = 'en', children }: { initialLocale?: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `rr_locale=${l}; path=/; max-age=31536000`;
  }, []);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const { locale } = useContext(LocaleContext);
  return (key: string, params?: Record<string, string | number>) => translate(CATALOG[locale], key, params, CATALOG.en);
}
