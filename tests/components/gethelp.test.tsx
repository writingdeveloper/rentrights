// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GetHelp } from '@/components/GetHelp';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

describe('GetHelp', () => {
  it('renders the directory heading and the LAHD entry', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp />
      </LocaleProvider>,
    );
    expect(screen.getByText('Get free help')).toBeTruthy();
    expect(screen.getByText(/LAHD/)).toBeTruthy();
  });

  it('surfaces a County (DCBA) resource first for unincorporated county', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp unincorporatedCounty />
      </LocaleProvider>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('DCBA');
  });

  it('lists the Tenant Power Toolkit (eviction-defense self-help)', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp />
      </LocaleProvider>,
    );
    const tpt = screen.getByText('Tenant Power Toolkit').closest('li');
    expect(tpt).toBeTruthy();
    const link = tpt!.querySelector('a[href*="tenantpowertoolkit.org"]');
    expect(link).toBeTruthy();
  });

  it('renders each phone as a tel: link', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp />
      </LocaleProvider>,
    );
    const telLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('tel:'));
    expect(telLinks.length).toBeGreaterThan(0);
    telLinks.forEach((a) => expect(a.getAttribute('href')).toMatch(/^tel:\+?[0-9]+$/));
  });
});
