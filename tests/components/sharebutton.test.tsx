// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from '@/components/ShareButton';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(() => {
  cleanup();
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

describe('ShareButton', () => {
  it('copies a hash link to the clipboard and shows the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <LocaleProvider initialLocale="en">
        <ShareButton address="1411 Murray Dr" answers={{}} locale="en" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/includes the address you entered/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() => expect(screen.getByText('Copied!')).toBeTruthy());
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('#a=1411');
  });
});
