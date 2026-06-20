// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Hero } from '@/components/Hero';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderHero(locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider initialLocale={locale}>
      <Hero />
    </LocaleProvider>,
  );
}

describe('Hero', () => {
  it('renders the headline text (EN)', () => {
    renderHero('en');
    expect(screen.getByText('You have rights.')).toBeTruthy();
  });

  it('renders the sub text (EN)', () => {
    renderHero('en');
    expect(
      screen.getByText(/Find out which law protects your LA home/),
    ).toBeTruthy();
  });

  it('renders the headline text (ES)', () => {
    renderHero('es');
    expect(screen.getByText('Tienes derechos.')).toBeTruthy();
  });

  it('renders the sub text (ES)', () => {
    renderHero('es');
    expect(
      screen.getByText(/Descubre qué ley protege tu hogar en LA/),
    ).toBeTruthy();
  });

  it('renders exactly one h1', () => {
    const { container } = renderHero();
    expect(container.querySelectorAll('h1').length).toBe(1);
  });
});
