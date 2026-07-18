import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GA_MEASUREMENT_ID,
  GA_MEASUREMENT_ID,
  isValidGaId,
  analyticsEnabled,
  gaScriptSrc,
  gaInitSnippet,
} from '@/lib/analytics/config';

describe('isValidGaId', () => {
  it('accepts a GA4 Measurement ID', () => {
    expect(isValidGaId('G-9NK7DXF449')).toBe(true);
  });
  it('rejects empty, undefined, UA-style, and truncated ids', () => {
    expect(isValidGaId('')).toBe(false);
    expect(isValidGaId(undefined)).toBe(false);
    expect(isValidGaId(null)).toBe(false);
    expect(isValidGaId('UA-12345-1')).toBe(false);
    expect(isValidGaId('G-')).toBe(false);
  });
});

describe('measurement id', () => {
  it('defaults to the RentRights property id', () => {
    // Deterministic: the committed default is the real RentRights web-stream id.
    expect(DEFAULT_GA_MEASUREMENT_ID).toBe('G-9NK7DXF449');
  });
  it('the resolved id is always a valid GA4 id', () => {
    expect(isValidGaId(GA_MEASUREMENT_ID)).toBe(true);
  });
});

describe('analyticsEnabled', () => {
  it('loads only in production with a valid id', () => {
    expect(analyticsEnabled('production', 'G-9NK7DXF449')).toBe(true);
  });
  it('never loads in development or test (no dev-traffic pollution)', () => {
    expect(analyticsEnabled('development', 'G-9NK7DXF449')).toBe(false);
    expect(analyticsEnabled('test', 'G-9NK7DXF449')).toBe(false);
  });
  it('never loads without a valid id, even in production', () => {
    expect(analyticsEnabled('production', '')).toBe(false);
    expect(analyticsEnabled('production', 'not-a-ga-id')).toBe(false);
  });
});

describe('gaScriptSrc', () => {
  it('builds the gtag.js loader URL for the id', () => {
    expect(gaScriptSrc('G-9NK7DXF449')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-9NK7DXF449',
    );
  });
});

describe('gaInitSnippet', () => {
  it('configures the given id', () => {
    expect(gaInitSnippet('G-9NK7DXF449')).toContain("gtag('config', 'G-9NK7DXF449')");
  });
  it('grants analytics but denies ad storage/personalization (privacy-forward)', () => {
    const s = gaInitSnippet('G-TEST');
    expect(s).toContain("analytics_storage: 'granted'");
    expect(s).toContain("ad_storage: 'denied'");
    expect(s).toContain("ad_user_data: 'denied'");
    expect(s).toContain("ad_personalization: 'denied'");
  });
  it('initializes the dataLayer + gtag js timestamp', () => {
    const s = gaInitSnippet('G-TEST');
    expect(s).toContain('window.dataLayer');
    expect(s).toContain("gtag('js', new Date())");
  });
});
