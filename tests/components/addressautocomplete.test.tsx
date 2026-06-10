// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch(suggestions: string[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions }) }));
}

function Harness({ onSelect }: { onSelect: (a: string) => void }) {
  const [v, setV] = useState('');
  return (
    <LocaleProvider initialLocale="en">
      <AddressAutocomplete value={v} onChange={setV} onSelect={onSelect} />
    </LocaleProvider>
  );
}

describe('AddressAutocomplete', () => {
  // The placeholder is not a reliable accessible name (WCAG 4.1.2): the
  // site's primary control must expose a real label to screen readers.
  it('exposes an accessible name on the address combobox', () => {
    mockFetch([]);
    render(<Harness onSelect={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Street address' })).toBeTruthy();
  });

  it('shows suggestions after typing ≥4 chars', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA', '300 South Santa Fe Avenue, Long Beach, CA']);
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300 s santa fe' } });
    expect(await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA')).toBeTruthy();
    expect(screen.getByText('300 South Santa Fe Avenue, Long Beach, CA')).toBeTruthy();
  });

  it('selecting a suggestion calls onSelect with the full label', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA']);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300 s santa fe' } });
    const opt = await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA');
    fireEvent.mouseDown(opt);
    expect(onSelect).toHaveBeenCalledWith('300 South Santa Fe Avenue, Los Angeles, CA');
  });

  it('ArrowDown + Enter selects the first suggestion', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA']);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '300 s santa fe' } });
    await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('300 South Santa Fe Avenue, Los Angeles, CA');
  });

  it('does not query or open for queries under 4 chars', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300' } });
    await new Promise((r) => setTimeout(r, 350));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ignores a stale (out-of-order) response', async () => {
    let resolveFirst!: (v: unknown) => void;
    const firstPromise = new Promise((r) => { resolveFirst = r; });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPromise) // request A — resolves later
      .mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: async () => ({ suggestions: ['FRESH, Los Angeles, CA'] }) }),
      ); // request B — resolves first
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness onSelect={vi.fn()} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '300 s santa' } });
    await new Promise((r) => setTimeout(r, 300)); // let A's debounce fire (A now in flight)
    fireEvent.change(input, { target: { value: '300 s santa fe' } });
    await screen.findByText('FRESH, Los Angeles, CA'); // B resolved
    resolveFirst({ ok: true, json: async () => ({ suggestions: ['STALE, Pasadena, CA'] }) }); // A resolves late
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('STALE, Pasadena, CA')).toBeNull();
    expect(screen.getByText('FRESH, Los Angeles, CA')).toBeTruthy();
  });

  it('does not reopen the dropdown after selecting a suggestion', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA']);
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300 s santa fe' } });
    const opt = await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA');
    fireEvent.mouseDown(opt);
    await new Promise((r) => setTimeout(r, 350)); // past the debounce window
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not open the dropdown when the value is set programmatically (shared-link restore)', async () => {
    // A non-empty value arrives without any user typing (no onChange) — e.g. a
    // share link restoring the address on mount. The dropdown must stay closed.
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: ['846 South Broadway, Los Angeles, CA'] }) });
    vi.stubGlobal('fetch', fetchSpy);
    render(
      <LocaleProvider initialLocale="en">
        <AddressAutocomplete value="846 S Broadway, Los Angeles" onChange={vi.fn()} onSelect={vi.fn()} />
      </LocaleProvider>,
    );
    await new Promise((r) => setTimeout(r, 350)); // past the debounce window
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
