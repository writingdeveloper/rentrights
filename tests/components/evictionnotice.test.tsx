// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EvictionNotice } from '@/components/EvictionNotice';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { LEGAL } from '@/lib/legal/constants';
import { HELP_ORGS } from '@/lib/content/help';

afterEach(cleanup);

function renderNotice(locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <EvictionNotice />
    </LocaleProvider>,
  );
}

describe('EvictionNotice', () => {
  it('shows the current unlawful-detainer answer deadline (10 court days, AB 2347) from LEGAL', () => {
    expect(LEGAL.evictionAnswerCourtDays).toBe(10);
    renderNotice();
    // The body must carry the dated legal figure, not a hardcoded "5 days".
    expect(screen.getByText(new RegExp(`${LEGAL.evictionAnswerCourtDays} court days`))).toBeTruthy();
    expect(screen.queryByText(/5 court days/)).toBeNull();
  });

  it('links to the free Tenant Power Toolkit', () => {
    renderNotice();
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.includes('tenantpowertoolkit.org'));
    expect(link).toBeTruthy();
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('renders the Spanish summary when locale is es', () => {
    renderNotice('es');
    expect(screen.getByText(/aviso de desalojo/i)).toBeTruthy();
  });

  it('summary communicates urgency (deadline mention)', () => {
    renderNotice();
    const summary = screen.getByRole('group')?.querySelector('summary') ??
      document.querySelector('summary');
    // The summary must convey urgency — short deadlines
    expect(summary?.textContent).toMatch(/Act now|deadlines|plazos/i);
  });

  it('surfaces Stay Housed LA phone inline (from HELP_ORGS, not hardcoded)', () => {
    const stayHoused = HELP_ORGS.find((o) => o.name === 'Stay Housed LA')!;
    expect(stayHoused).toBeTruthy();
    expect(stayHoused.phone).toBeTruthy();
    renderNotice();
    // The phone number should appear in the document
    expect(document.body.textContent).toContain(stayHoused.phone);
    // It should be a tel: link
    const telLink = screen.getAllByRole('link').find(
      (a) => a.getAttribute('href')?.startsWith('tel:') && a.textContent?.includes(stayHoused.phone!.replace(/\s/g, '').slice(0, 5)),
    );
    expect(telLink).toBeTruthy();
  });

  it('Stay Housed LA phone in EvictionNotice matches the HELP_ORGS entry (not hardcoded)', () => {
    const stayHoused = HELP_ORGS.find((o) => o.name === 'Stay Housed LA')!;
    renderNotice();
    const telLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('tel:'));
    const stayHousedTel = telLinks.find((a) => {
      const href = a.getAttribute('href') ?? '';
      const digits = stayHoused.phone!.replace(/[^0-9]/g, '');
      return href.includes(digits);
    });
    expect(stayHousedTel).toBeTruthy();
  });
});
