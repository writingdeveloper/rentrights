'use client';
import { useEffect, useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { Disclaimer } from '@/components/Disclaimer';
import { GetHelp } from '@/components/GetHelp';
import { UserAnswers } from '@/lib/rules/types';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { ShareButton } from '@/components/ShareButton';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { WhatToDoNow } from '@/components/WhatToDoNow';
import { EvictionNotice } from '@/components/EvictionNotice';
import { RecordsDetails } from '@/components/RecordsDetails';
import { isCovered } from '@/lib/content/rights';
import { decodeShare } from '@/lib/share/code';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { LookupResult } from '@/lib/compute/lookup';
import { SeoFaq } from '@/components/SeoFaq';
import { Wordmark } from '@/components/Wordmark';
import { Hero } from '@/components/Hero';
import { TrustChips } from '@/components/TrustChips';
import { HowItWorks } from '@/components/HowItWorks';
import { ResultSkeleton } from '@/components/ResultSkeleton';
import { CONTENT_LAST_UPDATED } from '@/lib/seo/content-updated';
import { formatDate } from '@/lib/format/date';

export default function Home() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [address, setAddress] = useState('');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [data, setData] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = decodeShare(window.location.hash);
    if (!s) return;
    // Restoring shared state once on mount from the URL hash is a legitimate
    // sync-from-external-system; it runs in an effect (not during render) to stay
    // hydration-safe, so set-state-in-effect is intentionally relaxed here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const isHome = !loading && !data && !error;
  const isResult = !loading && !!data;
  const incorporatedCity = !!data && data.result.reasons.some((r) => r.code === 'INCORPORATED_CITY');

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* ── Header: Wordmark (full on home, compact on result) + lang toggle ── */}
      <div className="flex items-center justify-between">
        {isResult ? (
          <div className="flex items-center gap-3">
            <Wordmark compact />
            <button
              type="button"
              onClick={() => {
                setData(null);
                setError(null);
                setAddress('');
                setAnswers({});
                if (window.location.hash) {
                  history.replaceState(null, '', window.location.pathname + window.location.search);
                }
              }}
              className="rounded-lg border border-border px-3 min-h-9 text-sm font-medium text-muted-foreground hover:bg-surface-muted"
            >
              {t('page.checkAnother')}
            </button>
          </div>
        ) : <Wordmark />}
        <div role="group" aria-label={t('page.langLabel')} className="flex gap-1 text-sm">
          <button
            type="button"
            aria-pressed={locale === 'en'}
            className={`rounded px-3 min-h-11 inline-flex items-center ${locale === 'en' ? 'bg-primary text-background' : 'border border-border'}`}
            onClick={() => setLocale('en')}
          >
            {t('page.langEnglish')}
          </button>
          <button
            type="button"
            aria-pressed={locale === 'es'}
            className={`rounded px-3 min-h-11 inline-flex items-center ${locale === 'es' ? 'bg-primary text-background' : 'border border-border'}`}
            onClick={() => setLocale('es')}
          >
            {t('page.langSpanish')}
          </button>
        </div>
      </div>

      {/* sr-only h1 for the loading & error states (home uses Hero's visible h1; result has its own) */}
      {!isHome && !isResult && <h1 className="sr-only">{t('hero.headline')}</h1>}

      {/* ── Home state: Hero → form → trust chips → how it works ── */}
      {isHome && (
        <>
          {/* Hero provides the single visible h1 on the home view */}
          <Hero />
          {/* Honest posture — warm, calm, not-legal-advice + updated date */}
          <p className="mt-2 text-sm text-muted-foreground">{t('page.trustLine', { date: formatDate(CONTENT_LAST_UPDATED, locale) })}</p>
        </>
      )}

      {/* ── Address form (always visible except when showing a full result) ── */}
      {!isResult && (
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); setAnswers({}); run(address, {}); }}
        >
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={(full) => { setAddress(full); setAnswers({}); run(full, {}); }}
          />
          <button
            className="rounded-lg bg-primary px-4 min-h-11 font-semibold text-background"
            disabled={loading}
          >
            {loading ? t('page.loading') : t('page.check')}
          </button>
        </form>
      )}

      {/* ── Home: trust chips + how it works (below form) ── */}
      {isHome && (
        <>
          <TrustChips date={CONTENT_LAST_UPDATED} />
          <HowItWorks />
        </>
      )}

      {/* ── Loading state: ResultSkeleton replaces blank ── */}
      {loading && <ResultSkeleton />}

      {/* ── Error state: friendly block with retry + fallback ── */}
      {error && !loading && (
        <div role="alert" className="mt-4 rounded-lg border border-border bg-surface-muted p-4 space-y-3">
          <p className="text-sm text-danger">
            {error === '__NETWORK__' ? t('page.networkError') : t(`error.${error}`)}
          </p>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 min-h-11 text-sm font-semibold text-background"
            onClick={() => run(address, answers)}
          >
            {t('page.tryAgain')}
          </button>
          <p className="text-sm text-muted-foreground">
            <a
              href="https://assessor.lacounty.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {t('page.errorFallback')}
            </a>
          </p>
        </div>
      )}

      {/* ── Result state: sr-only h1 + 3-band result ── */}
      {isResult && (
        <div className="mt-8 space-y-8 result-reveal">
          {/* Exactly one h1 on the result view — screen-reader only */}
          <h1 className="sr-only">{t('result.pageHeading')}</h1>

          {/* Band 1 — Your answer. Narrow live region announces only the verdict. */}
          <section>
            <p role="status" className="sr-only">{t(`rights.${data.result.regime}.title`)}</p>
            <ResultCard result={data.result} lastVerified={data.lastVerified} />
          </section>
          {/* Band 2 — What to do. Pending confirming-questions (and the records
              warning that explains them) come FIRST, right under the verdict, so
              the renter immediately sees whether more input is needed; their
              absence means the result is complete. EvictionNotice is second so
              a renter in a crisis (served court papers) finds the lifeline fast. */}
          <section className="space-y-4">
            {data.dataWarnings?.map((w: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">{t(`warning.${w}`)}</p>
            ))}
            {data.result.questions.length > 0 && (
              <ConfirmingQuestions
                questions={data.result.questions}
                answers={answers}
                onAnswer={(next) => { setAnswers(next); run(address, next); }}
              />
            )}
            <EvictionNotice />
            <IncreaseChecker
              regime={data.result.regime}
              incorporatedCity={incorporatedCity}
              preliminary={data.result.questions.length > 0}
            />
            {isCovered(data.result.regime) && <WhatToDoNow regime={data.result.regime} reasons={data.result.reasons} />}
          </section>
          {/* Band 3 — Get help + details. */}
          <section className="space-y-4">
            <GetHelp
              unincorporatedCounty={data.jurisdiction?.placeName === null && data.jurisdiction?.inLACounty === true}
              incorporatedCity={incorporatedCity}
            />
            <RecordsDetails reasons={data.result.reasons} />
            <ShareButton address={address} answers={answers} locale={locale} />
            <Disclaimer lastVerified={data.lastVerified} />
          </section>
        </div>
      )}

      {/* ── SeoFaq always at the bottom of main so it stays below the fold ── */}
      <SeoFaq />

      {/* ── Footer: unobtrusive open-source link ── */}
      <footer className="mt-6 text-center">
        <a
          href="https://github.com/writingdeveloper/rentrights"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t('page.viewSource')}
        </a>
      </footer>
    </main>
  );
}
