// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Wordmark } from '@/components/Wordmark';

afterEach(cleanup);

describe('Wordmark', () => {
  it('renders the brand name "RentRights"', () => {
    render(<Wordmark />);
    expect(screen.getByText('RentRights')).toBeTruthy();
  });

  it('contains an aria-hidden element (the key mark)', () => {
    const { container } = render(<Wordmark />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('compact prop still renders "RentRights"', () => {
    render(<Wordmark compact />);
    expect(screen.getByText('RentRights')).toBeTruthy();
  });
});
