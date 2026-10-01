import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AITheme, Citation, SourceCard, StatusBadge, ToolResult } from '@ai-interaction/react';

import { createTheme } from '@ai-interaction/react/theme';
import { source } from '../../apps/docs/lib/fixtures';

describe('controlled interactions', () => {
  it('preserves source access and escapes hostile tool output', () => {
    render(
      <>
        <SourceCard source={{ ...source, access: 'revoked', url: 'javascript:alert(1)' }} />
        <ToolResult text={'<img src=x onerror="alert(1)">'} />
        <StatusBadge state="unrecognized" />
      </>,
    );
    expect(screen.getByText('Source revoked. Content unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
  it('themes portalled content and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(
      <AITheme theme={createTheme({ primary: '#166534' })}>
        <Citation source={source} number={1} />
      </AITheme>,
    );
    const trigger = screen.getByRole('button', { name: /Source 1:/ });
    const scope = trigger.closest('[data-ai-theme]')?.getAttribute('data-ai-theme');
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('[data-ai-theme]')?.getAttribute('data-ai-theme')).toBe(scope);
    expect(within(dialog).getByRole('heading', { name: source.title })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
