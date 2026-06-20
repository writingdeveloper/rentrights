'use client';
import { useEffect, useRef, useState } from 'react';
import { encodeShare } from '@/lib/share/code';
import { UserAnswers } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

export function ShareButton({ address, answers, locale }: { address: string; answers: UserAnswers; locale: Locale }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  async function onShare() {
    const url = `${window.location.origin}${window.location.pathname}#${encodeShare({ address, answers, locale })}`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: t('share.shareTitle'), url });
        return;
      }
    } catch (e) {
      // User canceled the native share sheet (AbortError) or it failed — fall through to clipboard.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={onShare} className="rounded-lg border border-border px-3 min-h-11 inline-flex items-center gap-2 text-sm font-semibold">
        <Icon name="share-2" size={16} aria-hidden="true" />
        {copied ? t('share.copied') : t('share.button')}
      </button>
      {/* Dedicated live region announces "Copied!" to screen readers without
          aria-live on the interactive button (which causes double-announcements). */}
      <span role="status" aria-live="polite" className="sr-only">{copied ? t('share.copied') : ''}</span>
      <p className="mt-1 text-sm text-muted-foreground">{t('share.privacyNote')}</p>
      {fallbackUrl && (
        <input
          readOnly
          value={fallbackUrl}
          aria-label={t('share.fallbackLabel')}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full rounded border border-border bg-surface px-3 min-h-11 text-sm text-muted-foreground"
        />
      )}
    </div>
  );
}
