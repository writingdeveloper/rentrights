// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EvictionNotice } from '@/components/EvictionNotice';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { LEGAL } from '@/lib/legal/constants';

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
});
