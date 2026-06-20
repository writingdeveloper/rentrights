'use client';

import { useT } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

export function HowItWorks() {
  const t = useT();

  const steps = [
    t('how.step1'),
    t('how.step2'),
    t('how.step3'),
  ];

  return (
    <section aria-labelledby="how-it-works-heading" className="mt-8">
      <h2 id="how-it-works-heading" className="text-base font-semibold text-foreground uppercase tracking-wide mb-4">
        {t('how.heading')}
      </h2>
      <ol className="flex flex-wrap items-start gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-background text-xs font-bold flex-shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-foreground">{step}</span>
            {i < steps.length - 1 && (
              <Icon name="arrow-right" size={16} className="text-muted-foreground flex-shrink-0" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
