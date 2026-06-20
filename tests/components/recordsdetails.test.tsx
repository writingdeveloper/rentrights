// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RecordsDetails } from '@/components/RecordsDetails';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { ReasonItem } from '@/lib/rules/types';

afterEach(cleanup);

function renderDetails(reasons: ReasonItem[]) {
  return render(
    <LocaleProvider initialLocale="en">
      <RecordsDetails reasons={reasons} />
    </LocaleProvider>,
  );
}

describe('RecordsDetails', () => {
  it('renders a closed <details> with the toggle summary and each reason', () => {
    const { container } = renderDetails([
      { code: 'IN_LA_CITY' },
      { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
    ]);
    const details = container.querySelector('details');
    expect(details).toBeTruthy();
    expect(details?.hasAttribute('open')).toBe(false);
    expect(screen.getByText('See the records behind this estimate')).toBeTruthy();
    expect(screen.getByText(/In the City of Los Angeles/)).toBeTruthy();
    expect(screen.getByText(/Built in 1931/)).toBeTruthy();
  });

  it('renders nothing when there are no reasons', () => {
    const { container } = renderDetails([]);
    expect(container.querySelector('details')).toBeNull();
  });

  it('shows the AI/pending-review disclosure note (records.aiNote)', () => {
    renderDetails([{ code: 'IN_LA_CITY' }]);
    expect(screen.getByText(/AI- and statute-checked and pending formal legal-aid review/i)).toBeTruthy();
  });
});
