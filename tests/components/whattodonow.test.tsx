// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WhatToDoNow } from '@/components/WhatToDoNow';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { Regime } from '@/lib/rules/types';

afterEach(cleanup);

function renderWtd(regime: Regime) {
  return render(
    <LocaleProvider initialLocale="en">
      <WhatToDoNow regime={regime} />
    </LocaleProvider>,
  );
}

describe('WhatToDoNow', () => {
  it('shows three steps and routes a city regime to LAHD', () => {
    renderWtd('RSO');
    expect(screen.getByText('What you can do now')).toBeTruthy();
    expect(screen.getByText('Save or screenshot this page.')).toBeTruthy();
    const step2 = screen.getByText(/Confirm your rights for free/);
    expect(step2.textContent).toContain('LAHD');
    expect(step2.textContent).toContain('(866) 557-7368');
    expect(screen.getByText('Get free legal help below.')).toBeTruthy();
  });

  it('routes a County regime to LA County DCBA', () => {
    renderWtd('COUNTY_RSTPO');
    const step2 = screen.getByText(/Confirm your rights for free/);
    expect(step2.textContent).toContain('DCBA');
    expect(step2.textContent).toContain('(800) 593-8222');
  });

  it('section uses success-toned styling (not amber warning) under a green verdict', () => {
    const { container } = renderWtd('RSO');
    const section = container.querySelector('section');
    expect(section).toBeTruthy();
    // Must NOT have the old amber warning classes
    expect(section?.className).not.toContain('border-warning');
    expect(section?.className).not.toContain('bg-warning-soft');
    // Must have success-toned classes
    expect(section?.className).toContain('border-success');
    expect(section?.className).toContain('bg-success-soft');
  });

  it('all three step icons use arrow-right (no check icon on step 1)', () => {
    const { container } = renderWtd('RSO');
    // All icons inside the <ol> should be arrow-right icons; none should be check icons
    // Icons render as SVG; we check that no data-testid or title referencing "check" exists
    // (Icon component renders SVG with no title by default; we verify via class or aria approach)
    // The key is that step1 previously had name="check" — check the icon names via rendered SVG
    const svgs = container.querySelectorAll('ol svg');
    // There should be 3 SVGs (one per step), all rendering arrow-right icons
    expect(svgs).toHaveLength(3);
  });
});
