import { describe, it, expect } from 'vitest';
import { PRODUCTION_CSP } from '@/lib/security/csp';

// Parse "name val1 val2; name2 valA" into { name: [vals] }.
const directives = Object.fromEntries(
  PRODUCTION_CSP.split(';').map((d) => {
    const [name, ...vals] = d.trim().split(/\s+/);
    return [name, vals];
  }),
);

describe('PRODUCTION_CSP hardening', () => {
  it('keeps the structural security directives', () => {
    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
    expect(PRODUCTION_CSP).toContain('upgrade-insecure-requests');
  });
});

describe('PRODUCTION_CSP allows GA4 (and only GA4, not ads)', () => {
  it('allows the gtag.js loader in script-src, still self-scoped', () => {
    expect(directives['script-src']).toContain("'self'");
    expect(directives['script-src']).toContain('https://www.googletagmanager.com');
  });

  it('allows the GA4 measurement beacons in connect-src', () => {
    expect(directives['connect-src']).toContain("'self'");
    expect(directives['connect-src']).toContain('https://www.google-analytics.com');
    expect(directives['connect-src']).toContain('https://*.google-analytics.com');
  });

  it('allows the GA4 image-beacon fallback in img-src', () => {
    expect(directives['img-src']).toContain('https://www.google-analytics.com');
    // and keeps the originals
    expect(directives['img-src']).toContain("'self'");
    expect(directives['img-src']).toContain('data:');
  });

  it('does NOT open ad/remarketing domains (ad signals are denied)', () => {
    expect(PRODUCTION_CSP).not.toContain('doubleclick');
    expect(PRODUCTION_CSP).not.toContain('googlesyndication');
    expect(PRODUCTION_CSP).not.toContain('googleadservices');
  });
});
