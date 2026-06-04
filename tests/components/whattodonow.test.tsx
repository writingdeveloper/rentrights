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
});
