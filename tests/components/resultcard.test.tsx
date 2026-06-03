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
  });

  it('hides the confidence and cap section for OUT_OF_JURISDICTION', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
  });
});
