import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TerminalOutput } from '@ai-interaction/react';
import { inspectTerminal, inspectTerminalContext } from './terminal-model.js';

const context = { sessionId: 'session', streamId: 'stream', version: '1' };
describe('terminal snapshots and scoped controls', () => {
  it.each(['submitting', 'acknowledged', 'outcome-unknown'] as const)(
    '%s keeps command submission separate from the process lifecycle',
    (submission) => {
      render(
        <TerminalOutput
          output="output"
          state="running"
          context={context}
          connection="connected"
          submission={submission}
          onRequestStop={() => {}}
          onRequestClear={() => {}}
        />,
      );
      expect(screen.getByRole('button', { name: 'Stop process' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Clear output' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Copy output' })).not.toBeDisabled();
      expect(document.querySelector('[data-part="terminal-output"]')).toHaveAttribute(
        'data-state',
        'running',
      );
    },
  );
  it('preserves exact identity bytes and rejects blank, malformed and executable shapes', () => {
    expect(inspectTerminalContext({ ...context, sessionId: ' session ' })).toEqual({
      ...context,
      sessionId: ' session ',
    });
    for (const id of ['', '   ', '\u0000', '\ud800'])
      expect(inspectTerminalContext({ ...context, streamId: id })).toBeUndefined();
    let read = false;
    const value = { ...context };
    Object.defineProperty(value, 'version', {
      get: () => {
        read = true;
        return '1';
      },
    });
    expect(inspectTerminalContext(value)).toBeUndefined();
    expect(read).toBe(false);
    expect(inspectTerminal('output', 'running', context, 0)).toBeUndefined();
    expect(inspectTerminal('output', 'complete', context, NaN)).toBeUndefined();
  });
  it('bounds untrusted output, strips ANSI and retains an explicit line window', () => {
    const model = inspectTerminal(
      '\x1b[32mpublic\x1b[0m\u0000\n' + 'row\n'.repeat(1200),
      'running',
      context,
    )!;
    expect(model.raw).toContain('\x1b[32m');
    expect(model.lines).toHaveLength(1000);
    expect(model.omittedLines).toBe(202);
    expect(model.text).not.toContain('\x1b');
    expect(inspectTerminal('prefix' + 'x'.repeat(64001), 'running')?.truncated).toBe(true);
    expect(inspectTerminal('😀' + 'x'.repeat(63999), 'running')?.raw.startsWith('\ude00')).toBe(
      false,
    );
  });
  it.each(['console', 'log', 'compact'] as const)(
    '%s keeps host stop/clear requests scoped and non-optimistic',
    async (variant) => {
      const stop = vi.fn(),
        clear = vi.fn(),
        legacy = vi.fn();
      render(
        <TerminalOutput
          variant={variant}
          output="current output"
          state="running"
          context={context}
          connection="connected"
          onStop={legacy}
          onRequestStop={stop}
          onRequestClear={clear}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Stop process' }));
      await userEvent.click(screen.getByRole('button', { name: 'Clear output' }));
      expect(stop).toHaveBeenCalledWith(context);
      expect(clear).toHaveBeenCalledWith(context);
      expect(legacy).not.toHaveBeenCalled();
      expect(screen.getByText('current output')).toBeVisible();
      expect(screen.getByRole('status')).toHaveTextContent('running');
    },
  );
  it.each(['loading', 'denied', 'unavailable', 'error', 'unknown'] as const)(
    '%s hides source and never invokes a supplied renderer',
    (status) => {
      const renderer = vi.fn(() => null);
      render(
        <TerminalOutput
          output="secret fixture"
          command="private command"
          state="running"
          context={context}
          status={status}
          renderOutput={renderer}
          onStop={() => {}}
        />,
      );
      expect(screen.queryByText('secret fixture')).toBeNull();
      expect(screen.queryByText(/private command/)).toBeNull();
      expect(renderer).not.toHaveBeenCalled();
      expect(screen.queryByRole('button')).toBeNull();
    },
  );
  it('keeps disconnected output copyable but pauses host effects and treats stale output separately', () => {
    const props = {
      output: 'public output',
      state: 'running' as const,
      context,
      onRequestStop: vi.fn(),
      onRequestClear: vi.fn(),
    };
    const { rerender } = render(<TerminalOutput {...props} connection="disconnected" />);
    expect(screen.getByRole('button', { name: 'Copy output' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop process' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear output' })).toBeDisabled();
    rerender(<TerminalOutput {...props} status="stale" connection="connected" />);
    expect(screen.getByRole('button', { name: 'Copy output' })).toBeDisabled();
    expect(screen.getByText(/Historical terminal/)).toBeVisible();
  });
  it('discards pending clipboard receipts and old feedback after revoke/restore of identical data', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
    const props = { output: 'output', state: 'running' as const, context };
    const { rerender } = render(<TerminalOutput {...props} />);
    await user.click(screen.getByRole('button', { name: 'Copy output' }));
    rerender(<TerminalOutput {...props} status="denied" />);
    rerender(<TerminalOutput {...props} />);
    await act(async () => {
      finish();
    });
    expect(screen.queryByText('Output copied.')).toBeNull();
    write.mockImplementation(async () => {});
    await user.click(screen.getByRole('button', { name: 'Copy output' }));
    expect(screen.getByText('Output copied.')).toBeVisible();
    rerender(<TerminalOutput {...props} status="denied" />);
    rerender(<TerminalOutput {...props} />);
    expect(screen.queryByText('Output copied.')).toBeNull();
  });
});
