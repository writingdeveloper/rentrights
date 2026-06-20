// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

const countyRsto: RegimeResult = {
  regime: 'COUNTY_RSTPO',
  confidence: 'high',
  reasons: [{ code: 'UNINCORPORATED_COUNTY' }, { code: 'COUNTY_BUILT_BEFORE_1995', params: { year: 1990 } }, { code: 'UNITS_COUNT', params: { count: 4 } }],
  questions: [],
};

describe('County regimes in the UI', () => {
  it('ResultCard renders the County RSTPO title, reassurance, and DCBA banner', () => {
    render(<LocaleProvider initialLocale="en"><ResultCard result={countyRsto} /></LocaleProvider>);
    expect(screen.getByText(/LA County Rent Stabilization/)).toBeTruthy();
    expect(screen.getByText(/You have rights/)).toBeTruthy();
    expect(screen.getByText(/Confirm free with LA County DCBA/i).textContent).toContain('DCBA');
  });

  it('IncreaseChecker flags an over-cap increase for COUNTY_RSTPO', () => {
    render(<LocaleProvider initialLocale="en"><IncreaseChecker regime="COUNTY_RSTPO" /></LocaleProvider>);
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2200' } });
    expect(screen.getByText(/Over the legal cap/i)).toBeTruthy();
  });

  it('IncreaseChecker shows a no-cap note for COUNTY_JCO', () => {
    render(<LocaleProvider initialLocale="en"><IncreaseChecker regime="COUNTY_JCO" /></LocaleProvider>);
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
  });
});
