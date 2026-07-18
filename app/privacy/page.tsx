import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerLocale, isForcedEsPath } from '@/lib/i18n/server-locale';
import { privacyContent } from '@/lib/legal/privacy';
import { siteUrl } from '@/lib/seo/site-url';
import { formatDate } from '@/lib/format/date';
import { Wordmark } from '@/components/Wordmark';

// Served at /privacy (EN, or ES negotiated via Accept-Language) and at /es/privacy
// (forced ES via the proxy's x-rr-locale header). Reading the locale opts this
// route into dynamic rendering — same as "/" and the cornerstone.

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const esPath = await isForcedEsPath();
  const p = privacyContent(locale);
  const base = siteUrl();
  const canonical = esPath ? `${base}/es/privacy` : `${base}/privacy`;
  return {
    title: p.title,
    description: p.intro,
    alternates: {
      canonical,
      languages: { en: `${base}/privacy`, es: `${base}/es/privacy` },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: p.title,
      description: p.intro,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
    },
  };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const p = privacyContent(locale);
  const homeHref = locale === 'es' ? '/es' : '/';
  const updatedLabel = locale === 'es' ? 'Última actualización' : 'Last updated';

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href={homeHref} aria-label="RentRights"><Wordmark /></Link>
      </div>

      <article className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold">{p.title}</h1>
          <p className="text-sm text-muted-foreground">
            {updatedLabel}: {formatDate(p.updatedIso, locale)}
          </p>
          <p className="text-foreground">{p.intro}</p>
        </header>

        {p.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="font-display text-lg font-bold">{s.heading}</h2>
            {s.paragraphs.map((para, i) => {
              // The opt-out paragraph carries the Google opt-out link; the contact
              // paragraph carries the GitHub link. Everything else is plain prose.
              const isOptOut = /opt out|excluirse/i.test(s.heading);
              const isContact = /request|solicitud/i.test(s.heading);
              return (
                <p key={i} className="text-foreground">
                  {para}{' '}
                  {isOptOut && (
                    <a className="underline underline-offset-2" href={p.optOutUrl} target="_blank" rel="noopener noreferrer">
                      {p.optOutUrl}
                    </a>
                  )}
                  {isContact && (
                    <a className="underline underline-offset-2" href={p.contactUrl} target="_blank" rel="noopener noreferrer">
                      {p.contactUrl}
                    </a>
                  )}
                </p>
              );
            })}
          </section>
        ))}

        <p className="pt-2">
          <Link href={homeHref} className="font-medium text-primary underline underline-offset-2">
            {p.backToTool}
          </Link>
        </p>
      </article>
    </main>
  );
}
