'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

type Opt = { labelKey: string; key: keyof UserAnswers; value: boolean; common?: boolean };

// For each question: the primary (safe / most-common) option is shown first and
// emphasized; the secondary is the other explicit answer. "I'm not sure" is
// handled separately and sets no boolean.
const QUESTION_META: Record<QuestionId, { primary: Opt; secondary: Opt }> = {
  // Intentionally no `common` flag: for build age the safe-if-unsure choice is
  // "I'm not sure" (→ age left unknown), not either explicit answer — so neither
  // explicit option is emphasized, to avoid steering the user to a wrong guess.
  BUILT_BEFORE_OCT_1978: {
    primary: { labelKey: 'question.BUILT_BEFORE_OCT_1978.yes', key: 'builtBeforeOct1978', value: true },
    secondary: { labelKey: 'question.BUILT_BEFORE_OCT_1978.no', key: 'builtBeforeOct1978', value: false },
  },
  IS_SEPARATE_HOUSE: {
    primary: { labelKey: 'question.IS_SEPARATE_HOUSE.no', key: 'isSeparateHouse', value: false, common: true },
    secondary: { labelKey: 'question.IS_SEPARATE_HOUSE.yes', key: 'isSeparateHouse', value: true },
  },
  IS_CONDO: {
    primary: { labelKey: 'question.IS_CONDO.no', key: 'isCondo', value: false, common: true },
    secondary: { labelKey: 'question.IS_CONDO.yes', key: 'isCondo', value: true },
  },
  AB1482_EXEMPTION_NOTICE: {
    primary: { labelKey: 'question.AB1482_EXEMPTION_NOTICE.no', key: 'hasAb1482ExemptionNotice', value: false, common: true },
    secondary: { labelKey: 'question.AB1482_EXEMPTION_NOTICE.yes', key: 'hasAb1482ExemptionNotice', value: true },
  },
};

function withAnswer(answers: UserAnswers, id: QuestionId, opt: Opt): UserAnswers {
  const next: UserAnswers = { ...answers, [opt.key]: opt.value };
  if (next.unsure) {
    const rest = next.unsure.filter((q) => q !== id);
    if (rest.length > 0) next.unsure = rest;
    else delete next.unsure;
  }
  return next;
}

function withUnsure(answers: UserAnswers, id: QuestionId, key: keyof UserAnswers): UserAnswers {
  const next: UserAnswers = { ...answers };
  delete next[key];
  const set = new Set(next.unsure ?? []);
  set.add(id);
  next.unsure = [...set];
  return next;
}

export function ConfirmingQuestions({ questions, answers, onAnswer }: {
  questions: QuestionId[];
  answers: UserAnswers;
  onAnswer: (next: UserAnswers) => void;
}) {
  const t = useT();
  // A distinct, primary-toned callout so it's unmistakable that answering these
  // refines the result — this is the renter's next action, not background info.
  // Rendered right under the verdict (see app/page.tsx) and absent when there's
  // nothing to answer, so "no callout" reads as "your result is complete".
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-primary bg-primary-soft p-4">
      <h2 className="text-sm font-semibold text-foreground">
        {t('question.heading', { count: questions.length })}
      </h2>
      {/* Reassurance shown once for the whole callout, not duplicated per question */}
      <p className="text-sm text-muted-foreground">{t('question.reassure')}</p>
      <div className="space-y-4">
        {questions.map((id, idx) => {
          const m = QUESTION_META[id];
          const renderBtn = (opt: Opt) => (
            <button
              key={opt.labelKey}
              type="button"
              onClick={() => onAnswer(withAnswer(answers, id, opt))}
              className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${
                opt.common ? 'border-success bg-success-soft font-semibold text-success' : 'border-border-input bg-surface'
              }`}
            >
              {t(opt.labelKey)}
              {opt.common && <span className="ml-1 text-sm font-normal text-success">· {t('question.common')}</span>}
            </button>
          );
          const qId = `question-label-${id}`;
          return (
            <div key={id} role="group" aria-labelledby={qId} className="rounded-xl border border-border bg-surface p-3">
              {/* Progress indicator */}
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                {t('question.progress', { n: idx + 1, total: questions.length })}
              </p>
              <p id={qId} className="text-sm font-medium">{t(`question.${id}.q`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`question.${id}.help`)}</p>
              <div className="mt-2 flex flex-col gap-2">
                {renderBtn(m.primary)}
                {renderBtn(m.secondary)}
                <button
                  type="button"
                  onClick={() => onAnswer(withUnsure(answers, id, m.primary.key))}
                  className="w-full rounded-lg border border-dashed border-border-strong bg-surface px-3 py-3 text-left text-sm text-muted-foreground"
                >
                  {t('question.unsure')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
