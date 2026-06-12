// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SeoFaq } from '@/components/SeoFaq';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { LEGAL } from '@/lib/legal/constants';

afterEach(cleanup);

function renderFaq(locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <SeoFaq />
    </LocaleProvider>,
  );
}

describe('SeoFaq', () => {
  it('covers incorporated-city AB 1482 coverage as a static, indexable Q&A', () => {
    const { container } = renderFaq();
    expect(screen.getAllByText(/Santa Monica|West Hollywood/i).length).toBeGreaterThan(0);
    // The same string must be in the FAQPage JSON-LD (AI-citable, matches visible).
    const ld = container.querySelector('script[type="application/ld+json"]')!.textContent!;
    expect(ld).toMatch(/AB ?1482/);
  });

  it('states the current eviction-answer deadline (10 court days, AB 2347) statically', () => {
    renderFaq();
    expect(screen.getByText(new RegExp(`${LEGAL.evictionAnswerCourtDays} court days`))).toBeTruthy();
    expect(screen.queryByText(/5 court days/)).toBeNull();
  });

  it('FAQPage schema entry count matches the visible question count', () => {
    const { container } = renderFaq();
    const visible = screen.getAllByRole('term').length; // <dt> elements
    const ld = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(ld.mainEntity.length).toBe(visible);
  });
});
