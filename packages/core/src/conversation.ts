import type { SubmissionState } from './types.js';

/** A host-owned view identity, independent of transport and storage. */
export interface ConversationContext {
  workspaceId: string;
  snapshotId: string;
  version: string;
  threadId?: string;
  branchId?: string;
}
export type NavigationAvailability =
  'ready' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown' | 'stale';
export interface ConversationPagination {
  pageIndex: number;
  pageSize: number;
  totalItems?: number;
  hasNextPage?: boolean;
}
export interface ConversationScroll {
  context: ConversationContext;
  query: string;
  offset: number;
}
export interface NavigationOperation {
  context: ConversationContext;
  requestId: string;
  state: SubmissionState;
  detail?: string;
}
export interface ThreadSummary {
  id: string;
  title: string;
  version: string;
  detail?: string;
  pending?: boolean;
  /** Last activity (ISO 8601), used to group threads by date. */
  updatedAt?: string;
  /** Pinned threads list first, in their own group. */
  pinned?: boolean;
}
export interface ConversationBranch {
  id: string;
  label: string;
  parentId?: string;
  parentVersion?: string;
  version: string;
  detail?: string;
}
export interface QueuedMessage {
  id: string;
  version: string;
  text: string;
  state: 'queued' | 'sending' | 'failed' | 'cancelled' | 'sent' | 'outcome-unknown';
  pending?: boolean;
  error?: string;
}
export interface ThreadSelectionRequest {
  context: ConversationContext;
  threadId: string;
  threadVersion: string;
}
export interface ThreadRenameRequest extends ThreadSelectionRequest {
  title: string;
}
export interface BranchSelectionRequest {
  context: ConversationContext;
  branchId: string;
  branchVersion: string;
}
export interface QueueItemRequest {
  context: ConversationContext;
  itemId: string;
  itemVersion: string;
}
export interface QueueEditRequest extends QueueItemRequest {
  text: string;
}
export interface QueueMoveRequest extends QueueItemRequest {
  direction: 'up' | 'down';
}
export interface ConversationPageRequest {
  context: ConversationContext;
  pageIndex: number;
  pageSize: number;
  query?: string;
}
export interface ConversationSearchRequest {
  context: ConversationContext;
  query: string;
}
export interface BranchChangeGuard {
  version: string;
  message: string;
}
export interface ConversationDraft {
  text: string;
  version: string;
}
export interface StoredConversationBranch {
  summary: ConversationBranch;
  draft: ConversationDraft;
  queue: readonly QueuedMessage[];
}
export interface StoredConversationThread {
  summary: ThreadSummary;
  archived: boolean;
  branches: readonly StoredConversationBranch[];
}
export interface ConversationReceipt {
  requestId: string;
  fingerprint: string;
  state: 'acknowledged' | 'rejected';
  revision: number;
  detail?: string;
}
/** A bounded, versioned host checkpoint. Persistence/authorization stay outside core. */
export interface ConversationWorkspace {
  schemaVersion: 1;
  workspaceId: string;
  revision: number;
  threads: readonly StoredConversationThread[];
  selection: { threadId?: string; branchId?: string };
  view: {
    query: string;
    threadPage: number;
    branchPage: number;
    queuePage: number;
    scrollOffset: number;
  };
  receipts: readonly ConversationReceipt[];
}

export const conversationContextKey = (context?: ConversationContext) =>
  context
    ? JSON.stringify([
        context.workspaceId,
        context.threadId,
        context.branchId,
        context.snapshotId,
        context.version,
      ])
    : 'legacy';
export const sameConversationContext = (a: ConversationContext, b: ConversationContext) =>
  conversationContextKey(a) === conversationContextKey(b);
