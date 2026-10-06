import {
  conversationContextKey,
  sameConversationContext,
  inspectConversationContext,
  inspectConversationWorkspace,
} from '@stackunseen/ui-core/conversation';
import type {
  ConversationWorkspace,
  ConversationContext,
  ConversationPagination,
  ConversationDraft,
  ConversationReceipt,
  ConversationScroll,
  NavigationAvailability,
  NavigationOperation,
  ThreadSummary,
  ConversationBranch,
  QueuedMessage,
  StoredConversationBranch,
  ThreadSelectionRequest,
  ThreadRenameRequest,
  BranchSelectionRequest,
  QueueItemRequest,
  QueueEditRequest,
  QueueMoveRequest,
  ConversationSearchRequest,
  ConversationPageRequest,
} from '@stackunseen/ui-core';
import type { ConversationStore } from './store';

export interface ConversationHostSnapshot {
  status: NavigationAvailability;
  context: ConversationContext;
  threads: readonly ThreadSummary[];
  branches: readonly ConversationBranch[];
  items: readonly QueuedMessage[];
  threadPage: ConversationPagination;
  branchPage: ConversationPagination;
  queuePage: ConversationPagination;
  query: string;
  selection: { threadId?: string; branchId?: string };
  draft?: ConversationDraft;
  scroll?: ConversationScroll;
  operation?: NavigationOperation;
  error?: string;
}
type Command = {
  kind:
    | 'select-thread'
    | 'rename'
    | 'archive'
    | 'select-branch'
    | 'edit'
    | 'remove'
    | 'move'
    | 'enqueue'
    | 'save-draft'
    | 'search'
    | 'page';
  context: ConversationContext;
  id?: string;
  version?: string;
  text?: string;
  direction?: 'up' | 'down';
  draft?: ConversationDraft;
  family?: 'threads' | 'branches' | 'queue';
  pageIndex?: number;
  pageSize?: number;
};
interface Platform {
  id: () => string;
  fingerprint: (text: string) => Promise<string>;
}
const pageSizes = { threads: 8, branches: 4, queue: 2 },
  workspaceId = 'local-conversations';
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach((child) => freeze(child));
    Object.freeze(value);
  }
  return value;
}
function contextOf(record: ConversationWorkspace): ConversationContext {
  return {
    workspaceId: record.workspaceId,
    snapshotId: `workspace-${record.revision}`,
    version: String(record.revision),
    ...record.selection,
  };
}
function seed(): ConversationWorkspace {
  const threads = Array.from({ length: 24 }, (_, i) => {
    const id = `thread-${i + 1}`;
    return {
      summary: {
        id,
        title:
          i === 0
            ? 'Review the search change'
            : i === 1
              ? 'Accessibility audit'
              : `Conversation ${String(i + 1).padStart(2, '0')}`,
        version: '1',
        detail: 'Local example · saved workspace',
      },
      archived: false,
      branches: ['main', 'review'].map((name) => ({
        summary: {
          id: `${id}:${name}`,
          label: name === 'main' ? 'Main' : 'Review',
          version: '1',
          ...(name === 'review' ? { parentId: `${id}:main`, parentVersion: '1' } : {}),
        },
        draft: { text: '', version: '1' },
        queue: Array.from({ length: i === 0 && name === 'main' ? 6 : 1 }, (_, j) => ({
          id: `${id}:${name}:draft-${j + 1}`,
          version: '1',
          text:
            j === 0 ? 'Review keyboard focus in the search change.' : `Add review note ${j + 1}.`,
          state: 'queued' as const,
        })),
      })),
    };
  });
  return {
    schemaVersion: 1,
    workspaceId,
    revision: 1,
    threads,
    selection: { threadId: 'thread-1', branchId: 'thread-1:main' },
    view: { query: '', threadPage: 0, branchPage: 0, queuePage: 0, scrollOffset: 0 },
    receipts: [],
  };
}
function projection(record: ConversationWorkspace): ConversationHostSnapshot {
  const available = record.threads.filter(
    (row) =>
      !row.archived && row.summary.title.toLowerCase().includes(record.view.query.toLowerCase()),
  );
  const selected = record.threads.find(
      (row) => row.summary.id === record.selection.threadId && !row.archived,
    ),
    branch = selected?.branches.find((row) => row.summary.id === record.selection.branchId);
  const threadPage = Math.min(
      record.view.threadPage,
      Math.max(0, Math.ceil(available.length / pageSizes.threads) - 1),
    ),
    branchPage = Math.min(
      record.view.branchPage,
      Math.max(0, Math.ceil((selected?.branches.length ?? 0) / pageSizes.branches) - 1),
    ),
    queuePage = Math.min(
      record.view.queuePage,
      Math.max(0, Math.ceil((branch?.queue.length ?? 0) / pageSizes.queue) - 1),
    );
  const context = contextOf(record);
  return freeze({
    status: 'ready' as const,
    context,
    threads: available
      .slice(threadPage * pageSizes.threads, (threadPage + 1) * pageSizes.threads)
      .map((row) => row.summary),
    branches: (selected?.branches ?? [])
      .slice(branchPage * pageSizes.branches, (branchPage + 1) * pageSizes.branches)
      .map((row) => row.summary),
    items: (branch?.queue ?? []).slice(
      queuePage * pageSizes.queue,
      (queuePage + 1) * pageSizes.queue,
    ),
    threadPage: {
      pageIndex: threadPage,
      pageSize: pageSizes.threads,
      totalItems: available.length,
    },
    branchPage: {
      pageIndex: branchPage,
      pageSize: pageSizes.branches,
      totalItems: selected?.branches.length ?? 0,
    },
    queuePage: {
      pageIndex: queuePage,
      pageSize: pageSizes.queue,
      totalItems: branch?.queue.length ?? 0,
    },
    query: record.view.query,
    selection: { ...record.selection },
    draft: branch?.draft,
    scroll: { context, query: record.view.query, offset: record.view.scrollOffset },
  });
}
const empty = (
  status: NavigationAvailability,
  context: ConversationContext,
  error?: string,
): ConversationHostSnapshot =>
  freeze({
    status,
    context,
    threads: [],
    branches: [],
    items: [],
    threadPage: { pageIndex: 0, pageSize: 8 },
    branchPage: { pageIndex: 0, pageSize: 4 },
    queuePage: { pageIndex: 0, pageSize: 2 },
    query: '',
    selection: {},
    error,
  });
const defaultPlatform: Platform = {
  id: () => crypto.randomUUID(),
  fingerprint: async (text) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
  },
};
export class ConversationHost {
  private snapshot = empty('unknown', { workspaceId, snapshotId: 'unopened', version: '1' });
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private allowed = true;
  private busy = false;
  private loseNext = false;
  private pending?: { requestId: string; fingerprint: string; context: ConversationContext };
  constructor(
    private store: ConversationStore,
    private platform: Platform = defaultPlatform,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: ConversationHostSnapshot) {
    if (this.disposed) return;
    this.snapshot = freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }
  private current(generation: number) {
    return !this.disposed && this.allowed && this.generation === generation;
  }
  private ready(context: ConversationContext) {
    return (
      !this.disposed &&
      this.allowed &&
      !this.busy &&
      this.snapshot.status === 'ready' &&
      !['submitting', 'acknowledged', 'outcome-unknown'].includes(
        this.snapshot.operation?.state ?? 'idle',
      ) &&
      sameConversationContext(context, this.snapshot.context)
    );
  }
  async connect() {
    if (
      this.disposed ||
      !this.allowed ||
      this.busy ||
      this.snapshot.operation?.state === 'outcome-unknown'
    )
      return false;
    const generation = ++this.generation;
    this.busy = true;
    this.publish(empty('loading', this.snapshot.context));
    try {
      if (!this.current(generation)) return false;
      const record = await this.store.transact((raw) => {
        const value = raw === undefined ? seed() : inspectConversationWorkspace(raw);
        if (!value)
          throw new Error(
            'Invalid or unsupported saved conversation checkpoint. Existing data was not replaced.',
          );
        return value;
      });
      if (!this.current(generation)) return false;
      if (this.pending) {
        const receipt = record.receipts.find(
          (row) =>
            row.requestId === this.pending!.requestId &&
            row.fingerprint === this.pending!.fingerprint,
        );
        if (!receipt)
          throw new Error(
            'Original receipt unavailable. This owner cannot resume mutations safely.',
          );
        this.pending = undefined;
        this.publish({
          ...projection(record),
          ...(receipt.state === 'rejected'
            ? {
                operation: {
                  context: contextOf(record),
                  requestId: receipt.requestId,
                  state: 'failed' as const,
                  detail: receipt.detail,
                },
              }
            : {}),
        });
      } else this.publish(projection(record));
      return true;
    } catch (error) {
      if (this.current(generation))
        this.publish(
          empty(
            'error',
            this.snapshot.context,
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'Conversation storage unavailable.',
          ),
        );
      return false;
    } finally {
      this.busy = false;
    }
  }
  async refresh() {
    if (!this.ready(this.snapshot.context)) return false;
    const generation = ++this.generation;
    this.busy = true;
    this.publish(empty('loading', this.snapshot.context));
    try {
      if (!this.current(generation)) return false;
      const record = inspectConversationWorkspace(await this.store.read());
      if (!record) throw new Error('Invalid saved conversation checkpoint.');
      if (!this.current(generation)) return false;
      this.publish(projection(record));
      return true;
    } catch {
      if (this.current(generation))
        this.publish(empty('error', this.snapshot.context, 'Conversation refresh failed.'));
      return false;
    } finally {
      this.busy = false;
    }
  }
  loseNextAcknowledgement() {
    if (this.ready(this.snapshot.context)) this.loseNext = true;
  }
  setAccess(allowed: boolean) {
    if (this.disposed || allowed === this.allowed) return;
    this.allowed = allowed;
    ++this.generation;
    this.publish(
      empty(allowed ? 'unknown' : 'denied', {
        workspaceId,
        snapshotId: `access-${this.generation}`,
        version: String(this.generation),
      }),
    );
  }
  async reconcile(operation: NavigationOperation) {
    if (
      this.disposed ||
      !this.allowed ||
      this.busy ||
      this.snapshot.status !== 'ready' ||
      this.snapshot.operation?.state !== 'outcome-unknown' ||
      !this.pending ||
      operation.requestId !== this.pending.requestId ||
      !sameConversationContext(operation.context, this.pending.context)
    )
      return false;
    const generation = this.generation;
    this.busy = true;
    try {
      const record = inspectConversationWorkspace(await this.store.read());
      if (!this.current(generation) || !record) return false;
      const receipt = record.receipts.find(
        (row) =>
          row.requestId === this.pending!.requestId &&
          row.fingerprint === this.pending!.fingerprint,
      );
      if (!receipt) {
        this.publish({
          ...this.snapshot,
          operation: {
            ...operation,
            detail: 'Original receipt unavailable. Do not resubmit the action blindly.',
          },
        });
        return false;
      }
      this.pending = undefined;
      this.publish({
        ...projection(record),
        ...(receipt.state === 'rejected'
          ? {
              operation: {
                context: contextOf(record),
                requestId: receipt.requestId,
                state: 'failed' as const,
                detail: receipt.detail,
              },
            }
          : {}),
      });
      return true;
    } catch {
      return false;
    } finally {
      this.busy = false;
    }
  }
  private async run(input: Command) {
    const context = inspectConversationContext(input.context);
    if (!context || !this.ready(context)) return false;
    const command: Command = {
      ...input,
      context,
      draft: input.draft ? { text: input.draft.text, version: input.draft.version } : undefined,
    };
    const generation = this.generation,
      requestId = this.platform.id();
    if (!requestId.trim() || requestId.length > 160 || /[\p{Cc}\p{Cs}]/u.test(requestId))
      return false;
    this.busy = true;
    this.publish({
      ...this.snapshot,
      operation: { context: { ...command.context }, requestId, state: 'submitting' },
    });
    try {
      if (!this.current(generation)) return false;
      const fingerprint = await this.platform.fingerprint(
        JSON.stringify([
          command.kind,
          conversationContextKey(command.context),
          command.id,
          command.version,
          command.text,
          command.direction,
          command.draft?.text,
          command.draft?.version,
          command.family,
          command.pageIndex,
          command.pageSize,
        ]),
      );
      if (!this.current(generation)) return false;
      this.pending = { requestId, fingerprint, context: { ...command.context } };
      const record = await this.store.transact((raw) => {
        const previous = inspectConversationWorkspace(raw);
        if (!previous) throw new Error('Invalid saved conversation checkpoint.');
        const existing = previous.receipts.find((row) => row.requestId === requestId);
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw new Error('Request identity reused for a different action.');
          return previous;
        }
        const next = structuredClone(previous);
        let detail: string | undefined;
        if (!sameConversationContext(contextOf(previous), command.context))
          detail = 'Workspace changed. Refresh before requesting against current versions.';
        else if (previous.revision === Number.MAX_SAFE_INTEGER)
          detail = 'Workspace revision limit reached.';
        else {
          try {
            this.apply(next, command, requestId);
            next.revision++;
          } catch (error) {
            detail = error instanceof Error ? error.message : 'Conversation request rejected.';
          }
        }
        const result = detail ? structuredClone(previous) : next;
        const receipt: ConversationReceipt = {
          requestId,
          fingerprint,
          state: detail ? 'rejected' : 'acknowledged',
          revision: result.revision,
          ...(detail ? { detail } : {}),
        };
        result.receipts = [...result.receipts.slice(-99), receipt];
        const valid = inspectConversationWorkspace(result);
        if (!valid) throw new Error('Conversation checkpoint limit or validation failed.');
        return valid;
      });
      if (!this.current(generation)) return false;
      const receipt = record.receipts.find(
        (row) => row.requestId === requestId && row.fingerprint === fingerprint,
      );
      if (!receipt) throw new Error('Original receipt unavailable.');
      if (this.loseNext) {
        this.loseNext = false;
        this.pending = { requestId, fingerprint, context: { ...command.context } };
        this.publish({
          ...this.snapshot,
          operation: { context: { ...command.context }, requestId, state: 'outcome-unknown' },
        });
        return false;
      }
      this.pending = undefined;
      this.publish({
        ...projection(record),
        ...(receipt.state === 'rejected'
          ? {
              operation: {
                context: contextOf(record),
                requestId,
                state: 'failed' as const,
                detail: receipt.detail,
              },
            }
          : {}),
      });
      return receipt.state === 'acknowledged';
    } catch (error) {
      if (this.current(generation)) {
        this.pending = undefined;
        this.publish({
          ...this.snapshot,
          operation: {
            context: { ...command.context },
            requestId,
            state: 'failed',
            detail:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : 'Conversation request failed.',
          },
        });
      }
      return false;
    } finally {
      this.busy = false;
    }
  }
  private apply(record: ConversationWorkspace, command: Command, requestId: string) {
    const currentThread = record.threads.find(
        (row) => row.summary.id === record.selection.threadId && !row.archived,
      ),
      currentBranch = currentThread?.branches.find(
        (row) => row.summary.id === record.selection.branchId,
      ),
      version = String(record.revision + 1);
    const needBranch = (): StoredConversationBranch => {
      if (!currentBranch) throw new Error('Selected branch unavailable.');
      return currentBranch;
    };
    const saveDraft = () => {
      const branch = needBranch();
      if (
        !command.draft ||
        command.draft.version !== branch.draft.version ||
        command.draft.text.length > 20000
      )
        throw new Error('Saved draft changed. Review the current draft version.');
      if (command.draft.text !== branch.draft.text)
        branch.draft = { text: command.draft.text, version };
    };
    if (
      command.kind === 'rename' ||
      command.kind === 'archive' ||
      command.kind === 'select-thread'
    ) {
      const target = record.threads.find((row) => row.summary.id === command.id && !row.archived);
      if (!target || target.summary.version !== command.version)
        throw new Error('Conversation version changed or unavailable.');
      if (command.kind === 'rename') {
        if (!command.text?.trim() || command.text.length > 200)
          throw new Error('Invalid conversation title.');
        target.summary = { ...target.summary, title: command.text.trim(), version };
      }
      if (command.kind === 'archive') {
        target.archived = true;
        target.summary = { ...target.summary, version };
      }
      if (command.kind === 'select-thread') {
        if (currentBranch) saveDraft();
        record.selection = {
          threadId: target.summary.id,
          branchId: target.branches[0]?.summary.id,
        };
        record.view.branchPage = record.view.queuePage = 0;
      }
    } else if (command.kind === 'select-branch') {
      const target = currentThread?.branches.find((row) => row.summary.id === command.id);
      if (!target || target.summary.version !== command.version)
        throw new Error('Branch version changed or unavailable.');
      saveDraft();
      record.selection = { threadId: currentThread!.summary.id, branchId: target.summary.id };
      record.view.queuePage = 0;
    } else if (command.kind === 'save-draft') saveDraft();
    else if (command.kind === 'enqueue') {
      const branch = needBranch();
      saveDraft();
      if (!command.text?.trim() || command.text.length > 20000 || branch.queue.length >= 50)
        throw new Error('Queue text or collection limit exceeded.');
      branch.queue = [
        ...branch.queue,
        { id: requestId, version, text: command.text, state: 'queued' },
      ];
      branch.draft = { text: '', version };
    } else if (['edit', 'remove', 'move'].includes(command.kind)) {
      const branch = needBranch(),
        index = branch.queue.findIndex((row) => row.id === command.id),
        item = branch.queue[index];
      if (
        !item ||
        item.version !== command.version ||
        !['queued', 'failed'].includes(item.state) ||
        item.pending
      )
        throw new Error('Queued item changed or is not editable.');
      const queue = [...branch.queue];
      if (command.kind === 'edit') {
        if (!command.text?.trim() || command.text.length > 20000)
          throw new Error('Invalid queued text.');
        queue[index] = { ...item, text: command.text, version };
      }
      if (command.kind === 'remove') queue.splice(index, 1);
      if (command.kind === 'move') {
        const destination =
          index + (command.direction === 'up' ? -1 : command.direction === 'down' ? 1 : 0);
        if (destination === index || destination < 0 || destination >= queue.length)
          throw new Error('Queue movement outside collection.');
        const other = queue[destination]!;
        queue[destination] = { ...item, version };
        queue[index] = other;
      }
      branch.queue = queue;
    } else if (command.kind === 'search') {
      if (typeof command.text !== 'string' || command.text.length > 200)
        throw new Error('Invalid conversation query.');
      record.view.query = command.text;
      record.view.threadPage = 0;
      record.view.scrollOffset = 0;
    } else if (command.kind === 'page') {
      if (
        !command.family ||
        !Number.isSafeInteger(command.pageIndex) ||
        command.pageIndex! < 0 ||
        command.pageSize !== pageSizes[command.family]
      )
        throw new Error('Invalid conversation page.');
      const total =
        command.family === 'threads'
          ? record.threads.filter(
              (row) =>
                !row.archived &&
                row.summary.title.toLowerCase().includes(record.view.query.toLowerCase()),
            ).length
          : command.family === 'branches'
            ? (currentThread?.branches.length ?? 0)
            : (currentBranch?.queue.length ?? 0);
      if (command.pageIndex! > Math.max(0, Math.ceil(total / command.pageSize) - 1))
        throw new Error('Conversation page unavailable.');
      if (command.family === 'threads') {
        record.view.threadPage = command.pageIndex!;
        record.view.scrollOffset = 0;
      } else if (command.family === 'branches') record.view.branchPage = command.pageIndex!;
      else record.view.queuePage = command.pageIndex!;
    }
  }
  selectThread = (request: ThreadSelectionRequest, draft?: ConversationDraft) =>
    this.run({
      kind: 'select-thread',
      context: request.context,
      id: request.threadId,
      version: request.threadVersion,
      draft,
    });
  rename = (request: ThreadRenameRequest) =>
    this.run({
      kind: 'rename',
      context: request.context,
      id: request.threadId,
      version: request.threadVersion,
      text: request.title,
    });
  archive = (request: ThreadSelectionRequest) =>
    this.run({
      kind: 'archive',
      context: request.context,
      id: request.threadId,
      version: request.threadVersion,
    });
  selectBranch = (request: BranchSelectionRequest, draft: ConversationDraft) =>
    this.run({
      kind: 'select-branch',
      context: request.context,
      id: request.branchId,
      version: request.branchVersion,
      draft,
    });
  edit = (request: QueueEditRequest) =>
    this.run({
      kind: 'edit',
      context: request.context,
      id: request.itemId,
      version: request.itemVersion,
      text: request.text,
    });
  remove = (request: QueueItemRequest) =>
    this.run({
      kind: 'remove',
      context: request.context,
      id: request.itemId,
      version: request.itemVersion,
    });
  move = (request: QueueMoveRequest) =>
    this.run({
      kind: 'move',
      context: request.context,
      id: request.itemId,
      version: request.itemVersion,
      direction: request.direction,
    });
  search = (request: ConversationSearchRequest) =>
    this.run({ kind: 'search', context: request.context, text: request.query });
  page = (family: 'threads' | 'branches' | 'queue', request: ConversationPageRequest) =>
    this.run({
      kind: 'page',
      context: request.context,
      family,
      pageIndex: request.pageIndex,
      pageSize: request.pageSize,
    });
  saveDraft = (context: ConversationContext, draft: ConversationDraft) =>
    this.run({ kind: 'save-draft', context, draft });
  enqueue = (context: ConversationContext, draft: ConversationDraft) =>
    this.run({ kind: 'enqueue', context, draft, text: draft.text });
  async scroll(snapshot: ConversationScroll) {
    if (
      !this.ready(snapshot.context) ||
      !Number.isFinite(snapshot.offset) ||
      snapshot.offset < 0 ||
      snapshot.offset > Number.MAX_SAFE_INTEGER ||
      snapshot.query !== this.snapshot.query
    )
      return false;
    const generation = this.generation;
    try {
      const record = await this.store.transact((raw) => {
        const current = inspectConversationWorkspace(raw);
        if (!current) throw new Error('Invalid checkpoint.');
        if (
          sameConversationContext(contextOf(current), snapshot.context) &&
          current.view.query === snapshot.query
        )
          current.view.scrollOffset = snapshot.offset;
        return current;
      });
      if (
        this.current(generation) &&
        this.ready(snapshot.context) &&
        sameConversationContext(contextOf(record), snapshot.context)
      )
        this.publish({
          ...this.snapshot,
          scroll: {
            context: { ...snapshot.context },
            query: snapshot.query,
            offset: record.view.scrollOffset,
          },
        });
      return true;
    } catch {
      return false;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    ++this.generation;
    this.store.close();
    this.listeners.clear();
    this.pending = undefined;
  }
}
