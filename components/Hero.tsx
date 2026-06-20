'use client';

import { useT } from '@/lib/i18n/LocaleProvider';

export function Hero() {
  const t = useT();

  return (
    <div className="py-8">
      <h1 className="font-display text-4xl font-bold text-primary">
        {t('hero.headline')}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground leading-relaxed max-w-prose">
        {t('hero.sub')}
      </p>
    </div>
  );
}
