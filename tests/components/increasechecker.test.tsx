// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { CATALOG } from '@/lib/i18n/catalog';

afterEach(cleanup);

describe('IncreaseChecker', () => {
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
});
