// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { UserAnswers } from '@/lib/rules/types';

afterEach(cleanup);

function renderQs(onAnswer: (a: UserAnswers) => void, answers: UserAnswers = {}) {
  render(
    <LocaleProvider initialLocale="en">
      <ConfirmingQuestions questions={['IS_CONDO']} answers={answers} onAnswer={onAnswer} />
    </LocaleProvider>,
  );
}

describe('ConfirmingQuestions', () => {
  it('renders the rewritten condo question, helper, and three options', () => {
    renderQs(vi.fn());
    expect(screen.getByText(/rental apartment, or a condo someone owns/)).toBeTruthy();
    expect(screen.getByText(/A condo is a unit someone bought/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Rental apartment/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /A condo someone owns/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /I'm not sure/ })).toBeTruthy();
  });

  it('primary option (rental apartment) reports isCondo:false', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByRole('button', { name: /Rental apartment/ }));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: false });
  });

  it('"I\'m not sure" adds the question to unsure and sets no boolean', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByRole('button', { name: /I'm not sure/ }));
    expect(onAnswer).toHaveBeenCalledWith({ unsure: ['IS_CONDO'] });
  });

  it('choosing an explicit answer clears a prior unsure entry for that question', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer, { unsure: ['IS_CONDO'] });
    fireEvent.click(screen.getByRole('button', { name: /A condo someone owns/ }));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: true });
  });

  // NEW TASK 7 TESTS

  it('renders "Question 1 of N" progress text', () => {
    render(
      <LocaleProvider initialLocale="en">
        <ConfirmingQuestions
          questions={['IS_CONDO', 'IS_SEPARATE_HOUSE']}
          answers={{}}
          onAnswer={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText(/Question 1 of 2/i)).toBeTruthy();
    expect(screen.getByText(/Question 2 of 2/i)).toBeTruthy();
  });

  it('renders the reassurance line near the "I\'m not sure" control', () => {
    renderQs(vi.fn());
    expect(screen.getByText(/Not sure\? That's okay/i)).toBeTruthy();
  });
});
