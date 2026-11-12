import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Plan } from './plan.js';
import { ArtifactDiff } from '../artifact-diff/artifact-diff.js';
import { MemoryPanel } from '../memory-panel/memory-panel.js';
import type { MemoryEntry } from '../memory-panel/memory-panel.js';
import { Transcription } from '../transcription/transcription.js';
import { WebPreview } from '../web-preview/web-preview.js';

describe('Plan step states', () => {
  const steps = [
    { id: 'a', label: 'Export activity', state: 'complete' as const },
    { id: 'b', label: 'Ask the owner', state: 'failed' as const, detail: 'Owner declined' },
    { id: 'c', label: 'Notify finance', state: 'skipped' as const },
    { id: 'd', label: 'Archive accounts', state: 'active' as const },
    { id: 'e', label: 'Write the report' },
    { id: 'f', label: 'Old shorthand', done: true },
    { id: 'g', label: 'State wins', done: true, state: 'failed' as const },
  ];

  it('shows each host-reported state, in words for screen readers', () => {
    render(<Plan title="Archive" steps={steps} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual([
      'complete',
      'failed',
      'skipped',
      'active',
      'pending',
      'complete',
      'failed',
    ]);
    expect(items[0]).toHaveTextContent('Export activity (done)');
    expect(items[1]).toHaveTextContent('Ask the owner (failed)Owner declined');
    expect(items[2]).toHaveTextContent('Notify finance (skipped)');
    expect(items[3]).toHaveTextContent('Archive accounts (in progress)');
    expect(items[3]).toHaveAttribute('aria-current', 'step');
    expect(items[4]).toHaveTextContent(/^Write the report$/);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('takes translated state words', () => {
    render(
      <Plan title="Archive" steps={steps.slice(1, 2)} labels={{ failed: 'fehlgeschlagen' }} />,
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('(fehlgeschlagen)');
  });
});

describe('WebPreview loading and host-reported failure', () => {
  it('shows a loading line until the frame loads, and again after a reload', async () => {
    const onReload = vi.fn();
    const { container } = render(<WebPreview url="https://example.com/" onReload={onReload} />);
    const root = container.querySelector('[data-part="web-preview"]')!;
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading preview…');
    fireEvent.load(container.querySelector('iframe')!);
    expect(root).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: 'Reload preview' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading preview…');
  });

  it('treats a new address as loading again', () => {
    const { container, rerender } = render(<WebPreview url="https://example.com/" />);
    fireEvent.load(container.querySelector('iframe')!);
    rerender(<WebPreview url="https://example.com/next" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading preview…');
  });

  it('replaces the frame with the host reason when the page failed, and offers a retry', async () => {
    const onReload = vi.fn();
    const { container } = render(
      <WebPreview
        url="https://example.com/"
        status="failed"
        error="The server returned 502."
        onReload={onReload}
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page did not load. The server returned 502.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('offers no retry when the host says the preview is unavailable', () => {
    render(<WebPreview url="https://example.com/" status="unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This preview is not available right now.');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});

describe('MemoryPanel loading, unavailable and receipts by action', () => {
  const entry: MemoryEntry = {
    id: 'm1',
    text: 'Prefers metric units',
    scope: 'user',
    source: { kind: 'person', label: 'Settings', at: '2026-10-01T09:00:00Z' },
    pinned: true,
  };
  const base = { entries: [entry], query: '', onQueryChange: () => {}, onRequest: () => {} };

  it('says it is loading without claiming the memory is empty', () => {
    const { container } = render(<MemoryPanel {...base} entries={[]} status="loading" />);
    expect(container.querySelector('[data-part="memory-panel"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByText('Loading memories…')).toBeVisible();
    expect(screen.queryByText('Nothing is remembered yet.')).toBeNull();
    expect(container).not.toHaveTextContent('0 saved');
  });

  it('keeps rows readable but not actionable when memory is unavailable', async () => {
    const onRetry = vi.fn();
    const onRequest = vi.fn();
    render(
      <MemoryPanel
        {...base}
        onRequest={onRequest}
        status="unavailable"
        error="The memory service timed out."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Memory is not available right now. The memory service timed out.',
    );
    expect(screen.getByText('Prefers metric units')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Unpin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Forget' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('names what was not done when the receipt carries the action', () => {
    const row = () => within(screen.getByRole('group', { name: /Prefers metric/ }));
    const receipt = { commandId: 'c1', status: 'failed' as const };
    const { rerender } = render(
      <MemoryPanel {...base} receipts={{ m1: { ...receipt, action: 'forget' } }} />,
    );
    expect(row().getByRole('status')).toHaveTextContent('Not forgotten');
    rerender(<MemoryPanel {...base} receipts={{ m1: { ...receipt, action: 'unpin' } }} />);
    expect(row().getByRole('status')).toHaveTextContent('Still pinned');
    rerender(<MemoryPanel {...base} receipts={{ m1: receipt }} />);
    expect(row().getByRole('status')).toHaveTextContent('Not changed');
  });

  it('renders at most 200 rows and says how to see the rest', () => {
    const many = Array.from({ length: 205 }, (_, index) => ({
      ...entry,
      id: `m${index}`,
      text: `Memory ${index}`,
      pinned: false,
    }));
    render(<MemoryPanel {...base} entries={many} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(200);
    expect(screen.getByText('Showing 200 of 205. Filter to narrow the list.')).toBeVisible();
  });
});

describe('Transcription follow and in-progress', () => {
  const segments = [
    { id: '1', start: 0, end: 4, text: 'Welcome back.' },
    { id: '2', start: 4, end: 8, text: 'Thanks for having me.' },
  ];

  it('scrolls the played segment into view only when asked to follow', () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    scroll.mockClear();
    const { rerender } = render(<Transcription segments={segments} currentTime={1} />);
    rerender(<Transcription segments={segments} currentTime={5} />);
    expect(scroll).not.toHaveBeenCalled();
    rerender(<Transcription segments={segments} currentTime={5} follow />);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
    // Time moving inside the same segment does not scroll again.
    rerender(<Transcription segments={segments} currentTime={6} follow />);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<Transcription segments={segments} currentTime={1} follow />);
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it('does not move the page while the person is using the transcript', () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const { rerender } = render(
      <Transcription segments={segments} currentTime={1} follow onSeek={() => {}} />,
    );
    scroll.mockClear();
    screen.getByRole('button', { name: /Welcome back/ }).focus();
    rerender(<Transcription segments={segments} currentTime={5} follow onSeek={() => {}} />);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('says more is coming while transcribing, instead of "no transcript"', () => {
    const { container, rerender } = render(<Transcription segments={[]} status="in-progress" />);
    expect(container.querySelector('[data-part="transcription"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Transcribing…');
    expect(screen.queryByText('No transcript yet.')).toBeNull();
    rerender(<Transcription segments={segments} status="in-progress" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Transcribing…');
    rerender(<Transcription segments={segments} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('says when no transcript could be produced', () => {
    render(<Transcription segments={[]} status="unavailable" />);
    expect(screen.getByText('No transcript is available for this recording.')).toBeVisible();
  });
});

describe('ArtifactDiff revoked version', () => {
  it('names the version whose access was withdrawn', () => {
    const versions = [
      { id: 'v1', label: 'Version 1', text: 'one\n', author: 'Planner', access: 'available' },
      { id: 'v3', label: 'Version 3', text: 'three\n', author: 'Editor', access: 'revoked' },
    ] as const;
    const { container } = render(
      <ArtifactDiff
        path="notes.md"
        versions={versions}
        beforeId="v1"
        afterId="v3"
        onVersionsChange={() => {}}
      />,
    );
    expect(
      screen.getByText('Access to Version 3 was withdrawn, so its text is not shown.'),
    ).toBeVisible();
    expect(container).not.toHaveTextContent('three');
  });
});
