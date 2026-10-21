import { z } from 'zod';
export { conversationContextKey, sameConversationContext } from './conversation.js';
export type * from './conversation.js';
import type {
  ConversationPagination,
  ConversationScroll,
  NavigationOperation,
  ThreadSummary,
  ConversationBranch,
  QueuedMessage,
  BranchChangeGuard,
  ConversationWorkspace,
} from './conversation.js';
const id = z
  .string()
  .max(160)
  .refine((value) => Boolean(value.trim()) && !/[\p{Cc}\p{Cs}]/u.test(value));
const scope = z
  .object({
    workspaceId: id,
    snapshotId: id,
    version: id,
    threadId: id.optional(),
    branchId: id.optional(),
  })
  .strict()
  .refine((value) => !value.branchId || !!value.threadId);
const thread = z
  .object({
    id,
    title: z.string().min(1).max(200),
    version: id,
    detail: z.string().max(1000).optional(),
    pending: z.boolean().optional(),
    updatedAt: z.iso.datetime().optional(),
    pinned: z.boolean().optional(),
  })
  .strict();
const branch = z
  .object({
    id,
    label: z.string().min(1).max(200),
    parentId: id.optional(),
    parentVersion: id.optional(),
    version: id,
    detail: z.string().max(1000).optional(),
  })
  .strict()
  .refine((value) => !value.parentVersion || !!value.parentId);
const queued = z
  .object({
    id,
    version: id,
    text: z.string().min(1).max(20000),
    state: z.enum(['queued', 'sending', 'failed', 'cancelled', 'sent', 'outcome-unknown']),
    pending: z.boolean().optional(),
    error: z.string().max(1000).optional(),
  })
  .strict();

// Bound plain input before schema traversal. This is not arbitrary proxy isolation.
function bounded(value: unknown, maxDepth = 5, maxValues = 4000) {
  let values = 0,
    units = 0;
  const ancestors = new WeakSet<object>();
  function visit(current: unknown, depth: number): boolean {
    if (++values > maxValues || depth > maxDepth) return false;
    if (typeof current === 'string') {
      units += current.length;
      return current.length <= 20000 && units <= 200000;
    }
    if (current === null || current === undefined || typeof current === 'boolean') return true;
    if (typeof current === 'number') return Number.isFinite(current);
    if (typeof current !== 'object' || ancestors.has(current)) return false;
    const array = Array.isArray(current);
    if (
      array
        ? current.length > 100
        : ![Object.prototype, null].includes(Object.getPrototypeOf(current))
    )
      return false;
    const descriptors = Object.getOwnPropertyDescriptors(current),
      keys = Reflect.ownKeys(descriptors).filter((key) => !array || key !== 'length');
    if (keys.length > (array ? 100 : 16) || keys.some((key) => typeof key !== 'string'))
      return false;
    if (
      array &&
      (keys.length !== current.length || keys.some((key, index) => key !== String(index)))
    )
      return false;
    ancestors.add(current);
    const result = keys.every((key) => {
      const property = descriptors[key as string]!;
      return 'value' in property && visit(property.value, depth + 1);
    });
    ancestors.delete(current);
    return result;
  }
  try {
    return visit(value, 0);
  } catch {
    return false;
  }
}
function inspect<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  if (!bounded(value)) return;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}
export const inspectConversationContext = (value: unknown) => inspect(scope, value);
export function inspectThreadWindow(value: unknown): ThreadSummary[] | undefined {
  const rows = inspect(z.array(thread).max(100), value);
  return rows && new Set(rows.map((row) => row.id)).size === rows.length ? rows : undefined;
}
export function inspectBranchWindow(value: unknown): ConversationBranch[] | undefined {
  const rows = inspect(z.array(branch).max(50), value);
  if (!rows || new Set(rows.map((row) => row.id)).size !== rows.length) return;
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    const ancestors = new Set([row.id]);
    let parent = row.parentId;
    while (parent && byId.has(parent)) {
      if (ancestors.has(parent)) return;
      ancestors.add(parent);
      parent = byId.get(parent)!.parentId;
    }
  }
  return rows;
}
export function inspectQueueWindow(value: unknown): QueuedMessage[] | undefined {
  const rows = inspect(z.array(queued).max(50), value);
  return rows && new Set(rows.map((row) => row.id)).size === rows.length ? rows : undefined;
}
export function inspectConversationPagination(
  value: unknown,
  rowCount: number,
  limit = 100,
): ConversationPagination | undefined {
  const page = inspect(
    z
      .object({
        pageIndex: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        pageSize: z.number().int().min(1).max(limit),
        totalItems: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
        hasNextPage: z.boolean().optional(),
      })
      .strict(),
    value,
  );
  if (!page || rowCount > page.pageSize || !Number.isSafeInteger(page.pageIndex * page.pageSize))
    return;
  if (page.totalItems !== undefined) {
    const start = page.pageIndex * page.pageSize;
    if (
      start + rowCount > page.totalItems ||
      (page.totalItems === 0 ? page.pageIndex !== 0 : start >= page.totalItems)
    )
      return;
    if (
      page.hasNextPage !== undefined &&
      page.hasNextPage !== (page.pageIndex + 1) * page.pageSize < page.totalItems
    )
      return;
  }
  return page;
}
export const inspectConversationScroll = (value: unknown): ConversationScroll | undefined =>
  inspect(
    z
      .object({
        context: scope,
        query: z.string().max(200),
        offset: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
      })
      .strict(),
    value,
  );
export const inspectNavigationOperation = (value: unknown): NavigationOperation | undefined =>
  inspect(
    z
      .object({
        context: scope,
        requestId: id,
        state: z.enum(['idle', 'submitting', 'acknowledged', 'failed', 'outcome-unknown']),
        detail: z.string().max(1000).optional(),
      })
      .strict(),
    value,
  );
export const inspectBranchChangeGuard = (value: unknown): BranchChangeGuard | undefined =>
  inspect(z.object({ version: id, message: z.string().min(1).max(1000) }).strict(), value);

const pageIndex = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const workspace = z
  .object({
    schemaVersion: z.literal(1),
    workspaceId: id,
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    threads: z
      .array(
        z
          .object({
            summary: thread,
            archived: z.boolean(),
            branches: z
              .array(
                z
                  .object({
                    summary: branch,
                    draft: z.object({ text: z.string().max(20000), version: id }).strict(),
                    queue: z.array(queued).max(50),
                  })
                  .strict(),
              )
              .max(4),
          })
          .strict(),
      )
      .max(32),
    selection: z.object({ threadId: id.optional(), branchId: id.optional() }).strict(),
    view: z
      .object({
        query: z.string().max(200),
        threadPage: pageIndex,
        branchPage: pageIndex,
        queuePage: pageIndex,
        scrollOffset: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
      })
      .strict(),
    receipts: z
      .array(
        z
          .object({
            requestId: id,
            fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
            state: z.enum(['acknowledged', 'rejected']),
            revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
            detail: z.string().max(1000).optional(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const fail = () =>
      ctx.addIssue({ code: 'custom', message: 'Invalid conversation checkpoint relationships.' });
    if (
      !inspectThreadWindow(value.threads.map((row) => row.summary)) ||
      new Set(value.receipts.map((row) => row.requestId)).size !== value.receipts.length
    )
      fail();
    for (const row of value.threads) {
      if (!inspectBranchWindow(row.branches.map((branch) => branch.summary))) fail();
      for (const branch of row.branches) if (!inspectQueueWindow(branch.queue)) fail();
    }
    const selected = value.threads.find((row) => row.summary.id === value.selection.threadId);
    if (
      (value.selection.threadId && !selected) ||
      (value.selection.branchId &&
        (!selected ||
          !selected.branches.some((row) => row.summary.id === value.selection.branchId)))
    )
      fail();
    if (value.receipts.some((receipt) => receipt.revision > value.revision)) fail();
  });
export function inspectConversationWorkspace(value: unknown): ConversationWorkspace | undefined {
  if (!bounded(value, 9, 12000)) return;
  const result = workspace.safeParse(value);
  return result.success ? result.data : undefined;
}
