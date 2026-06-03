import { describe, it, expect } from 'vitest';
import { translate } from '@/lib/i18n/t';

const en = { 'a.b': 'Hello {name}', 'plain': 'Plain' };
const es = { 'a.b': 'Hola {name}' };

describe('translate', () => {
  it('looks up a key in the given messages', () => {
    expect(translate(en, 'plain')).toBe('Plain');
  });
  it('interpolates {params}', () => {
    expect(translate(es, 'a.b', { name: 'Ana' })).toBe('Hola Ana');
  });
  it('falls back to the fallback dict when the key is missing', () => {
    expect(translate(es, 'plain', undefined, en)).toBe('Plain');
  });
  it('returns the key itself when missing everywhere', () => {
    expect(translate(es, 'nope', undefined, en)).toBe('nope');
  });
  it('leaves unknown {tokens} untouched', () => {
    expect(translate(en, 'a.b')).toBe('Hello {name}');
  });
});
