// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Icon } from '@/components/Icon';
describe('Icon', () => {
  it('is aria-hidden by default (decorative)', () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
  it('exposes an accessible name when labelled', () => {
    render(<Icon name="shield-check" label="Protected" />);
    expect(screen.getByRole('img', { name: 'Protected' })).toBeTruthy();
  });
});
