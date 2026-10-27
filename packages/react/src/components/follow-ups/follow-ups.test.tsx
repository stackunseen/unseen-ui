import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FollowUps } from './follow-ups.js';
import { StreamingResponse } from '../streaming-response/streaming-response.js';

describe('FollowUps', () => {
  it('offers each item as a button in a named group and only asks', async () => {
    const onSelect = vi.fn();
    render(
      <FollowUps
        items={[
          { id: 'shorter', label: 'Shorter' },
          { id: 'blank', label: '  ' },
        ]}
        onSelect={onSelect}
      />,
    );
    const group = screen.getByRole('group', { name: 'Follow-up actions' });
    expect(group).toHaveTextContent('Then');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Shorter' }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'shorter', label: 'Shorter' });
  });
  it('renders nothing without usable items', () => {
    const { container } = render(<FollowUps items={[]} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('StreamingResponse progress and follow-ups', () => {
  it('shows the step line only while streaming and the follow-ups only once complete', () => {
    const onStop = vi.fn();
    const { rerender } = render(
      <StreamingResponse
        text="Net retention held"
        state="streaming"
        progress={{ label: 'Writing', step: 2, of: 3, from: '142', to: '46' }}
        onStop={onStop}
        followUps={[{ id: 'shorter', label: 'Shorter' }]}
        onFollowUp={() => {}}
      />,
    );
    expect(screen.getByText(/Writing/)).toHaveTextContent('Writing 2 of 3');
    expect(screen.getByText('142 → 46')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Stop Esc' })).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Follow-up actions' })).toBeNull();
    expect(screen.getAllByRole('status').filter((node) => node.textContent?.trim())).toHaveLength(
      1,
    );
    rerender(
      <StreamingResponse
        text="Net retention held"
        state="complete"
        progress={{ label: 'Writing', step: 3, of: 3 }}
        followUps={[{ id: 'shorter', label: 'Shorter' }]}
        onFollowUp={() => {}}
      />,
    );
    expect(screen.queryByText(/Writing/)).toBeNull();
    expect(screen.getByRole('group', { name: 'Follow-up actions' })).toBeVisible();
  });
});
