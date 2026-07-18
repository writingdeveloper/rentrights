// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TrustChips } from '@/components/TrustChips';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderChips(locale: 'en' | 'es' = 'en', date = '2026-06-12') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <TrustChips date={date} />
    </LocaleProvider>,
  );
}

describe('TrustChips', () => {
  it('renders "Public records" chip (EN)', () => {
    renderChips('en');
    expect(screen.getByText('Public records')).toBeTruthy();
  });

  it('renders the passed date in the "Updated" chip (formatted, EN)', () => {
    renderChips('en', '2026-06-12');
    // EN: "Updated June 12, 2026" (formatted, not raw ISO)
    expect(screen.getByText('Updated June 12, 2026')).toBeTruthy();
  });

  it('renders "Free, no address saved" chip (EN)', () => {
    renderChips('en');
    expect(screen.getByText('Free, no address saved')).toBeTruthy();
  });

  it('renders bilingual chip', () => {
    renderChips('en');
    expect(screen.getByText('English / Español')).toBeTruthy();
  });

  it('renders Spanish labels (ES)', () => {
    renderChips('es');
    expect(screen.getByText('Registros públicos')).toBeTruthy();
    expect(screen.getByText('Gratis, sin guardar su dirección')).toBeTruthy();
  });

  it('renders the date in ES template (formatted, ES)', () => {
    renderChips('es', '2026-06-12');
    // ES: "Actualizado 12 de junio de 2026" (formatted, not raw ISO)
    expect(screen.getByText('Actualizado 12 de junio de 2026')).toBeTruthy();
  });
});
