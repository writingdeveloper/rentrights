import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal/constants';
import { cornerstoneRows, cornerstoneFaqs } from '@/lib/seo/cornerstone';
import { siteUrl } from '@/lib/seo/site-url';
import { JsonLd } from '@/components/JsonLd';
import { articleJsonLd, faqPageJsonLd } from '@/lib/seo/jsonld';
import { formatDate } from '@/lib/format/date';
import { Wordmark } from '@/components/Wordmark';

// Refresh the dated figures daily so the static page can't show a stale cap
// (e.g. after the 2026-07-01 RSO transition) even between deploys.
export const revalidate = 86400;

const PATH = '/guides/la-rent-increase-2026';
const HEADLINE = 'How much can my landlord raise my rent in Los Angeles? (2026)';
const DESCRIPTION =
  "In Los Angeles, how much your landlord can raise your rent depends on which law covers your home — the City of LA's RSO, California's AB 1482, or LA County's ordinance. See the 2026 caps and check your address.";

export const metadata: Metadata = {
  title: HEADLINE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: 'article', url: PATH, title: HEADLINE, description: DESCRIPTION },
};

export default function Page() {
  const now = new Date();
  const rows = cornerstoneRows(now);
  const faqs = cornerstoneFaqs(now);
  const base = siteUrl();
  const verified = formatDate(LEGAL.lastVerified, 'en');

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <JsonLd data={articleJsonLd({ base, url: `${base}${PATH}`, headline: HEADLINE, description: DESCRIPTION, dateModified: LEGAL.lastVerified })} />
      <JsonLd data={faqPageJsonLd(faqs)} />

      <div className="mb-8">
        <Link href="/" aria-label="RentRights home"><Wordmark /></Link>
      </div>

      <article className="space-y-6">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-bold">{HEADLINE}</h1>
          {/* Answer-first lede (the extractable passage for snippets + AI Overviews) */}
          <p className="text-foreground">
            How much your landlord can legally raise your rent in Los Angeles depends on which law covers your
            home. Rent-stabilized <strong>(RSO)</strong> units in the City of LA can be raised <strong>{rows[0].cap.replace(/^up to /, '')}</strong> right
            now; many other units fall under California&apos;s <strong>AB 1482</strong> ({rows[1].cap}); and
            unincorporated <strong>LA County</strong> has its own cap. Enter your address to see which one applies to you.
          </p>
          <p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-background"
            >
              Check your address →
            </Link>
          </p>
        </header>

        {/* The dated, sourced cap table — the original-data asset AI search rewards */}
        <section aria-labelledby="caps-heading" className="space-y-3">
          <h2 id="caps-heading" className="font-display text-xl font-bold">The 2026 Los Angeles rent-increase caps</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th className="p-3 font-semibold">Where you live</th>
                  <th className="p-3 font-semibold">Max annual increase</th>
                  <th className="p-3 font-semibold">In effect</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-border align-top">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 tabular-nums">{r.cap}</td>
                    <td className="p-3 text-muted-foreground">{r.effective}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Unincorporated-County small-property (self-certified) and luxury units may have somewhat higher caps —
            confirm your tier with LA County DCBA. Figures last verified {verified}; rent caps change (typically each
            summer), so confirm the current number before you act.
          </p>
        </section>

        {/* Question-shaped H2s mirroring real searches; answers match the FAQPage schema above */}
        <section className="space-y-5">
          {faqs.map((f, i) => (
            <div key={i} className="space-y-1.5">
              <h2 className="font-display text-lg font-bold">{f.q}</h2>
              <p className="text-foreground">{f.a}</p>
            </div>
          ))}
        </section>

        {/* Primary sources + honest framing */}
        <section aria-labelledby="sources-heading" className="space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
          <h2 id="sources-heading" className="font-semibold text-foreground">Official sources</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><a className="underline underline-offset-2" href="https://housing.lacity.gov/residents/rso-overview" target="_blank" rel="noopener noreferrer">LA Housing Department (LAHD) — RSO</a></li>
            <li><a className="underline underline-offset-2" href="https://dcba.lacounty.gov/portfolio/rent-increases/" target="_blank" rel="noopener noreferrer">LA County DCBA — rent increases (unincorporated)</a></li>
            <li><a className="underline underline-offset-2" href="https://oag.ca.gov/consumers/general/landlord-tenant-issues" target="_blank" rel="noopener noreferrer">California Attorney General — landlord/tenant</a></li>
          </ul>
          <p className="pt-2">
            This page gives general information about Los Angeles rent law, not legal advice about your specific
            situation. It&apos;s an estimate from dated public legal figures — confirm your unit&apos;s status with LAHD (city)
            or DCBA (county), or a free legal-aid provider, before acting.
          </p>
          <p>
            <Link href="/" className="font-medium text-primary underline underline-offset-2">Check your address with RentRights →</Link>
          </p>
        </section>
      </article>
    </main>
  );
}
