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

  it('renders the passed date in the "Updated" chip', () => {
    renderChips('en', '2026-06-12');
    expect(screen.getByText('Updated 2026-06-12')).toBeTruthy();
  });

  it('renders "Free, nothing saved" chip (EN)', () => {
    renderChips('en');
    expect(screen.getByText('Free, nothing saved')).toBeTruthy();
  });

  it('renders bilingual chip', () => {
    renderChips('en');
    expect(screen.getByText('English / Español')).toBeTruthy();
  });

  it('renders Spanish labels (ES)', () => {
    renderChips('es');
    expect(screen.getByText('Registros públicos')).toBeTruthy();
    expect(screen.getByText('Gratis, no guardamos nada')).toBeTruthy();
  });

  it('renders the date in ES template', () => {
    renderChips('es', '2026-06-12');
    expect(screen.getByText('Actualizado 2026-06-12')).toBeTruthy();
  });
});
