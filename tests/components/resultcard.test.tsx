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
  it('renders an RSO result: reassurance, title (no "(likely)" dup), confidence, cap, banner — NOT the raw records', () => {
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
    expect(screen.getByText(/You have rights/)).toBeTruthy();
    expect(screen.getByText(/Rent Stabilization Ordinance/)).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText(/Legal annual increase/)).toBeTruthy();
    expect(screen.queryByText(/Built in 1931/)).toBeNull();
    expect(screen.queryByText(/6 units on the parcel/)).toBeNull();
    expect(screen.getByText(/free estimate/i).textContent).toContain('(866) 557-7368');
  });

  it('routes the banner to LA County DCBA for County regimes', () => {
    renderCard({
      regime: 'COUNTY_RSTPO',
      confidence: 'high',
      reasons: [{ code: 'UNINCORPORATED_COUNTY' }],
      questions: [],
    });
    const banner = screen.getByText(/free estimate/i).textContent ?? '';
    expect(banner).toContain('DCBA');
    expect(banner).toContain('(800) 593-8222');
    expect(banner).not.toContain('(866) 557-7368');
  });

  it('hides reassurance, confidence, and cap for OUT_OF_JURISDICTION', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText(/You have rights/)).toBeNull();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
    const banner = screen.getByText(/free estimate/i).textContent ?? '';
    expect(banner).not.toContain('(866) 557-7368');
    expect(banner).not.toContain('(800) 593-8222');
  });
});
