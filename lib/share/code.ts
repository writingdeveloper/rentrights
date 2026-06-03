import { UserAnswers } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';

export interface ShareState {
  address: string;
  answers: UserAnswers;
  locale?: Locale;
}

// Short hash keys ↔ UserAnswers boolean fields.
const ANSWER_KEYS: { param: string; field: keyof UserAnswers }[] = [
  { param: 'b', field: 'builtBeforeOct1978' },
  { param: 's', field: 'isSeparateHouse' },
  { param: 'e', field: 'hasAb1482ExemptionNotice' },
  { param: 'c', field: 'isCondo' },
];

export function encodeShare(s: ShareState): string {
  const params = new URLSearchParams();
  params.set('a', s.address);
  if (s.locale) params.set('lang', s.locale);
  for (const { param, field } of ANSWER_KEYS) {
    const v = s.answers[field];
    if (v !== undefined) params.set(param, v ? '1' : '0');
  }
  return params.toString();
}

export function decodeShare(hash: string): ShareState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const address = params.get('a')?.trim();
  if (!address) return null;

  const answers: UserAnswers = {};
  for (const { param, field } of ANSWER_KEYS) {
    const v = params.get(param);
    if (v === '1') answers[field] = true;
    else if (v === '0') answers[field] = false;
  }

  const lang = params.get('lang');
  const locale: Locale | undefined = lang === 'en' || lang === 'es' ? lang : undefined;

  const out: ShareState = { address, answers };
  if (locale) out.locale = locale;
  return out;
}
