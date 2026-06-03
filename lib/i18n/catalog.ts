import en from '@/messages/en.json';
import es from '@/messages/es.json';

export type Locale = 'en' | 'es';

export const CATALOG: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
};
