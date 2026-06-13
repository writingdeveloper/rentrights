import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

// Branded, locale-aware 404 (replaces Next's unstyled English-only default).
// Mirrors the root layout's locale negotiation: cookie -> Accept-Language.
export default async function NotFound() {
  const h = await headers();
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  const locale = pickInitialLocale(cookieValue, h.get('accept-language'));
  const c = CATALOG[locale];
  const t = (key: string) => translate(c, key, undefined, CATALOG.en);
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <p className="font-serif text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-lg font-semibold text-foreground">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('notFound.body')}</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-background"
      >
        {t('notFound.home')}
      </Link>
    </main>
  );
}
