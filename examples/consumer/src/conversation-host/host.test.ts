// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { ConversationHost } from './host';
import type { ConversationStore } from './store';
import type { ConversationWorkspace } from '@stackunseen/ui-core';
function memory(initial?: unknown) {
  let value = initial,
    tail = Promise.resolve();
  return {
    record: () => structuredClone(value),
    replace: (next: unknown) => {
      value = next;
    },
    owner(): ConversationStore {
      let closed = false;
      return {
        async read() {
          await tail;
          if (closed) throw new Error('closed');
          return structuredClone(value);
        },
        transact(update) {
          const job = tail.then(() => {
            if (closed) throw new Error('closed');
            const next = update(structuredClone(value));
            value = structuredClone(next);
            return structuredClone(next);
          });
          tail = job.then(
            () => {},
            () => {},
          );
          return job;
        },
        close() {
          closed = true;
        },
      };
    },
  };
}
let serial = 0;
const platform = {
  id: () => `request-${++serial}`,
  fingerprint: async (text: string) => createHash('sha256').update(text).digest('hex'),
};
const make = (store: ReturnType<typeof memory>) => new ConversationHost(store.owner(), platform);
function first(host: ConversationHost) {
  const snapshot = host.getSnapshot(),
    thread = snapshot.threads[0]!;
  return { context: snapshot.context, threadId: thread.id, threadVersion: thread.version };
}
describe('injected atomic conversation store, not native IndexedDB proof', () => {
  it('captures immutable draft input before asynchronous fingerprinting', async () => {
    const store = memory();
    let release: (value: string) => void = () => {};
    const host = new ConversationHost(store.owner(), {
      id: () => 'immutable',
      fingerprint: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    await host.connect();
    const value = host.getSnapshot(),
      draft = { ...value.draft!, text: 'Original draft' };
    const result = host.saveDraft(value.context, draft);
    draft.text = 'Mutated later';
    release('a'.repeat(64));
    expect(await result).toBe(true);
    expect(host.getSnapshot().draft?.text).toBe('Original draft');
    host.dispose();
  });
  it('seeds only an absent checkpoint, projects bounded windows and freezes snapshots', async () => {
    const store = memory(),
      host = make(store);
    expect(await host.connect()).toBe(true);
    const value = host.getSnapshot();
    expect(value.threads).toHaveLength(8);
    expect(value.items).toHaveLength(2);
    expect(value.threadPage.totalItems).toBe(24);
    expect(Object.isFrozen(value.threads[0])).toBe(true);
    expect((store.record() as ConversationWorkspace).schemaVersion).toBe(1);
    host.dispose();
  });
  it.each([{ schemaVersion: 2 }, { schemaVersion: 1, privateText: 'Do not overwrite' }])(
    'does not replace an invalid or unsupported checkpoint',
    async (record) => {
      const store = memory(record),
        host = make(store);
      expect(await host.connect()).toBe(false);
      expect(host.getSnapshot().status).toBe('error');
      expect(store.record()).toEqual(record);
      host.dispose();
    },
  );
  it('stores per-branch drafts atomically with selection and resumes them through another owner', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    const firstSnapshot = host.getSnapshot(),
      draft = { ...firstSnapshot.draft!, text: 'Unsaved branch review' };
    const target = firstSnapshot.branches[1]!;
    expect(
      await host.selectBranch(
        { context: firstSnapshot.context, branchId: target.id, branchVersion: target.version },
        draft,
      ),
    ).toBe(true);
    expect(host.getSnapshot().draft?.text).toBe('');
    host.dispose();
    const resumed = make(store);
    await resumed.connect();
    const snapshot = resumed.getSnapshot(),
      main = snapshot.branches[0]!;
    expect(snapshot.selection.branchId).toBe(target.id);
    await resumed.selectBranch(
      { context: snapshot.context, branchId: main.id, branchVersion: main.version },
      snapshot.draft!,
    );
    expect(resumed.getSnapshot().draft?.text).toBe(draft.text);
    resumed.dispose();
  });
  it('rejects a stale writer without losing the newer title or partial draft changes', async () => {
    const store = memory(),
      a = make(store),
      b = make(store);
    await a.connect();
    await b.connect();
    const old = first(b);
    expect(await a.rename({ ...first(a), title: 'Current title' })).toBe(true);
    expect(await b.rename({ ...old, title: 'Stale title' })).toBe(false);
    expect(b.getSnapshot().threads[0]?.title).toBe('Current title');
    expect(b.getSnapshot().operation?.state).toBe('failed');
    expect((store.record() as ConversationWorkspace).revision).toBe(2);
    a.dispose();
    b.dispose();
  });
  it('rejects old draft versions before switching and retains stored selection and queue', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    let snapshot = host.getSnapshot();
    const oldDraft = snapshot.draft!;
    await host.saveDraft(snapshot.context, { ...oldDraft, text: 'Saved' });
    snapshot = host.getSnapshot();
    const branch = snapshot.branches[1]!;
    expect(
      await host.selectBranch(
        { context: snapshot.context, branchId: branch.id, branchVersion: branch.version },
        { ...oldDraft, text: 'Old' },
      ),
    ).toBe(false);
    expect(host.getSnapshot().selection.branchId).toBe('thread-1:main');
    expect(host.getSnapshot().draft?.text).toBe('Saved');
    host.dispose();
  });
  it('keeps a committed but lost acknowledgement unknown and reconciles its original receipt without replay', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    host.loseNextAcknowledgement();
    expect(await host.rename({ ...first(host), title: 'Committed once' })).toBe(false);
    const snapshot = host.getSnapshot();
    expect(snapshot.operation?.state).toBe('outcome-unknown');
    expect(snapshot.threads[0]?.title).toBe('Review the search change');
    expect(await host.refresh()).toBe(false);
    expect(await host.rename({ ...first(host), title: 'Do not replay' })).toBe(false);
    expect(await host.reconcile({ ...snapshot.operation!, requestId: 'wrong' })).toBe(false);
    expect(await host.reconcile(snapshot.operation!)).toBe(true);
    expect(host.getSnapshot().threads[0]?.title).toBe('Committed once');
    expect((store.record() as ConversationWorkspace).revision).toBe(2);
    host.dispose();
  });
  it('retains an unknown receipt across local access revocation and checks it before reopening', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    host.loseNextAcknowledgement();
    await host.rename({ ...first(host), title: 'Saved before revocation' });
    host.setAccess(false);
    expect(host.getSnapshot().threads).toEqual([]);
    host.setAccess(true);
    expect(await host.connect()).toBe(true);
    expect(host.getSnapshot().threads[0]?.title).toBe('Saved before revocation');
    host.dispose();
  });
  it('never enables blind retry if the original receipt is missing', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    host.loseNextAcknowledgement();
    await host.rename({ ...first(host), title: 'Saved' });
    const record = store.record() as ConversationWorkspace;
    record.receipts = [];
    store.replace(record);
    expect(await host.reconcile(host.getSnapshot().operation!)).toBe(false);
    expect(host.getSnapshot().operation?.state).toBe('outcome-unknown');
    expect(await host.refresh()).toBe(false);
    host.dispose();
  });
  it('shares native-style transaction serialization between two injected owners', async () => {
    const store = memory(),
      a = make(store),
      b = make(store);
    await Promise.all([a.connect(), b.connect()]);
    const results = await Promise.all([
      a.rename({ ...first(a), title: 'A' }),
      b.rename({ ...first(b), title: 'B' }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((store.record() as ConversationWorkspace).revision).toBe(2);
    expect(
      (store.record() as ConversationWorkspace).receipts.map((row) => row.state).sort(),
    ).toEqual(['acknowledged', 'rejected']);
    a.dispose();
    b.dispose();
  });
  it('binds request identity to payload and rejects a reused ID for a different command', async () => {
    const store = memory(),
      host = new ConversationHost(store.owner(), { ...platform, id: () => 'fixed' });
    await host.connect();
    await host.rename({ ...first(host), title: 'First' });
    expect(await host.rename({ ...first(host), title: 'Different' })).toBe(false);
    expect(host.getSnapshot().threads[0]?.title).toBe('First');
    expect((store.record() as ConversationWorkspace).receipts).toHaveLength(1);
    host.dispose();
  });
  it('pages, moves across windows, edits and removes only the exact queued version', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    let value = host.getSnapshot();
    expect(await host.page('queue', { context: value.context, pageIndex: 1, pageSize: 2 })).toBe(
      true,
    );
    value = host.getSnapshot();
    const item = value.items[0]!;
    expect(
      await host.move({
        context: value.context,
        itemId: item.id,
        itemVersion: item.version,
        direction: 'up',
      }),
    ).toBe(true);
    const full = (store.record() as ConversationWorkspace).threads[0]!.branches[0]!.queue;
    expect(full[1]?.id).toBe(item.id);
    value = host.getSnapshot();
    const current = value.items[0]!;
    expect(
      await host.edit({
        context: value.context,
        itemId: current.id,
        itemVersion: 'wrong',
        text: 'No',
      }),
    ).toBe(false);
    value = host.getSnapshot();
    expect(
      await host.remove({
        context: value.context,
        itemId: current.id,
        itemVersion: current.version,
      }),
    ).toBe(true);
    host.dispose();
  });
  it('saves queue and clear draft in one checkpoint; no execution or sent state is invented', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    const value = host.getSnapshot();
    expect(await host.enqueue(value.context, { ...value.draft!, text: 'A new local draft' })).toBe(
      true,
    );
    const record = store.record() as ConversationWorkspace;
    expect(record.threads[0]!.branches[0]!.queue.at(-1)?.state).toBe('queued');
    expect(record.threads[0]!.branches[0]!.draft.text).toBe('');
    expect(record.receipts.at(-1)?.state).toBe('acknowledged');
    host.dispose();
  });
  it('aborts a command when a synchronous observer revokes access before submission', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    host.subscribe(() => {
      if (host.getSnapshot().operation?.state === 'submitting') host.setAccess(false);
    });
    expect(await host.rename({ ...first(host), title: 'Never written' })).toBe(false);
    expect((store.record() as ConversationWorkspace).revision).toBe(1);
    expect(host.getSnapshot().status).toBe('denied');
    host.dispose();
  });
  it('closes owned storage and suppresses late connection results', async () => {
    const store = memory(),
      host = make(store);
    const connect = host.connect();
    host.dispose();
    expect(await connect).toBe(false);
    expect(host.getSnapshot().status).toBe('loading');
  });
  it('stores finite scope-bound scroll metadata without changing action revision', async () => {
    const store = memory(),
      host = make(store);
    await host.connect();
    const context = host.getSnapshot().context;
    expect(await host.scroll({ context, query: '', offset: 122 })).toBe(true);
    expect(host.getSnapshot().scroll?.offset).toBe(122);
    expect((store.record() as ConversationWorkspace).revision).toBe(1);
    expect(
      await host.scroll({ context: { ...context, version: 'old' }, query: '', offset: 5 }),
    ).toBe(false);
    host.dispose();
  });
});
