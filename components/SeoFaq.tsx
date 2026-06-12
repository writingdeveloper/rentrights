'use client';

import { useT } from '@/lib/i18n/LocaleProvider';
import { LEGAL } from '@/lib/legal/constants';
import { JsonLd } from './JsonLd';
import { faqPageJsonLd } from '@/lib/seo/jsonld';

const NOTICE_PARAMS = {
  small: LEGAL.notice.smallIncreaseDays,
  large: LEGAL.notice.largeIncreaseDays,
  threshold: LEGAL.notice.largeThresholdPct,
  mail: LEGAL.notice.mailExtraDays,
  lastVerified: LEGAL.lastVerified,
};

// Per-question interpolation params (most answers take none).
const FAQ_PARAMS: Record<number, Record<string, string | number>> = {
  7: NOTICE_PARAMS,
  9: { evictionDays: LEGAL.evictionAnswerCourtDays },
};

export function SeoFaq() {
  const t = useT();
  // Build the Q&A once; the SAME strings feed the visible list and the schema
  // so the FAQPage JSON-LD always matches what users (and AI crawlers) see.
  const faqs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`, FAQ_PARAMS[n]),
  }));

  return (
    <section aria-labelledby="faq-heading" className="mt-12 border-t border-border pt-8">
      <p className="text-sm text-muted-foreground">{t('faq.intro')}</p>
      <h2 id="faq-heading" className="mt-6 text-lg font-bold">{t('faq.heading')}</h2>
      <dl className="mt-3 space-y-4">
        {faqs.map(({ q, a }, i) => (
          <div key={i}>
            {/* Inherit --foreground (adapts to light/dark) so questions and
                answers stay readable in both color schemes. */}
            <dt className="font-semibold">{q}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
      <JsonLd data={faqPageJsonLd(faqs)} />
    </section>
  );
}
