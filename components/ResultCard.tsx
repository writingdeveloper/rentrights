'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage, notFinalBanner, isCovered } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultCard({ result }: { result: RegimeResult }) {
  const t = useT();
  const rights = rightsText(result.regime, t);
  const detailed = result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN';
  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
      {isCovered(result.regime) && (
        <p className="mb-2 text-sm font-medium text-green-700">{t('result.reassure')}</p>
      )}
      <p className="text-lg font-bold">{t('result.likelyPrefix')} {rights.title}</p>
      {detailed && (
        <>
          <span className="mt-1 inline-block rounded-full border border-green-700 bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-700">
            {t(`result.confidence.${result.confidence}`)}
          </span>
          <p className="mt-3 text-sm text-gray-500">{t('result.legalIncrease')}</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime, t)}</p>
          {(() => {
            const s = capStaleness(result.regime);
            return s?.stale ? <p className="mt-1 text-xs text-gray-600">⚠ {stalenessMessage(s, t, result.regime)}</p> : null;
          })()}
        </>
      )}
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
        {rights.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
        {notFinalBanner(result.regime, t)}
      </div>
    </div>
  );
}
