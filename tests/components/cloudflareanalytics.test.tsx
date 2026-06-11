// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CloudflareAnalytics } from '@/components/CloudflareAnalytics';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('CloudflareAnalytics', () => {
  it('renders the deferred beacon script with the token when the env var is set', () => {
    vi.stubEnv('NEXT_PUBLIC_CF_BEACON_TOKEN', 'tok-test-123');
    const { container } = render(<CloudflareAnalytics />);
    const script = container.querySelector('script[src="https://static.cloudflareinsights.com/beacon.min.js"]');
    expect(script).toBeTruthy();
    expect(script?.getAttribute('defer')).not.toBeNull();
    expect(script?.getAttribute('data-cf-beacon')).toBe('{"token": "tok-test-123"}');
  });

  it('renders nothing when no token is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_CF_BEACON_TOKEN', '');
    const { container } = render(<CloudflareAnalytics />);
    expect(container.querySelector('script')).toBeNull();
  });
});
