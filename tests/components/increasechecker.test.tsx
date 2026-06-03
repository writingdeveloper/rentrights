// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

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

  it('shows a no-cap note for JCO_ONLY', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="JCO_ONLY" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
  });

  it('renders nothing for out-of-jurisdiction', () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="OUT_OF_JURISDICTION" />
      </LocaleProvider>,
    );
    expect(container.querySelector('section')).toBeNull();
  });
});
