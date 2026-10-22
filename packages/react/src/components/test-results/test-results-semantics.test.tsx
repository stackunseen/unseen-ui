import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TestResults, type TestResult } from './test-results.js';

const variants = ['list', 'cards', 'compact'] as const;

describe('test result disclosure semantics', () => {
  it.each(variants)(
    '%s names repeated disclosures and keeps diagnostics keyboard-readable without landmarks',
    async (variant) => {
      const user = userEvent.setup();
      render(
        <TestResults
          variant={variant}
          results={[
            { id: 'search', name: 'search', state: 'failed', detail: 'Expected a search result' },
            { id: 'upload', name: 'upload', state: 'running', detail: 'Awaiting upload receipt' },
          ]}
        />,
      );
      const search = screen.getByRole('button', { name: 'Test details: search' });
      await user.tab();
      expect(search).toHaveFocus();
      await user.keyboard('{Enter}');
      const searchGroup = screen.getByRole('group', { name: 'Test details: search' });
      expect(search).toHaveAttribute('aria-expanded', 'true');
      expect(search).toHaveAttribute('aria-controls', searchGroup.id);
      await user.tab();
      expect(within(searchGroup).getByRole('group', { name: 'search diagnostics' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Test details: upload' })).toHaveFocus();
      await user.keyboard(' ');
      expect(screen.getByRole('group', { name: 'Test details: upload' })).toBeVisible();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeVisible();
      expect(screen.getByText('Running')).toBeVisible();
    },
  );

  it.each(variants)(
    '%s explains bounded diagnostics and preserves disclosure and focus through host reordering',
    async (variant) => {
      const long: TestResult = {
        id: 'long',
        name: 'long output',
        state: 'failed',
        detail: '<script>alert(1)</script>' + 'x'.repeat(12_000) + 'OMITTED_SUFFIX',
      };
      const exact: TestResult = {
        id: 'exact',
        name: 'exact output',
        state: 'passed',
        detail: 'y'.repeat(12_000),
      };
      const { container, rerender } = render(
        <TestResults variant={variant} results={[long, exact]} />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Test details: long output' }));
      await userEvent.click(screen.getByRole('button', { name: 'Test details: exact output' }));
      const diagnostic = screen.getByRole('group', { name: 'long output diagnostics' });
      expect(diagnostic.textContent).toHaveLength(12_000);
      expect(diagnostic).not.toHaveTextContent('OMITTED_SUFFIX');
      expect(container.querySelector('script')).toBeNull();
      expect(diagnostic).toHaveAccessibleDescription(
        'Showing the first 12,000 characters. Additional diagnostics were omitted.',
      );
      expect(screen.getByRole('group', { name: 'exact output diagnostics' })).not.toHaveAttribute(
        'aria-describedby',
      );
      expect(screen.getAllByText(/Additional diagnostics were omitted/)).toHaveLength(1);
      diagnostic.focus();
      rerender(<TestResults variant={variant} results={[exact, { ...long, state: 'running' }]} />);
      expect(screen.getByRole('group', { name: 'long output diagnostics' })).toBe(diagnostic);
      expect(diagnostic).toHaveFocus();
      expect(diagnostic).toHaveAccessibleDescription(
        'Showing the first 12,000 characters. Additional diagnostics were omitted.',
      );
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
      expect(screen.getByText('Running')).toBeVisible();
    },
  );

  it('keeps diagnostic descriptions unique across component instances with repeated host ids', async () => {
    const results: TestResult[] = [
      { id: 'repeated', name: 'repeated', state: 'failed', detail: 'x'.repeat(12_001) },
    ];
    render(
      <>
        <TestResults results={results} />
        <TestResults results={results} />
      </>,
    );
    for (const button of screen.getAllByRole('button', { name: 'Test details: repeated' })) {
      await userEvent.click(button);
    }
    const diagnostics = screen.getAllByRole('group', { name: 'repeated diagnostics' });
    const ids = diagnostics.map((node) => node.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(2);
    for (const diagnostic of diagnostics) {
      expect(diagnostic).toHaveAccessibleDescription(
        'Showing the first 12,000 characters. Additional diagnostics were omitted.',
      );
    }
  });

  it.each(variants)('%s distinguishes loading, empty and bounded host results', (variant) => {
    const results: TestResult[] = Array.from({ length: 301 }, (_, index) => ({
      id: String(index),
      name: `case ${index}`,
      state: index === 300 ? 'failed' : 'passed',
    }));
    const { rerender } = render(<TestResults variant={variant} results={results} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(300);
    expect(screen.queryByText('case 300')).not.toBeInTheDocument();
    expect(screen.getByText('300 passed · 1 failed · 301 total')).toBeVisible();
    expect(screen.getByText('Showing the first 300 results.')).toBeVisible();
    rerender(<TestResults variant={variant} results={results} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading test results');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('Showing the first 300 results.')).not.toBeInTheDocument();
    rerender(<TestResults variant={variant} results={[]} />);
    expect(screen.getByText('No test results reported.')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('preserves explicit host states and displays only finite nonnegative durations', () => {
    render(
      <TestResults
        results={[
          { id: 'passed', name: 'finished', state: 'passed', durationMs: 0 },
          { id: 'failed', name: 'error', state: 'failed', durationMs: 1.5 },
          { id: 'running', name: 'active', state: 'running', durationMs: Number.NaN },
          { id: 'queued', name: 'pending', state: 'queued', durationMs: -1 },
          {
            id: 'skipped',
            name: 'omitted',
            state: 'skipped',
            durationMs: Number.POSITIVE_INFINITY,
          },
        ]}
      />,
    );
    for (const state of ['Passed', 'Failed', 'Running', 'Queued', 'Skipped']) {
      expect(screen.getByText(state)).toBeVisible();
    }
    expect(screen.getAllByText(/ms$/).map((node) => node.textContent)).toEqual(['0ms', '1.5ms']);
  });
});
