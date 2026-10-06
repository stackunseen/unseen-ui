import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ThreadList } from '@stackunseen/ui';
import { context, thread } from '../../../../../tests/fixtures/conversation-navigation.js';

describe('controlled navigation and compact contextual actions', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s scopes row selection and rename to current immutable versions without optimism',
    async (variant) => {
      const select = vi.fn(),
        rename = vi.fn(),
        legacy = vi.fn();
      render(
        <ThreadList
          variant={variant}
          context={context}
          threads={[thread]}
          query=""
          selectedId="other"
          onRequestSelect={select}
          onSelect={legacy}
          onRequestRename={rename}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Review change' }));
      expect(select).toHaveBeenCalledWith({ context, threadId: 'thread', threadVersion: '1' });
      expect(legacy).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Review change' })).not.toHaveAttribute(
        'aria-current',
      );
      const icon = screen.getByRole('button', { name: 'Rename Review change' });
      await userEvent.click(icon);
      const field = screen.getByRole('textbox', { name: 'Conversation title' });
      expect(field).toHaveFocus();
      await userEvent.clear(field);
      await userEvent.type(field, 'Renamed');
      await userEvent.click(screen.getByRole('button', { name: 'Save title' }));
      expect(rename).toHaveBeenCalledWith({
        context,
        threadId: 'thread',
        threadVersion: '1',
        title: 'Renamed',
      });
      expect(icon).toHaveFocus();
      expect(screen.getByText('Review change')).toBeVisible();
    },
  );

  it('does not fall back to legacy callbacks when scoped handler lacks a valid context', async () => {
    const callback = vi.fn();
    render(
      <ThreadList
        threads={[thread]}
        query=""
        onSelect={callback}
        onRequestSelect={callback}
        onQueryChange={callback}
        onRequestSearch={callback}
      />,
    );
    expect(screen.getByRole('button', { name: 'Review change' })).toBeDisabled();
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps stale data readable while locking changes, and rejects invalid full windows', () => {
    const { rerender } = render(
      <ThreadList
        context={context}
        status="stale"
        threads={[thread]}
        query=""
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Review change')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review change' })).toBeDisabled();
    rerender(<ThreadList context={context} threads={[thread, thread]} query="" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or excessive');
    expect(screen.queryByText('Review change')).toBeNull();
  });

  it('hides an old editor across workspace replacement and blocks version conflicts', async () => {
    const save = vi.fn();
    const { rerender } = render(
      <ThreadList context={context} threads={[thread]} query="" onRequestRename={save} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rename Review change' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Conversation title' }),
      ' private draft',
    );
    rerender(
      <ThreadList
        context={context}
        threads={[{ ...thread, version: '2' }]}
        query=""
        onRequestRename={save}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save title' })).toBeDisabled();
    rerender(
      <ThreadList
        context={{ ...context, workspaceId: 'other' }}
        threads={[thread]}
        query=""
        onRequestRename={save}
      />,
    );
    expect(screen.queryByRole('textbox', { name: 'Conversation title' })).toBeNull();
    expect(screen.queryByText('private draft')).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('requests exact pages and scoped scroll snapshots; refuses stale restoration', async () => {
    const page = vi.fn(),
      scroll = vi.fn();
    const { rerender } = render(
      <ThreadList
        context={context}
        threads={[thread]}
        query=""
        pagination={{ pageIndex: 0, pageSize: 1, totalItems: 2 }}
        onRequestPage={page}
        onScrollSnapshotChange={scroll}
        scrollRestoration={{ context, query: '', offset: 24 }}
      />,
    );
    const window = screen.getByRole('group', { name: 'Conversations window' });
    fireEvent.scroll(window, { target: { scrollTop: 33 } });
    expect(scroll).toHaveBeenCalledWith({ context, query: '', offset: 33 });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(page).toHaveBeenCalledWith({ context, pageIndex: 1, pageSize: 1, query: '' });
    rerender(
      <ThreadList
        context={{ ...context, version: '2' }}
        threads={[thread]}
        query=""
        scrollRestoration={{ context, query: '', offset: 24 }}
      />,
    );
    expect(screen.getByText(/Scroll position belongs/)).toBeVisible();
  });

  it('checks the original unknown request instead of enabling changes', async () => {
    const reconcile = vi.fn();
    const operation = { context, requestId: 'original', state: 'outcome-unknown' as const };
    render(
      <ThreadList
        context={context}
        threads={[thread]}
        query=""
        operation={operation}
        onReconcile={reconcile}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Review change' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Check conversation request' }));
    expect(reconcile).toHaveBeenCalledWith(operation);
  });
});
