import { Locale } from './catalog';

export function pickInitialLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieValue === 'en' || cookieValue === 'es') return cookieValue;
  if (acceptLanguage && /(^|[,\s])es\b/i.test(acceptLanguage)) return 'es';
  return 'en';
}
