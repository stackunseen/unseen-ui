import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolCall } from './tool-call.js';
import { ToolGroup } from '../tool-group/tool-group.js';

describe('ToolCall row', () => {
  it('reads as one line with the host label, target and duration, details on request', async () => {
    render(
      <ToolCall
        variant="row"
        value={{
          name: 'search_accounts',
          label: 'Searched accounts',
          target: 'inactive 90 days',
          input: '{"days":90}',
          output: '3 accounts',
          state: 'succeeded',
          durationMs: 1240,
        }}
      />,
    );
    const row = screen.getByRole('button', { name: /Searched accounts/ });
    expect(row).toHaveTextContent('inactive 90 days');
    expect(row).toHaveTextContent('1.2 s');
    expect(row).toHaveTextContent('Complete');
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3 accounts')).not.toBeVisible();
    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'search_accounts input preview' })).toHaveTextContent(
      '{"days":90}',
    );
  });

  it('falls back to the tool name, shows no unsettled duration and keeps failures in view', () => {
    render(
      <ToolGroup
        variant="list"
        tools={[
          { name: 'read_handbook', state: 'running', durationMs: 300 },
          { name: 'archive', state: 'failed', error: 'Connector failure' },
        ]}
      />,
    );
    const running = screen.getByRole('button', { name: /read_handbook/ });
    expect(running).not.toHaveTextContent('300 ms');
    expect(screen.getByRole('alert')).toHaveTextContent('Connector failure');
    expect(screen.getByText('Failed')).toBeVisible();
  });
});
