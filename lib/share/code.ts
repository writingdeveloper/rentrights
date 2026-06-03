import { UserAnswers, QuestionId } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';

export interface ShareState {
  address: string;
  answers: UserAnswers;
  locale?: Locale;
}

type BooleanAnswerField = { [K in keyof UserAnswers]-?: NonNullable<UserAnswers[K]> extends boolean ? K : never }[keyof UserAnswers];

// Compact mapping of "unsure" QuestionIds to single letters (param "u", e.g. u=bc).
const UNSURE_CODES: { code: string; id: QuestionId }[] = [
  { code: 'b', id: 'BUILT_BEFORE_OCT_1978' },
  { code: 's', id: 'IS_SEPARATE_HOUSE' },
  { code: 'e', id: 'AB1482_EXEMPTION_NOTICE' },
  { code: 'c', id: 'IS_CONDO' },
];

// Short hash keys ↔ UserAnswers boolean fields.
const ANSWER_KEYS: { param: string; field: BooleanAnswerField }[] = [
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
  if (s.answers.unsure && s.answers.unsure.length > 0) {
    const letters = UNSURE_CODES.filter(({ id }) => s.answers.unsure!.includes(id)).map(({ code }) => code);
    if (letters.length > 0) params.set('u', letters.join(''));
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

  const u = params.get('u');
  if (u) {
    const ids = UNSURE_CODES.filter(({ code }) => u.includes(code)).map(({ id }) => id);
    if (ids.length > 0) answers.unsure = ids;
  }

  const lang = params.get('lang');
  const locale: Locale | undefined = lang === 'en' || lang === 'es' ? lang : undefined;

  const out: ShareState = { address, answers };
  if (locale) out.locale = locale;
  return out;
}
