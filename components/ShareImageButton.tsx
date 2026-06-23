'use client';
import { Regime } from '@/lib/rules/types';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

/**
 * Downloads a branded, self-contained PNG of the result (server-rendered by
 * /api/share-card from the dated LEGAL constants). The URL carries only the
 * regime + locale — no address, no PII — so it stays consistent with the
 * cookieless "nothing saved" promise.
 */
export function ShareImageButton({ regime }: { regime: Regime }) {
  const t = useT();
  const { locale } = useLocale();
  const href = `/api/share-card?regime=${encodeURIComponent(regime)}&locale=${locale}`;
  return (
    <a
      href={href}
      download="rentrights-la.png"
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
    >
      <Icon name="share-2" size={16} aria-hidden="true" />
      {t('share.saveImage')}
    </a>
  );
}
