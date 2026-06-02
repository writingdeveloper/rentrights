'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';

const QUESTION_TEXT: Record<QuestionId, { q: string; yes: string; no: string; key: keyof UserAnswers; yesValue: boolean }> = {
  BUILT_BEFORE_OCT_1978: { q: 'Was this building built (certificate of occupancy) before October 1978?', yes: 'Yes, before Oct 1978', no: 'No / not sure it’s after', key: 'builtBeforeOct1978', yesValue: true },
  IS_SEPARATE_HOUSE: { q: 'Is the other unit on the property a separate house (ADU/guest house) rather than an apartment?', yes: 'Yes, a separate house', no: 'No, it’s an apartment building', key: 'isSeparateHouse', yesValue: true },
  AB1482_EXEMPTION_NOTICE: { q: 'Did your landlord give you a written "AB 1482 exemption" notice?', yes: 'Yes', no: 'No', key: 'hasAb1482ExemptionNotice', yesValue: true },
  IS_CONDO: { q: 'Is this an individually-owned condominium (not a rental apartment)?', yes: 'Yes, a condo', no: 'No, a rental apartment', key: 'isCondo', yesValue: true },
};

export function ConfirmingQuestions({ questions, answers, onAnswer }: {
  questions: QuestionId[];
  answers: UserAnswers;
  onAnswer: (next: UserAnswers) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold">A couple of quick questions to improve accuracy:</p>
      {questions.map((id) => {
        const t = QUESTION_TEXT[id];
        return (
          <div key={id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm">{t.q}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [t.key]: t.yesValue })}>{t.yes}</button>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [t.key]: !t.yesValue })}>{t.no}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
