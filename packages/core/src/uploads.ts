import { z } from 'zod';
import type { SubmissionState } from './types.js';

export type AttachmentState =
  | 'selected'
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'removing'
  | 'outcome-unknown'
  | 'cancelled'
  | 'removed';
export type AttachmentAccess = 'available' | 'revoked' | 'expired' | 'missing';
/** Immutable resource/session identity; display names and paths are never authority. */
export interface UploadContext {
  workspaceId: string;
  threadId?: string;
  attachmentId: string;
  version: string;
  uploadId: string;
}
export interface UploadFileInfo {
  name: string;
  mediaType: string;
  sizeBytes: number;
}
export interface UploadCapabilities {
  resume: 'supported' | 'unsupported' | 'unknown';
  cancel: boolean;
  remove: boolean;
  maxFileBytes: number;
  maxChunkBytes: number;
  source: string;
  version: string;
}
export interface UploadCheckpoint extends UploadFileInfo {
  context: UploadContext;
  revision: number;
  state: Exclude<AttachmentState, 'removing' | 'outcome-unknown'>;
  access: AttachmentAccess;
  /** Host-confirmed committed byte offset, not client transfer progress. */
  receivedBytes: number;
  /** Expected immutable complete-file SHA-256, bound before accepting bytes. */
  sha256: string;
  capabilities: UploadCapabilities;
  detail?: string;
}
interface UploadCommandBase {
  commandId: string;
  context: UploadContext;
  expectedRevision: number;
}
export type UploadCommand = UploadCommandBase &
  (
    | { operation: 'begin'; file: UploadFileInfo; sha256: string }
    | { operation: 'append'; offset: number; byteLength: number; sha256: string }
    | { operation: 'complete'; sha256: string }
    | { operation: 'cancel' | 'remove' }
  );
export interface UploadReceipt {
  command: UploadCommand;
  outcome: 'applied' | 'rejected' | 'unknown' | 'not-found';
  /** Historical checkpoint at this command; do not regress a newer current checkpoint. */
  checkpoint?: UploadCheckpoint;
  detail?: string;
}
export interface UploadOperation {
  command: UploadCommand;
  state: SubmissionState;
  detail?: string;
}
/** UI intent. The host/transport allocates command IDs and checks authority again. */
export interface UploadActionRequest {
  context: UploadContext;
  expectedRevision: number;
  action: 'upload' | 'resume' | 'cancel' | 'remove' | 'refresh';
}
export type UploadOpenRequest = Pick<UploadActionRequest, 'context' | 'expectedRevision'>;
export const uploadDataLimits = Object.freeze({ units: 20_000, values: 500, depth: 7 });
const id = z
  .string()
  .min(1)
  .max(160)
  .refine((v) => !!v.trim() && !/[\p{Cc}\p{Cs}]/u.test(v));
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positive = count.refine((v) => v > 0);
const context = z.strictObject({
  workspaceId: id,
  threadId: id.optional(),
  attachmentId: id,
  version: id,
  uploadId: id,
});
const file = z.strictObject({
  name: z
    .string()
    .min(1)
    .max(255)
    .refine((v) => !!v.trim() && !/[\p{Cc}\p{Cs}]/u.test(v)),
  mediaType: z
    .string()
    .max(160)
    .regex(/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/),
  sizeBytes: count,
});
const capabilities = z.strictObject({
  resume: z.enum(['supported', 'unsupported', 'unknown']),
  cancel: z.boolean(),
  remove: z.boolean(),
  maxFileBytes: count,
  maxChunkBytes: positive,
  source: id,
  version: id,
});
export const uploadContextSchema = context;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const uploadCheckpointSchema = z
  .strictObject({
    ...file.shape,
    context,
    revision: count,
    state: z.enum(['selected', 'uploading', 'ready', 'failed', 'cancelled', 'removed']),
    access: z.enum(['available', 'revoked', 'expired', 'missing']),
    receivedBytes: count,
    sha256: digest,
    capabilities,
    detail: z.string().max(1000).optional(),
  })
  .refine(
    (v) => v.receivedBytes <= v.sizeBytes && v.sizeBytes <= v.capabilities.maxFileBytes,
    'Byte count exceeds the declared file/capability bound',
  )
  .refine(
    (v) => v.state !== 'ready' || v.receivedBytes === v.sizeBytes,
    'Ready requires complete host-confirmed bytes',
  )
  .refine(
    (v) => v.state !== 'selected' || v.receivedBytes === 0,
    'Selected files cannot have committed bytes',
  )
  .refine(
    (v) => v.state !== 'removed' || v.access === 'missing',
    'Removed resources require missing access',
  );
const commandBase = { commandId: id, context, expectedRevision: count };
export const uploadCommandSchema = z
  .discriminatedUnion('operation', [
    z.strictObject({ ...commandBase, operation: z.literal('begin'), file, sha256: digest }),
    z.strictObject({
      ...commandBase,
      operation: z.literal('append'),
      offset: count,
      byteLength: positive,
      sha256: digest,
    }),
    z.strictObject({ ...commandBase, operation: z.literal('complete'), sha256: digest }),
    z.strictObject({ ...commandBase, operation: z.literal('cancel') }),
    z.strictObject({ ...commandBase, operation: z.literal('remove') }),
  ])
  .refine(
    (v) => v.operation !== 'append' || Number.isSafeInteger(v.offset + v.byteLength),
    'Append range exceeds safe counts',
  );
export const uploadOperationSchema = z.strictObject({
  command: uploadCommandSchema,
  state: z.enum(['idle', 'submitting', 'acknowledged', 'failed', 'outcome-unknown']),
  detail: z.string().max(1000).optional(),
});
function appliedCheckpointMatches(command: UploadCommand, checkpoint: UploadCheckpoint): boolean {
  switch (command.operation) {
    case 'begin':
      return (
        command.expectedRevision === 0 &&
        checkpoint.state === 'uploading' &&
        checkpoint.receivedBytes === 0 &&
        checkpoint.name === command.file.name &&
        checkpoint.mediaType === command.file.mediaType &&
        checkpoint.sizeBytes === command.file.sizeBytes &&
        checkpoint.sha256 === command.sha256
      );
    case 'append':
      return (
        checkpoint.state === 'uploading' &&
        checkpoint.receivedBytes === command.offset + command.byteLength &&
        checkpoint.receivedBytes <= checkpoint.sizeBytes &&
        command.byteLength <= checkpoint.capabilities.maxChunkBytes
      );
    case 'complete':
      return checkpoint.state === 'ready' && checkpoint.sha256 === command.sha256;
    case 'cancel':
      return checkpoint.state === 'cancelled';
    case 'remove':
      return checkpoint.state === 'removed' && checkpoint.access === 'missing';
  }
}
export const uploadReceiptSchema = z
  .strictObject({
    command: uploadCommandSchema,
    outcome: z.enum(['applied', 'rejected', 'unknown', 'not-found']),
    checkpoint: uploadCheckpointSchema.optional(),
    detail: z.string().max(1000).optional(),
  })
  .refine(
    (v) => v.outcome !== 'applied' || !!v.checkpoint,
    'Applied receipt requires its checkpoint',
  )
  .refine(
    (v) => !v.checkpoint || sameUploadContext(v.command.context, v.checkpoint.context),
    'Receipt resource identity changed',
  )
  .refine(
    (v) => v.outcome !== 'applied' || v.checkpoint?.revision === v.command.expectedRevision + 1,
    'Applied checkpoint must advance the original revision once',
  )
  .refine(
    (v) =>
      v.outcome !== 'applied' ||
      (!!v.checkpoint && appliedCheckpointMatches(v.command, v.checkpoint)),
    'Applied checkpoint contradicts the original operation',
  );

// Copy own descriptors before schema traversal. Reflection may execute Proxy traps;
// this is not a sandbox or a transport JSON/byte parser.
function plainCopy(input: unknown): unknown {
  let units = 0,
    values = 0;
  const ancestors = new WeakSet<object>();
  function visit(value: unknown, depth: number): unknown {
    if (++values > uploadDataLimits.values || depth > uploadDataLimits.depth)
      throw new Error('Upload data exceeds bounds.');
    if (typeof value === 'string') {
      units += value.length;
      if (units > uploadDataLimits.units) throw new Error('Upload text exceeds bounds.');
      return value;
    }
    if (value == null || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (
      typeof value !== 'object' ||
      Array.isArray(value) ||
      ancestors.has(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    )
      throw new Error('Expected plain upload data.');
    const descriptors = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(descriptors);
    if (keys.length > 16 || keys.some((k) => typeof k !== 'string'))
      throw new Error('Upload data exceeds bounds.');
    ancestors.add(value);
    const entries = keys.map((key) => {
      const descriptor = descriptors[key as string]!;
      if (!('value' in descriptor)) throw new Error('Upload accessors are unsupported.');
      units += String(key).length;
      if (units > uploadDataLimits.units) throw new Error('Upload text exceeds bounds.');
      return [key, visit(descriptor.value, depth + 1)] as const;
    });
    ancestors.delete(value);
    return Object.fromEntries(entries);
  }
  return visit(input, 0);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function inspect<T>(schema: z.ZodType<T>, input: unknown): T | undefined {
  try {
    const result = schema.safeParse(plainCopy(input));
    return result.success ? freeze(result.data) : undefined;
  } catch {
    return;
  }
}
export const inspectUploadContext = (input: unknown): UploadContext | undefined =>
  inspect(uploadContextSchema, input);
export const inspectUploadCapabilities = (input: unknown): UploadCapabilities | undefined =>
  inspect(capabilities, input);
export const inspectUploadCheckpoint = (input: unknown): UploadCheckpoint | undefined =>
  inspect(uploadCheckpointSchema, input);
export const inspectUploadCommand = (input: unknown): UploadCommand | undefined =>
  inspect(uploadCommandSchema, input);
export const inspectUploadReceipt = (input: unknown): UploadReceipt | undefined =>
  inspect(uploadReceiptSchema, input);
export const inspectUploadOperation = (input: unknown): UploadOperation | undefined =>
  inspect(uploadOperationSchema, input);
export function uploadContextKey(value: UploadContext): string {
  return JSON.stringify([
    value.workspaceId,
    value.threadId,
    value.attachmentId,
    value.version,
    value.uploadId,
  ]);
}
export function sameUploadContext(a: UploadContext, b: UploadContext): boolean {
  return uploadContextKey(a) === uploadContextKey(b);
}
export function uploadCommandKey(value: UploadCommand): string {
  const base = [
    value.commandId,
    uploadContextKey(value.context),
    value.expectedRevision,
    value.operation,
  ];
  return JSON.stringify(
    value.operation === 'begin'
      ? [...base, value.file.name, value.file.mediaType, value.file.sizeBytes, value.sha256]
      : value.operation === 'append'
        ? [...base, value.offset, value.byteLength, value.sha256]
        : value.operation === 'complete'
          ? [...base, value.sha256]
          : base,
  );
}
/** Structural identity is checked separately; host authorization is still mandatory. */
export function receiptMatchesUpload(original: UploadCommand, receipt: UploadReceipt): boolean {
  return uploadCommandKey(original) === uploadCommandKey(receipt.command);
}
