// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { CATALOG } from '@/lib/i18n/catalog';

describe('IncreaseChecker', () => {
  // Pin "now" inside the published RSO 3% period (value != null) so the WITHIN_CAP /
  // OVER_CAP verdicts are deterministic no matter when the suite runs. After the
  // 2026-06-30 cap-change date the live RSO cap becomes a pending "being updated"
  // range (WITHIN_RANGE / OVER_RANGE) — that transition has its own test below.
  // Only Date is faked, so React's scheduler/microtasks are untouched.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it('flags an over-cap increase for an RSO unit', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2200' } });
    expect(screen.getByText(/Over the legal cap/i)).toBeTruthy();
  });

  it('shows a no-cap note for JCO_ONLY with a non-interrogative heading', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="JCO_ONLY" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
    // Heading must NOT be the interrogative "Is your rent increase legal?" on the no-cap path
    expect(screen.queryByText(/Is your rent increase legal\?/i)).toBeNull();
    // Instead shows the calm declarative heading
    expect(screen.getByText(/No rent-increase cap applies/i)).toBeTruthy();
  });

  it('shows a no-cap note for COUNTY_JCO with non-interrogative heading', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="COUNTY_JCO" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
    expect(screen.queryByText(/Is your rent increase legal\?/i)).toBeNull();
    expect(screen.getByText(/No rent-increase cap applies/i)).toBeTruthy();
  });

  it('renders nothing for out-of-jurisdiction', () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="OUT_OF_JURISDICTION" />
      </LocaleProvider>,
    );
    expect(container.querySelector('section')).toBeNull();
  });

  // NEW TASK 6 TESTS

  it('shows empty state text when no amounts are entered', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/Enter both amounts to see if it's allowed/i)).toBeTruthy();
  });

  it('OVER_CAP shows an alert/x icon (role=img or aria-hidden) AND the word "Over the legal limit"', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2200' } });
    // Short word verdict
    expect(screen.getByText(/Over the legal limit/i)).toBeTruthy();
    // Detailed sentence still present
    expect(screen.getByText(/Over the legal cap/i)).toBeTruthy();
  });

  it('WITHIN_CAP shows a check icon AND the word "Within the legal limit"', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2020' } });
    // Short word verdict
    expect(screen.getByText(/Within the legal limit/i)).toBeTruthy();
    // Detailed sentence still present
    expect(screen.getByText(/Within the legal cap/i)).toBeTruthy();
  });

  it('increase.uncertain key exists in both EN and ES catalogs', () => {
    expect(typeof CATALOG.en['increase.uncertain']).toBe('string');
    expect(CATALOG.en['increase.uncertain'].length).toBeGreaterThan(0);
    expect(typeof CATALOG.es['increase.uncertain']).toBe('string');
    expect(CATALOG.es['increase.uncertain'].length).toBeGreaterThan(0);
  });

  it('renders the "cap is being updated" range verdict after the RSO cap-change date', () => {
    // At the next cap change (2027-07-01) the RSO cap is again a pending 90%-of-CPI band
    // (floor 1% / ceiling 4%) until LAHD publishes the exact %, so the checker shows a
    // range — not a fixed cap. (2026-07-01–2027-06-30 is published at 3%.)
    vi.setSystemTime(new Date('2027-07-07T12:00:00Z'));
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2020' } });
    // Short word verdict still reads "within the legal limit"…
    expect(screen.getByText(/Within the legal limit/i)).toBeTruthy();
    // …but the detailed sentence is the range/"being updated" copy, not "within the legal cap".
    expect(screen.getByText(/within the legal range/i)).toBeTruthy();
    expect(screen.getByText(/being updated/i)).toBeTruthy();
    expect(screen.queryByText(/within the legal cap/i)).toBeNull();
  });
});
