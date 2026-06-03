// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Disclaimer } from '@/components/Disclaimer';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

describe('Disclaimer', () => {
  it('renders localized text including the lastVerified date', () => {
    render(
      <LocaleProvider initialLocale="en">
        <Disclaimer lastVerified="2026-06-02" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/2026-06-02/)).toBeTruthy();
    expect(screen.getByText(/not legal advice/i)).toBeTruthy();
  });
});
