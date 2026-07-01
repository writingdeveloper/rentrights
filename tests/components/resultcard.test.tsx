// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

function renderCard(result: RegimeResult, props: { lastVerified?: string; now?: Date } = {}) {
  return render(
    <LocaleProvider initialLocale="en">
      <ResultCard result={result} {...props} />
    </LocaleProvider>,
  );
}

describe('ResultCard', () => {
  it('renders an RSO result: reassurance, title (no "(likely)" dup), confidence, cap, banner — NOT the raw records', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [
        { code: 'IN_LA_CITY' },
        { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
        { code: 'UNITS_COUNT', params: { count: 6 } },
      ],
      questions: [],
    });
    expect(screen.getByText(/You have rights/)).toBeTruthy();
    expect(screen.getByText(/Rent Stabilization Ordinance/)).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText(/Legal annual increase/)).toBeTruthy();
    expect(screen.queryByText(/Built in 1931/)).toBeNull();
    expect(screen.queryByText(/6 units on the parcel/)).toBeNull();
    expect(screen.getByText(/Confirm free with the LA Housing Department/i).textContent).toContain('(866) 557-7368');
  });

  it('routes the banner to LA County DCBA for County regimes', () => {
    renderCard({
      regime: 'COUNTY_RSTPO',
      confidence: 'high',
      reasons: [{ code: 'UNINCORPORATED_COUNTY' }],
      questions: [],
    });
    const banner = screen.getByText(/Confirm free with LA County DCBA/i).textContent ?? '';
    expect(banner).toContain('(800) 593-8222');
    expect(banner).not.toContain('(866) 557-7368');
  });

  it('shows a "Figures verified {date}" freshness badge when the cap is current', () => {
    // 2026-06-11: the RSO 3% cap (2025-07-01→2026-06-30) is current, not stale.
    renderCard(
      { regime: 'RSO', confidence: 'high', reasons: [{ code: 'IN_LA_CITY' }], questions: [] },
      { lastVerified: '2026-06-04', now: new Date('2026-06-11') },
    );
    // EN locale: expects "June 4, 2026" (formatted), not the raw ISO string.
    expect(screen.getByText(/verified June 4, 2026/i)).toBeTruthy();
  });

  it('shows the freshness badge on 2026-07-15 (RSO 3% published, not pending)', () => {
    // 2026-07-15: RSO has value=3 effective 2026-07-01; not stale, so badge shows.
    renderCard(
      { regime: 'RSO', confidence: 'high', reasons: [{ code: 'IN_LA_CITY' }], questions: [] },
      { lastVerified: '2026-06-04', now: new Date('2026-07-15') },
    );
    expect(screen.getByText(/verified June 4, 2026/i)).toBeTruthy();
    expect(screen.queryByText(/pending publication/i)).toBeNull();
  });

  it('renders no freshness badge for non-detailed results even with a lastVerified date', () => {
    renderCard(
      { regime: 'OUT_OF_JURISDICTION', confidence: 'high', reasons: [{ code: 'OUTSIDE_LA' }], questions: [] },
      { lastVerified: '2026-06-04', now: new Date('2026-06-11') },
    );
    expect(screen.queryByText(/verified June 4, 2026/i)).toBeNull();
  });

  it('hides reassurance, confidence, and cap for OUT_OF_JURISDICTION', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText(/You have rights/)).toBeNull();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
    // OOJ gets generic confirm line (no specific phone)
    const confirmEl = document.body.textContent ?? '';
    expect(confirmEl).not.toContain('(866) 557-7368');
    expect(confirmEl).not.toContain('(800) 593-8222');
  });

  // NEW TASK 5 TESTS

  it('shows result.finalAnswer (with check icon label) when questions is empty', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [{ code: 'IN_LA_CITY' }],
      questions: [],
    });
    expect(screen.getByText(/Final answer/i)).toBeTruthy();
    expect(screen.queryByText(/Almost there/i)).toBeNull();
  });

  it('shows result.almostThere when questions exist', () => {
    renderCard({
      regime: 'UNKNOWN',
      confidence: 'low',
      reasons: [],
      questions: ['BUILT_BEFORE_OCT_1978'],
    });
    expect(screen.getByText(/Almost there/i)).toBeTruthy();
    expect(screen.queryByText(/Final answer/i)).toBeNull();
  });

  it('renders the eyebrow label as visible text (not a labelled img) to avoid SR double-announcement', () => {
    // Fix 1: eyebrow icon is now decorative (aria-hidden); the adjacent visible text is the only SR announcement.
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [{ code: 'IN_LA_CITY' }],
      questions: [],
    });
    // The eyebrow text is present as visible text
    expect(screen.getByText(/protected/i)).toBeTruthy();
    // No role="img" with that label — would cause double-announcement
    expect(screen.queryByRole('img', { name: /protected/i })).toBeNull();
  });

  it('renders a $60 example line for RSO (3% cap) on $2,000 default rent within the valid cap period', () => {
    renderCard(
      {
        regime: 'RSO',
        confidence: 'high',
        reasons: [{ code: 'IN_LA_CITY' }],
        questions: [],
      },
      { now: new Date('2026-06-11') },
    );
    // 3% of default $2,000 = $60/mo
    expect(screen.getByText(/\$60/)).toBeTruthy();
    expect(screen.getByText(/example/i)).toBeTruthy();
  });

  it('shows a labelled editable rent input when a single cap exists', () => {
    renderCard(
      {
        regime: 'RSO',
        confidence: 'high',
        reasons: [{ code: 'IN_LA_CITY' }],
        questions: [],
      },
      { now: new Date('2026-06-11') },
    );
    // The label and input must be present and associated
    const label = screen.getByText(/See it for your rent:/i);
    expect(label).toBeTruthy();
    const input = screen.getByRole('spinbutton'); // number input
    expect(input).toBeTruthy();
  });

  it('shows the editable rent field and $ example on 2026-07-15 (RSO 3% published)', () => {
    // RSO has value=3 effective 2026-07-01; $ example and input should render.
    renderCard(
      {
        regime: 'RSO',
        confidence: 'high',
        reasons: [{ code: 'IN_LA_CITY' }],
        questions: [],
      },
      { now: new Date('2026-07-15') },
    );
    expect(screen.getByText(/example/i)).toBeTruthy();
    expect(screen.getByRole('spinbutton')).toBeTruthy();
  });

  it('renders exactly one consolidated honest/confirm line (not multiple banners)', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [{ code: 'IN_LA_CITY' }],
      questions: [],
    });
    const confirmMatches = screen.queryAllByText(/Estimate from public records/i);
    expect(confirmMatches).toHaveLength(1);
  });

  it('confirm line is styled neutral (no amber warning classes) even on high-confidence FINAL path', () => {
    const { container } = renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [{ code: 'IN_LA_CITY' }],
      questions: [],
    });
    // The confirm wrapper must NOT carry the old amber warning classes
    const amberEl = container.querySelector('.border-warning.bg-warning-soft.text-warning');
    expect(amberEl).toBeNull();
    // The confirm text must still be present (legal honesty preserved)
    expect(screen.getByText(/Estimate from public records/i)).toBeTruthy();
    expect(screen.getByText(/Confirm free with the LA Housing Department/i)).toBeTruthy();
  });
});
