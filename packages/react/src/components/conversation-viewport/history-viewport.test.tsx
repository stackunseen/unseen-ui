import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import { ConversationViewport } from '@stackunseen/ui/viewport';
import { context, row, history } from '../../../../../tests/fixtures/conversation-history.js';

describe('controlled message reading surface', () => {
  it.each(['thread', 'bubble', 'compact'] as const)(
    'renders normal ordered semantic messages in %s',
    (variant) => {
      render(
        <ConversationViewport
          value={history()}
          mode="reading"
          variant={variant}
          renderActions={() => <button aria-label="Edit this message">Edit</button>}
        />,
      );
      expect(screen.getByRole('list', { name: 'Messages' })).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toHaveAttribute('aria-posinset', '1');
      expect(screen.getByRole('listitem')).toHaveAttribute('aria-setsize', '1');
      expect(screen.getByRole('button', { name: 'Edit this message' })).toBeInTheDocument();
      expect(screen.queryByRole('log')).not.toBeInTheDocument();
    },
  );

  it.each(['denied', 'unknown', 'loading', 'error', 'unavailable'] as const)(
    'never inspects or renders protected data during %s',
    (availability) => {
      const getter = vi.fn(() => [row()]),
        input = history();
      Object.defineProperty(input, 'messages', { get: getter });
      render(<ConversationViewport value={input} availability={availability} mode="reading" />);
      expect(getter).not.toHaveBeenCalled();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    },
  );

  it('sends an exact opaque host cursor and locks stale/loading requests', () => {
    const onRequestPage = vi.fn(),
      value = history({
        startIndex: 1,
        totalMessages: 2,
        older: { state: 'available', cursor: 'opaque' },
      });
    const view = render(
      <ConversationViewport value={value} mode="reading" onRequestPage={onRequestPage} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load earlier messages' }));
    expect(onRequestPage).toHaveBeenCalledWith({ context, direction: 'older', cursor: 'opaque' });
    view.rerender(
      <ConversationViewport
        value={value}
        mode="reading"
        availability="stale"
        onRequestPage={onRequestPage}
      />,
    );
    expect(screen.getByRole('button', { name: 'Load earlier messages' })).toBeDisabled();
    view.rerender(
      <ConversationViewport
        value={{ ...value, older: { state: 'loading', cursor: 'opaque' } }}
        mode="reading"
        onRequestPage={onRequestPage}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Load earlier messages' })).not.toBeInTheDocument();
  });

  it('requires a smaller reading window without silently truncating data', () => {
    const messages = Array.from({ length: 201 }, (_, i) => row(String(i)));
    render(
      <ConversationViewport
        value={history({ messages, totalMessages: messages.length })}
        mode="reading"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('up to 200');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('rejects stale and missing logical restoration with explicit outcomes', async () => {
    const onRestoreResult = vi.fn(),
      restore = {
        requestId: 'r',
        context: { ...context, version: 'old' },
        messageId: 'm',
        inset: 0,
      };
    const view = render(
      <ConversationViewport
        value={history()}
        mode="reading"
        restore={restore}
        onRestoreResult={onRestoreResult}
      />,
    );
    expect(onRestoreResult).toHaveBeenCalledWith({
      ...{ requestId: 'r', context: restore.context },
      outcome: 'obsolete',
    });
    view.rerender(
      <ConversationViewport
        value={history()}
        mode="reading"
        restore={{ ...restore, requestId: 'missing', context, messageId: 'absent' }}
        onRestoreResult={onRestoreResult}
      />,
    );
    expect(onRestoreResult).toHaveBeenLastCalledWith({
      requestId: 'missing',
      context,
      outcome: 'missing',
    });
    view.rerender(
      <StrictMode>
        <ConversationViewport
          value={history()}
          mode="reading"
          restore={{ ...restore, requestId: 'current', context }}
          onRestoreResult={onRestoreResult}
        />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(onRestoreResult).toHaveBeenLastCalledWith({
        requestId: 'current',
        context,
        outcome: 'applied',
      }),
    );
    expect(onRestoreResult.mock.calls.filter(([v]) => v.requestId === 'current')).toHaveLength(1);
  });

  it('returns focus after a focused message is removed and after access revocation', () => {
    const renderActions = () => <button aria-label="Edit row">Edit</button>;
    const view = render(
      <ConversationViewport value={history()} mode="reading" renderActions={renderActions} />,
    );
    screen.getByRole('button', { name: 'Edit row' }).focus();
    view.rerender(
      <ConversationViewport
        value={history({ messages: [], totalMessages: 0 })}
        mode="reading"
        renderActions={renderActions}
      />,
    );
    expect(screen.getByRole('group', { name: 'Conversation reading area' })).toHaveFocus();
    view.rerender(
      <ConversationViewport value={history()} mode="reading" renderActions={renderActions} />,
    );
    screen.getByRole('button', { name: 'Edit row' }).focus();
    view.rerender(<ConversationViewport value={history()} mode="reading" availability="denied" />);
    expect(screen.getByRole('region', { name: 'Conversation' })).toHaveFocus();
    expect(screen.queryByText('Public message m')).not.toBeInTheDocument();
  });

  it('server renders full reading content and bounded virtual shell without browser I/O', () => {
    expect(renderToString(<ConversationViewport value={history()} mode="reading" />)).toContain(
      'Public message m',
    );
    expect(renderToString(<ConversationViewport value={history()} />)).toContain(
      'Windowed message rendering',
    );
  });
});
