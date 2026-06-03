import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, ShareState } from '@/lib/share/code';

describe('encodeShare / decodeShare round-trip', () => {
  it('round-trips address + answers + locale (with leading #)', () => {
    const s: ShareState = {
      address: '1411 Murray Dr, Los Angeles, CA',
      answers: { builtBeforeOct1978: true, isCondo: false },
      locale: 'es',
    };
    expect(decodeShare('#' + encodeShare(s))).toEqual(s);
  });

  it('round-trips a unicode address with no answers and no locale', () => {
    const s: ShareState = { address: '123 Calle Ñandú #4', answers: {} };
    const decoded = decodeShare(encodeShare(s));
    expect(decoded?.address).toBe('123 Calle Ñandú #4');
    expect(decoded?.answers).toEqual({});
    expect(decoded?.locale).toBeUndefined();
  });

  it('encodes only the answers that are set', () => {
    const hash = encodeShare({ address: 'x', answers: { isSeparateHouse: true } });
    expect(hash).toContain('s=1');
    expect(hash).not.toContain('b=');
    expect(hash).not.toContain('c=');
    expect(hash).not.toContain('e=');
  });

  it('maps the short answer keys correctly', () => {
    const decoded = decodeShare('a=x&b=1&c=0');
    expect(decoded?.answers).toEqual({ builtBeforeOct1978: true, isCondo: false });
  });

  it('returns null for an empty or address-less hash', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#')).toBeNull();
    expect(decodeShare('lang=es&b=1')).toBeNull();
    expect(decodeShare('a=%20%20')).toBeNull();
  });

  it('ignores an invalid lang value', () => {
    expect(decodeShare('a=x&lang=fr')?.locale).toBeUndefined();
  });

  it('round-trips the unsure list', () => {
    const encoded = encodeShare({ address: '1 Main St, Los Angeles', answers: { unsure: ['BUILT_BEFORE_OCT_1978', 'IS_CONDO'] } });
    const decoded = decodeShare('#' + encoded);
    expect(decoded?.answers.unsure).toEqual(['BUILT_BEFORE_OCT_1978', 'IS_CONDO']);
  });
});
