'use client';
import { useEffect, useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { Disclaimer } from '@/components/Disclaimer';
import { GetHelp } from '@/components/GetHelp';
import { UserAnswers } from '@/lib/rules/types';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { ShareButton } from '@/components/ShareButton';
import { decodeShare } from '@/lib/share/code';

export default function Home() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [address, setAddress] = useState('');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = decodeShare(window.location.hash);
    if (!s) return;
    setAddress(s.address);
    setAnswers(s.answers);
    if (s.locale) setLocale(s.locale);
    run(s.address, s.answers);
    // Mount-only: restore shared state once from the URL hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(addr: string, ans: UserAnswers) {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr, answers: ans }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'UPSTREAM_ERROR'); setData(null); }
      else setData(json);
    } catch { setError('__NETWORK__'); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-blue-700">{t('page.title')}</h1>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            aria-pressed={locale === 'en'}
            className={`rounded px-2 py-1 ${locale === 'en' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setLocale('en')}
          >
            {t('page.langEnglish')}
          </button>
          <button
            type="button"
            aria-pressed={locale === 'es'}
            className={`rounded px-2 py-1 ${locale === 'es' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setLocale('es')}
          >
            {t('page.langSpanish')}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500">{t('page.tagline')}</p>

      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAnswers({}); run(address, {}); }}>
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder={t('page.placeholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? t('page.loading') : t('page.check')}</button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error === '__NETWORK__' ? t('page.networkError') : t(`error.${error}`)}
        </p>
      )}

      {data && (
        <div className="mt-6">
          <ResultCard result={data.result} />
          {data.result.questions.length > 0 && (
            <ConfirmingQuestions
              questions={data.result.questions}
              answers={answers}
              onAnswer={(next) => { setAnswers(next); run(address, next); }}
            />
          )}
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{t(`warning.${w}`)}</p>
          ))}
          <ShareButton address={address} answers={answers} locale={locale} />
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
          <Disclaimer lastVerified={data.lastVerified} />
        </div>
      )}
    </main>
  );
}
