// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

function renderCard(result: RegimeResult) {
  return render(
    <LocaleProvider initialLocale="en">
      <ResultCard result={result} />
    </LocaleProvider>,
  );
}

describe('ResultCard', () => {
  it('renders an RSO result with reasons, confidence, and the cap label', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [
        { code: 'IN_LA_CITY' },
        { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
        { code: 'UNITS_COUNT', params: { count: 6 } },
      ],
      questions: [],
    });
    expect(screen.getByText(/Rent Stabilization Ordinance/)).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText(/Built in 1931/)).toBeTruthy();
    expect(screen.getByText(/6 units on the parcel/)).toBeTruthy();
    expect(screen.getByText(/Legal annual increase/)).toBeTruthy();
    // City regime: "Not final" banner routes to LAHD.
    expect(screen.getByText(/Not final/).textContent).toContain('(866) 557-7368');
  });

  it('routes the "Not final" banner to LA County DCBA for County regimes', () => {
    renderCard({
      regime: 'COUNTY_RSTPO',
      confidence: 'high',
      reasons: [{ code: 'UNINCORPORATED_COUNTY' }],
      questions: [],
    });
    const banner = screen.getByText(/Not final/).textContent ?? '';
    expect(banner).toContain('DCBA');
    expect(banner).toContain('(800) 593-8222');
    expect(banner).not.toContain('(866) 557-7368');
  });

  it('hides the confidence and cap section for OUT_OF_JURISDICTION and shows a generic banner', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
    const banner = screen.getByText(/Not final/);
    expect(banner.textContent).not.toContain('(866) 557-7368');
    expect(banner.textContent).not.toContain('(800) 593-8222');
  });
});
