// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HowItWorks } from '@/components/HowItWorks';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderHow(locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <HowItWorks />
    </LocaleProvider>,
  );
}

describe('HowItWorks', () => {
  it('renders the section heading (EN)', () => {
    renderHow('en');
    expect(screen.getByText('How it works')).toBeTruthy();
  });

  it('renders all 3 steps (EN)', () => {
    renderHow('en');
    expect(screen.getByText('Enter your address')).toBeTruthy();
    expect(screen.getByText('See your protections & rent cap')).toBeTruthy();
    expect(screen.getByText('Check if an increase is legal')).toBeTruthy();
  });

  it('renders the section heading (ES)', () => {
    renderHow('es');
    expect(screen.getByText('Cómo funciona')).toBeTruthy();
  });

  it('renders all 3 steps (ES)', () => {
    renderHow('es');
    expect(screen.getByText('Ingresa tu dirección')).toBeTruthy();
    expect(screen.getByText('Mira tus protecciones y el tope de alquiler')).toBeTruthy();
    expect(screen.getByText('Comprueba si un aumento es legal')).toBeTruthy();
  });

  it('renders step numbers 1, 2, 3', () => {
    renderHow('en');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
