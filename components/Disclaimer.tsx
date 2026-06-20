'use client';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { formatDate } from '@/lib/format/date';

export function Disclaimer({ lastVerified }: { lastVerified: string }) {
  const t = useT();
  const { locale } = useLocale();
  const formattedDate = formatDate(lastVerified, locale);
  return <p className="mt-6 text-sm text-muted-foreground">{t('disclaimer.text', { lastVerified: formattedDate })}</p>;
}
