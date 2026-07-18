import { describe, it, expect } from 'vitest';
import { privacyContent } from '@/lib/legal/privacy';

describe('privacyContent (EN)', () => {
  const p = privacyContent('en');

  it('is titled Privacy and dated', () => {
    expect(p.title).toBe('Privacy');
    expect(p.updatedIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('states plainly that the address and answers are not saved', () => {
    const all = [p.intro, ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(' ').toLowerCase();
    expect(all).toContain('address');
    expect(all).toContain("don't save");
  });

  it('discloses Google Analytics and that ad personalization is off', () => {
    const all = p.sections.flatMap((s) => s.paragraphs).join(' ').toLowerCase();
    expect(all).toContain('google analytics');
    expect(all).toContain('ad');
  });

  it('gives a working Google Analytics opt-out link', () => {
    expect(p.optOutUrl).toBe('https://tools.google.com/dlpage/gaoptout');
    const all = p.sections.flatMap((s) => s.paragraphs).join(' ').toLowerCase();
    expect(all).toContain('opt out');
  });
});

describe('privacyContent (ES)', () => {
  const p = privacyContent('es');

  it('is titled Privacidad in Spanish', () => {
    expect(p.title).toBe('Privacidad');
  });

  it('uses Spanish and still discloses Google Analytics', () => {
    const all = [p.intro, ...p.sections.flatMap((s) => s.paragraphs)].join(' ');
    expect(all).toContain('Google Analytics');
    expect(all.toLowerCase()).toContain('no guardamos');
  });

  it('shares the same opt-out link', () => {
    expect(p.optOutUrl).toBe('https://tools.google.com/dlpage/gaoptout');
  });
});
