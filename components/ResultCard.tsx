import { RegimeResult } from '@/lib/rules/types';
import { RIGHTS_TEXT, capLabel, capStaleness, stalenessMessage } from '@/lib/content/rights';

const CONF_LABEL: Record<string, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

export function ResultCard({ result }: { result: RegimeResult }) {
  const rights = RIGHTS_TEXT[result.regime];
  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">What public records show</p>
      <ul className="mt-1 mb-3 list-disc pl-5 text-sm text-gray-700">
        {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      <p className="text-lg font-bold">→ Likely: {rights.title}</p>
      {result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN' && (
        <>
          <span className="mt-1 inline-block rounded-full border border-green-700 bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-700">
            {CONF_LABEL[result.confidence]}
          </span>
          <p className="mt-3 text-sm text-gray-500">Legal annual increase (current)</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime)}</p>
          {(() => {
            const s = capStaleness(result.regime);
            return s?.stale ? <p className="mt-1 text-xs text-gray-400">⚠ {stalenessMessage(s)}</p> : null;
          })()}
        </>
      )}
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
        {rights.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
        ⚠️ Not final — confirm with LAHD (866) 557-7368 →
      </div>
    </div>
  );
}
