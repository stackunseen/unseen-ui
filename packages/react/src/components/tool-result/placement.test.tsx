import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme, ToolResult } from '@ai-interaction/react';

describe('execution content and contextual actions', () => {
  it.each(['code', 'text', 'expandable'] as const)(
    '%s output keeps bounded safe text reachable by keyboard',
    async (variant) => {
      const output = '<script>alert(1)</script>\n' + 'Long public output\n'.repeat(500);
      render(
        <AITheme>
          <ToolResult
            text={output}
            maxCharacters={1000}
            variant={variant}
            label="Search result preview"
          />
        </AITheme>,
      );
      if (variant === 'expandable')
        await userEvent.click(screen.getByRole('button', { name: 'Inspect tool output' }));
      const preview = screen.getByRole('group', { name: 'Search result preview' });
      expect(preview.tagName).toBe('PRE');
      expect(preview).toHaveAttribute('tabindex', '0');
      expect(preview.textContent).toBe(output.slice(0, 1000));
      expect(screen.getByText(/Preview truncated at 1,000/)).toBeInTheDocument();
      expect(document.querySelector('script')).toBeNull();
      if (variant !== 'expandable') await userEvent.tab();
      else {
        screen.getByRole('button', { name: 'Inspect tool output' }).focus();
        await userEvent.tab();
      }
      expect(preview).toHaveFocus();
    },
  );

  it('expandable output keeps native keyboard disclosure and its labelled group', async () => {
    render(<ToolResult variant="expandable" text="Current host result" label="Review output" />);
    const trigger = screen.getByRole('button', { name: 'Inspect tool output' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const content = screen.getByRole('group', { name: 'Inspect tool output' });
    expect(content).toHaveAttribute('aria-labelledby', trigger.id);
    expect(content.id).toBe(trigger.getAttribute('aria-controls'));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Review output' })).toHaveTextContent(
      'Current host result',
    );
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('group', { name: 'Review output' })).toBeNull();
  });

  it('output retry remains an explicit host request while disclosure has no authority', async () => {
    const retry = vi.fn();
    render(<ToolResult error="Host reported failure" text="Obsolete output" onRetry={retry} />);
    expect(retry).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Tool output preview' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Request retry' }));
    expect(retry).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Host reported failure');
    expect(screen.queryByText('Obsolete output')).toBeNull();
  });
});
