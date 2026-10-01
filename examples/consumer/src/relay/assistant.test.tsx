import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelayAssistant } from './assistant';
import { ASSISTANT_LIMITS, buildAssistantReply, useAssistantHost } from './assistant-host';
import type { Account } from './data';

const accounts: Account[] = [
  {
    id: 'one',
    name: 'Juniper Labs',
    sector: 'Software',
    owner: 'Maya Chen',
    health: 'Watch',
    arr: 120000,
    renewal: '2026-11-10',
    notes: 'Confirm the rollout timeline.',
    lastContact: '2026-09-28',
  },
  {
    id: 'two',
    name: 'Fieldwork',
    sector: 'Logistics',
    owner: 'Sam Patel',
    health: 'Healthy',
    arr: 80000,
    renewal: '2026-12-01',
    notes: 'The team renewed its training plan.',
    lastContact: '2026-09-30',
  },
];
const first = accounts[0]!;
const second = accounts[1]!;

function finish() {
  act(() => vi.runAllTimers());
}
function send(prompt: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: prompt } });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Enter' });
}
function latestReply() {
  return screen.getAllByRole('article', { name: 'assistant message' }).at(-1)!;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Relay simulated assistant consumer', () => {
  it('labels the simulation and streams a keyboard-submitted account response', () => {
    render(<RelayAssistant accounts={accounts} selectedAccount={first} />);
    expect(screen.getByRole('region', { name: 'AI assistant' })).toBeInTheDocument();
    expect(screen.getByText('Simulated AI')).toBeInTheDocument();
    send('Summarize this account');
    expect(screen.getByRole('button', { name: 'Stop response' })).toBeInTheDocument();
    expect(latestReply()).toHaveTextContent('Preparing a response');
    act(() => vi.advanceTimersByTime(365));
    expect(latestReply()).toHaveTextContent('Juniper Labs');
    expect(latestReply()).not.toHaveTextContent('Confirm the rollout timeline.');
    finish();
    expect(latestReply()).toHaveTextContent('$120,000');
    expect(latestReply()).toHaveTextContent('Confirm the rollout timeline.');
    expect(latestReply()).toHaveTextContent('Maya Chen');
    expect(screen.queryByRole('button', { name: 'Stop response' })).not.toBeInTheDocument();
  });

  it('retains a canceled partial response and does not append late chunks', () => {
    render(<RelayAssistant accounts={accounts} selectedAccount={first} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this account' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    act(() => vi.advanceTimersByTime(430));
    const partial = latestReply().querySelector('[data-part="response"] p')!.textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    finish();
    expect(latestReply().querySelector('[data-part="response"] p')).toHaveTextContent(partial!);
    expect(latestReply()).not.toHaveTextContent('Confirm the rollout timeline.');
    expect(screen.getByText('Canceled. Your partial response is kept above.')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    finish();
    expect(latestReply()).toHaveTextContent('Confirm the rollout timeline.');
    expect(screen.getAllByRole('article', { name: 'user message' })).toHaveLength(1);
  });

  it('simulates one failure and retries the exact original prompt successfully', () => {
    render(<RelayAssistant accounts={accounts} selectedAccount={first} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate error' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draft a follow-up' }));
    finish();
    expect(screen.getByRole('alert')).toHaveTextContent('Simulated error');
    expect(latestReply()).toHaveTextContent('Draft for Juniper Labs');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Unsaved different question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }));
    finish();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(latestReply()).toHaveTextContent('Nothing has been sent.');
    expect(latestReply()).toHaveTextContent('Could we confirm the next steps');
    expect(screen.getAllByRole('article', { name: 'user message' })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Unsaved different question',
    );
  });

  it('clears old context, drafts, and timers when another account is selected', () => {
    const view = render(<RelayAssistant accounts={accounts} selectedAccount={first} />);
    send('Summarize this account');
    act(() => vi.advanceTimersByTime(365));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Old account draft' },
    });
    view.rerender(<RelayAssistant accounts={accounts} selectedAccount={second} />);
    finish();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this account' }));
    finish();
    expect(latestReply()).toHaveTextContent('Fieldwork');
    expect(latestReply()).not.toHaveTextContent('Juniper Labs');
  });

  it('uses edited account data and discards the prior response snapshot', () => {
    const view = render(<RelayAssistant accounts={accounts} selectedAccount={first} />);
    send('Summarize this account');
    finish();
    view.rerender(
      <RelayAssistant
        accounts={accounts}
        selectedAccount={{ ...first, health: 'Healthy', notes: 'The rollout is complete.' }}
      />,
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    send('Summarize this account');
    finish();
    expect(latestReply()).toHaveTextContent('marked Healthy');
    expect(latestReply()).toHaveTextContent('The rollout is complete.');
    expect(latestReply()).not.toHaveTextContent('Confirm the rollout timeline.');
  });

  it('cleans up an active timer on unmount', () => {
    const view = renderHook(() => useAssistantHost(accounts));
    act(() => view.result.current.submit('Summarize the portfolio'));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds prompt submission and retained messages with a visible explanation', () => {
    render(<RelayAssistant accounts={accounts} />);
    send('x'.repeat(ASSISTANT_LIMITS.prompt + 1));
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(
      screen.getByText('Keep your message under 1,000 characters for this demo.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    for (let i = 0; i < 8; i++) {
      send('Summarize the portfolio');
      finish();
    }
    expect(screen.getAllByRole('article')).toHaveLength(ASSISTANT_LIMITS.messages);
    expect(screen.getByText(/Showing the latest six exchanges/)).toBeInTheDocument();
  });

  it('keeps account notes inert and handles unsupported requests without claimed actions', () => {
    render(
      <RelayAssistant
        accounts={accounts}
        selectedAccount={{ ...first, notes: '<img src=x onerror="alert(1)">' }}
      />,
    );
    send('Summarize this account');
    finish();
    expect(latestReply()).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(within(latestReply()).queryByRole('img')).not.toBeInTheDocument();
    send('Delete this account');
    finish();
    expect(latestReply()).toHaveTextContent(
      'It does not answer general questions or make account changes.',
    );
  });

  it('derives priorities from current health labels and bounds large local samples', () => {
    const response = buildAssistantReply('Prioritize renewals', accounts);
    expect(response).toContain('Juniper Labs · Watch');
    expect(response).not.toContain('Fieldwork');
    expect(buildAssistantReply('Draft a follow-up', accounts)).toContain('Select an account');
    expect(buildAssistantReply('Summarize accounts', [])).toContain('no sample accounts');
    const many = Array.from({ length: 120 }, (_, i) => ({
      ...first,
      id: String(i),
      name: 'n'.repeat(5000),
      notes: 'a'.repeat(10000),
    }));
    const bounded = buildAssistantReply('Prioritize renewals', many);
    expect(bounded.length).toBeLessThanOrEqual(ASSISTANT_LIMITS.response);
    expect(bounded).toContain('100 accounts only');
    expect(bounded).toContain('Showing the first five accounts');
  });
});
