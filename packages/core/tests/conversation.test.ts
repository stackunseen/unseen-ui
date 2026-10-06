import { describe, it, expect, vi } from 'vitest';
import {
  inspectThreadWindow,
  inspectBranchWindow,
  inspectQueueWindow,
  inspectConversationContext,
  inspectConversationPagination,
  inspectConversationWorkspace,
} from '@stackunseen/ui-core/conversation';
import {
  context,
  thread,
  branches,
  item,
} from '../../../tests/fixtures/conversation-navigation.js';

describe('bounded conversation windows', () => {
  it('rejects excess, duplicates, cycles and invalid context rather than silently slicing', () => {
    expect(
      inspectThreadWindow(Array.from({ length: 101 }, (_, i) => ({ ...thread, id: String(i) }))),
    ).toBeUndefined();
    expect(inspectThreadWindow([thread, thread])).toBeUndefined();
    expect(
      inspectBranchWindow([{ ...branches[0]!, parentId: 'review' }, branches[1]!]),
    ).toBeUndefined();
    expect(
      inspectBranchWindow([{ ...branches[0]!, parentId: 'external', parentVersion: '7' }]),
    ).toBeDefined();
    expect(inspectQueueWindow([{ ...item, text: 'x'.repeat(20001) }])).toBeUndefined();
    expect(
      inspectQueueWindow(
        Array.from({ length: 11 }, (_, i) => ({ ...item, id: String(i), text: 'x'.repeat(20000) })),
      ),
    ).toBeUndefined();
    expect(inspectConversationContext({ ...context, threadId: undefined })).toBeUndefined();
  });

  it('does not invoke getters and catches malformed object traps', () => {
    const getter = vi.fn(() => thread);
    const data: unknown[] = [];
    Object.defineProperty(data, '0', { get: getter });
    expect(inspectThreadWindow(data)).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    expect(
      inspectThreadWindow(
        new Proxy([], {
          ownKeys() {
            throw new Error('trap');
          },
        }),
      ),
    ).toBeUndefined();
  });

  it('checks pagination consistency and leaves unknown totals explicit', () => {
    expect(
      inspectConversationPagination(
        { pageIndex: 0, pageSize: 2, totalItems: 4, hasNextPage: true },
        2,
      ),
    ).toBeDefined();
    expect(
      inspectConversationPagination(
        { pageIndex: 0, pageSize: 2, totalItems: 4, hasNextPage: false },
        2,
      ),
    ).toBeUndefined();
    expect(
      inspectConversationPagination(
        { pageIndex: 1, pageSize: 2, totalItems: 3, hasNextPage: true },
        1,
      ),
    ).toBeUndefined();
    expect(inspectConversationPagination({ pageIndex: 0, pageSize: 2 }, 2)).toEqual({
      pageIndex: 0,
      pageSize: 2,
    });
    expect(
      inspectConversationPagination({ pageIndex: Number.MAX_SAFE_INTEGER, pageSize: 100 }, 1),
    ).toBeUndefined();
  });

  it('rejects unsupported checkpoint versions and invalid selection without mutation', () => {
    const value = {
      schemaVersion: 1,
      workspaceId: 'w',
      revision: 1,
      threads: [],
      selection: {},
      view: { query: '', threadPage: 0, branchPage: 0, queuePage: 0, scrollOffset: 0 },
      receipts: [],
    };
    expect(inspectConversationWorkspace(value)).toEqual(value);
    expect(inspectConversationWorkspace({ ...value, schemaVersion: 2 })).toBeUndefined();
    expect(
      inspectConversationWorkspace({ ...value, selection: { branchId: 'missing' } }),
    ).toBeUndefined();
    expect(value.schemaVersion).toBe(1);
  });
});
