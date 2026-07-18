import Link from 'next/link';
import { LEGAL } from '@/lib/legal/constants';
import { cornerstoneRows, cornerstoneFaqs, cornerstoneStrings, CornerstoneLocale } from '@/lib/seo/cornerstone';
import { JsonLd } from '@/components/JsonLd';
import { articleJsonLd, faqPageJsonLd } from '@/lib/seo/jsonld';
import { Wordmark } from '@/components/Wordmark';

const SOURCES = [
  { href: 'https://housing.lacity.gov/residents/rso-overview', en: 'LA Housing Department (LAHD) — RSO', es: 'Departamento de Vivienda de LA (LAHD) — RSO' },
  { href: 'https://dcba.lacounty.gov/portfolio/rent-increases/', en: 'LA County DCBA — rent increases (unincorporated)', es: 'DCBA del Condado de LA — aumentos de renta (área no incorporada)' },
  { href: 'https://oag.ca.gov/consumers/general/landlord-tenant-issues', en: 'California Attorney General — landlord/tenant', es: 'Fiscal General de California — arrendador/inquilino' },
];

/** Shared cornerstone explainer, rendered by the EN (/guides/...) and ES (/es/guides/...) routes. */
export function CornerstoneArticle({ now, locale, base, path }: { now: Date; locale: CornerstoneLocale; base: string; path: string }) {
  const rows = cornerstoneRows(now, locale);
  const faqs = cornerstoneFaqs(now, locale);
  const s = cornerstoneStrings(now, locale);
  const homeHref = locale === 'es' ? '/es' : '/';
  const capsHeading = locale === 'es' ? 'Los topes de aumento de renta de Los Ángeles en 2026' : 'The 2026 Los Angeles rent-increase caps';

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <JsonLd data={articleJsonLd({ base, url: `${base}${path}`, headline: s.h1, description: s.metaDescription, dateModified: LEGAL.lastVerified, inLanguage: locale })} />
      <JsonLd data={faqPageJsonLd(faqs)} />

      <div className="mb-8">
        <Link href={homeHref} aria-label="RentRights"><Wordmark /></Link>
      </div>

      <article className="space-y-6">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-bold">{s.h1}</h1>
          {/* Answer-first lede (the extractable passage for snippets + AI Overviews) */}
          <p className="text-foreground">{s.lede}</p>
          <p>
            <Link href={homeHref} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-background">
              {s.cta}
            </Link>
          </p>
        </header>

        {/* The dated, sourced cap table */}
        <section aria-labelledby="caps-heading" className="space-y-3">
          <h2 id="caps-heading" className="font-display text-xl font-bold">{capsHeading}</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th className="p-3 font-semibold">{s.thWhere}</th>
                  <th className="p-3 font-semibold">{s.thCap}</th>
                  <th className="p-3 font-semibold">{s.thEffect}</th>
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
          <p className="text-sm text-muted-foreground">{s.tierNote}</p>
        </section>

        {/* Question-shaped H2s mirroring real searches; answers match the FAQPage schema */}
        <section className="space-y-5">
          {faqs.map((fq, i) => (
            <div key={i} className="space-y-1.5">
              <h2 className="font-display text-lg font-bold">{fq.q}</h2>
              <p className="text-foreground">{fq.a}</p>
            </div>
          ))}
        </section>

        {/* Primary sources + honest framing */}
        <section aria-labelledby="sources-heading" className="space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
          <h2 id="sources-heading" className="font-semibold text-foreground">{s.sourcesHeading}</h2>
          <ul className="list-disc space-y-1 pl-5">
            {SOURCES.map((src) => (
              <li key={src.href}>
                <a className="underline underline-offset-2" href={src.href} target="_blank" rel="noopener noreferrer">
                  {locale === 'es' ? src.es : src.en}
                </a>
              </li>
            ))}
          </ul>
          <p className="pt-2">{s.disclaimer}</p>
          <p>
            <Link href={homeHref} className="font-medium text-primary underline underline-offset-2">{s.cta}</Link>
          </p>
          <p>
            <Link href={locale === 'es' ? '/es/privacy' : '/privacy'} className="underline underline-offset-2">
              {locale === 'es' ? 'Privacidad' : 'Privacy'}
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
