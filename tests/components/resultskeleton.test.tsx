// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultSkeleton } from '@/components/ResultSkeleton';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderSkeleton(locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <ResultSkeleton />
    </LocaleProvider>,
  );
}

describe('ResultSkeleton', () => {
  it('renders a role="status" element', () => {
    renderSkeleton();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('the status element contains the loading text (SR-only)', () => {
    renderSkeleton('en');
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/Looking up public records/);
  });

  it('the status element contains the loading text in ES', () => {
    renderSkeleton('es');
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/Buscando registros públicos/);
  });

  it('renders visual skeleton blocks (aria-hidden)', () => {
    const { container } = renderSkeleton();
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
  });
});
