// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderQs(onAnswer: (a: unknown) => void) {
  render(
    <LocaleProvider initialLocale="en">
      <ConfirmingQuestions questions={['IS_CONDO']} answers={{}} onAnswer={onAnswer} />
    </LocaleProvider>,
  );
}

describe('ConfirmingQuestions', () => {
  it('renders the condo question and reports true for the yes option', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    expect(screen.getByText(/individually-owned condominium/)).toBeTruthy();
    fireEvent.click(screen.getByText('Yes, a condo'));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: true });
  });

  it('reports false for the no option', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByText('No, a rental apartment'));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: false });
  });
});
