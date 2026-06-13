'use client';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LocaleProvider';

// Route-level error boundary (branded). Rendered inside the root layout, so the
// LocaleProvider context is available for useT. `error` is intentionally unused.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <h1 className="font-serif text-2xl font-extrabold text-primary">{t('errorPage.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('errorPage.body')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-background"
        >
          {t('errorPage.retry')}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 font-semibold text-foreground"
        >
          {t('errorPage.home')}
        </Link>
      </div>
    </main>
  );
}
