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

  it('renders the reassurance line (once) in the callout', () => {
    renderQs(vi.fn());
    expect(screen.getByText(/Not sure\? That's okay/i)).toBeTruthy();
  });

  it('renders the reassurance line exactly once even with 2 questions (no duplication)', () => {
    render(
      <LocaleProvider initialLocale="en">
        <ConfirmingQuestions
          questions={['IS_CONDO', 'IS_SEPARATE_HOUSE']}
          answers={{}}
          onAnswer={vi.fn()}
        />
      </LocaleProvider>,
    );
    const matches = screen.queryAllByText(/Not sure\? That's okay/i);
    expect(matches).toHaveLength(1);
  });

  // Fix 3: WCAG 1.3.1 — question card grouping
  it('wraps each question card in role="group" labelled by the question text (WCAG 1.3.1)', () => {
    render(
      <LocaleProvider initialLocale="en">
        <ConfirmingQuestions
          questions={['IS_CONDO', 'IS_SEPARATE_HOUSE']}
          answers={{}}
          onAnswer={vi.fn()}
        />
      </LocaleProvider>,
    );
    const groups = screen.getAllByRole('group');
    // Each question card is a group; heading <h2> is also a group boundary but we only care about the question divs
    const questionGroups = groups.filter((g) =>
      g.getAttribute('aria-labelledby')?.startsWith('question-label-'),
    );
    expect(questionGroups).toHaveLength(2);
    // The labelled-by id points to the question text element
    for (const group of questionGroups) {
      const labelId = group.getAttribute('aria-labelledby')!;
      const labelEl = document.getElementById(labelId);
      expect(labelEl).toBeTruthy();
      expect(labelEl?.tagName.toLowerCase()).toBe('p');
    }
  });
});
