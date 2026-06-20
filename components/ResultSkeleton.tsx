'use client';

import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultSkeleton() {
  const t = useT();

  return (
    <div className="mt-8">
      {/* SR-only live region announces the loading state */}
      <p role="status" className="sr-only">{t('page.loading')}</p>

      {/* Visual skeleton card — aria-hidden so screen readers don't announce shapes */}
      <div aria-hidden="true" className="rounded-lg border border-border bg-surface p-6 shadow-sm space-y-4">
        {/* Hero block (regime title placeholder) */}
        <div className="skeleton-shimmer h-7 w-2/3 rounded bg-surface-muted" />
        {/* Sub-line */}
        <div className="skeleton-shimmer h-4 w-1/2 rounded bg-surface-muted" />

        {/* Cap block */}
        <div className="mt-6 rounded-lg bg-surface-muted p-4 space-y-2">
          <div className="skeleton-shimmer h-4 w-1/3 rounded bg-border" />
          <div className="skeleton-shimmer h-8 w-1/4 rounded bg-border" />
        </div>

        {/* Three bullet lines */}
        <div className="mt-4 space-y-2">
          <div className="skeleton-shimmer h-3 w-full rounded bg-surface-muted" />
          <div className="skeleton-shimmer h-3 w-5/6 rounded bg-surface-muted" />
          <div className="skeleton-shimmer h-3 w-4/6 rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
