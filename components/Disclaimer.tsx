'use client';
import { useT } from '@/lib/i18n/LocaleProvider';

export function Disclaimer({ lastVerified }: { lastVerified: string }) {
  const t = useT();
  return <p className="mt-6 text-xs text-muted-foreground">{t('disclaimer.text', { lastVerified })}</p>;
}
