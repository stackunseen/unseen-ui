import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MCPServerCard } from './mcp-server-card.js';
import { componentVariants } from '../../shared/variants.js';

// The card shows host states as words: auth-required reads as Sign-in required.
const statusLabel = (status: string) =>
  status === 'auth-required' ? 'Sign-in required' : status[0]!.toUpperCase() + status.slice(1);

describe.each(componentVariants.MCPServerCard)('MCPServerCard %s', (variant) => {
  it('sends connect intent through the current callback and waits for host status', async () => {
    const user = userEvent.setup();
    const originalConnect = vi.fn();
    const currentConnect = vi.fn();
    const disconnect = vi.fn();
    const { rerender } = render(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="disconnected"
        onConnect={originalConnect}
        onDisconnect={disconnect}
      />,
    );
    expect(screen.getByText('CRM sandbox')).toBeVisible();
    expect(screen.getByText('Disconnected')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
    rerender(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="disconnected"
        onConnect={currentConnect}
        onDisconnect={disconnect}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Connect' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(currentConnect).toHaveBeenCalledTimes(1);
    expect(originalConnect).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.getByText('Disconnected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeEnabled();

    rerender(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="connected"
        onDisconnect={disconnect}
      />,
    );
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument();
  });

  it('uses the current disconnect callback without inventing a disconnected result', async () => {
    const user = userEvent.setup();
    const originalDisconnect = vi.fn();
    const currentDisconnect = vi.fn();
    const connect = vi.fn();
    const { rerender } = render(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="connected"
        onDisconnect={originalDisconnect}
        onConnect={connect}
      />,
    );
    rerender(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="connected"
        onDisconnect={currentDisconnect}
        onConnect={connect}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toHaveFocus();
    await user.keyboard(' ');
    expect(currentDisconnect).toHaveBeenCalledTimes(1);
    expect(originalDisconnect).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(screen.getByText('Connected')).toBeVisible();
  });

  it('presents authorization as a host intent and disables it while pending', async () => {
    const user = userEvent.setup();
    const connect = vi.fn();
    const { rerender } = render(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="auth-required"
        onConnect={connect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Authorize connection' }));
    expect(connect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sign-in required')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Authorize connection' })).toBeEnabled();
    rerender(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="auth-required"
        pending
        onConnect={connect}
      />,
    );
    expect(screen.getByRole('button', { name: /^Connecting/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^Connecting/ }));
    expect(connect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sign-in required')).toBeVisible();
  });

  it.each(['disconnected', 'unknown'] as const)(
    'preserves %s while pending, and does not retry when the host releases pending',
    async (status) => {
      const user = userEvent.setup();
      const connect = vi.fn();
      const { rerender } = render(
        <MCPServerCard
          variant={variant}
          name="CRM sandbox"
          status={status}
          pending
          onConnect={connect}
        />,
      );
      expect(screen.getByText(statusLabel(status))).toBeVisible();
      const pending = screen.getByRole('button', { name: /^Connecting/ });
      expect(pending).toBeDisabled();
      await user.click(pending);
      expect(connect).not.toHaveBeenCalled();
      rerender(
        <MCPServerCard variant={variant} name="CRM sandbox" status={status} onConnect={connect} />,
      );
      expect(connect).not.toHaveBeenCalled();
      expect(screen.getByText(statusLabel(status))).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Connect' }));
      expect(connect).toHaveBeenCalledTimes(1);
      expect(screen.getByText(statusLabel(status))).toBeVisible();
    },
  );

  it('blocks disconnect while pending and retains the last host connection state', async () => {
    const disconnect = vi.fn();
    render(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="connected"
        pending
        onDisconnect={disconnect}
      />,
    );
    const button = screen.getByRole('button', { name: 'Disconnect' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.getByText('Connected')).toBeVisible();
  });

  it('exposes no action when the current host state has no applicable callback', () => {
    const callback = vi.fn();
    const { rerender } = render(
      <MCPServerCard
        variant={variant}
        name="CRM sandbox"
        status="connected"
        onConnect={callback}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    for (const status of ['disconnected', 'auth-required', 'unknown'] as const) {
      rerender(
        <MCPServerCard
          variant={variant}
          name="CRM sandbox"
          status={status}
          onDisconnect={callback}
        />,
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText(statusLabel(status))).toBeVisible();
    }
    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps zero distinct from unknown and displays nonnegative safe integer counts', () => {
    const { rerender } = render(
      <MCPServerCard variant={variant} name="CRM sandbox" status="connected" toolCount={0} />,
    );
    expect(screen.getByText('0 tools reported by host')).toBeVisible();
    for (const toolCount of [3, Number.MAX_SAFE_INTEGER]) {
      rerender(
        <MCPServerCard
          variant={variant}
          name="CRM sandbox"
          status="connected"
          toolCount={toolCount}
        />,
      );
      expect(screen.getByText(`${toolCount} tools reported by host`)).toBeVisible();
    }
  });

  it('keeps missing counts unknown independently of a connected transport', () => {
    render(<MCPServerCard variant={variant} name="CRM sandbox" status="connected" />);
    expect(screen.getByText('Tool availability unknown')).toBeVisible();
    expect(screen.queryByText(/tools reported by host/)).not.toBeInTheDocument();
  });

  it.each([NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'does not present invalid tool count %s as a host measurement',
    (toolCount) => {
      render(
        <MCPServerCard
          variant={variant}
          name="CRM sandbox"
          status="connected"
          toolCount={toolCount}
        />,
      );
      expect(screen.getByText('Tool availability unknown')).toBeVisible();
      expect(screen.queryByText(/tools reported by host/)).not.toBeInTheDocument();
    },
  );
});
