import { describe, it, expect } from 'vitest';
import { pickInitialLocale } from '@/lib/i18n/detect';

describe('pickInitialLocale', () => {
  it('honors a valid cookie first', () => {
    expect(pickInitialLocale('es', 'en-US,en')).toBe('es');
    expect(pickInitialLocale('en', 'es')).toBe('en');
  });
  it('ignores an invalid cookie and uses Accept-Language', () => {
    expect(pickInitialLocale('xx', 'es-MX,es;q=0.9')).toBe('es');
  });
  it('detects Spanish from Accept-Language when no cookie', () => {
    expect(pickInitialLocale(undefined, 'es-ES,es;q=0.9,en;q=0.8')).toBe('es');
  });
  it('defaults to English', () => {
    expect(pickInitialLocale(undefined, 'en-US,en')).toBe('en');
    expect(pickInitialLocale(undefined, null)).toBe('en');
  });
});
