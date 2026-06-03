'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

const QUESTION_META: Record<QuestionId, { key: keyof UserAnswers; yesValue: boolean }> = {
  BUILT_BEFORE_OCT_1978: { key: 'builtBeforeOct1978', yesValue: true },
  IS_SEPARATE_HOUSE: { key: 'isSeparateHouse', yesValue: true },
  AB1482_EXEMPTION_NOTICE: { key: 'hasAb1482ExemptionNotice', yesValue: true },
  IS_CONDO: { key: 'isCondo', yesValue: true },
};

export function ConfirmingQuestions({ questions, answers, onAnswer }: {
  questions: QuestionId[];
  answers: UserAnswers;
  onAnswer: (next: UserAnswers) => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold">{t('question.heading')}</p>
      {questions.map((id) => {
        const m = QUESTION_META[id];
        return (
          <div key={id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm">{t(`question.${id}.q`)}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [m.key]: m.yesValue })}>{t(`question.${id}.yes`)}</button>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [m.key]: !m.yesValue })}>{t(`question.${id}.no`)}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
