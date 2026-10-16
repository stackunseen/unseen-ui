import { z } from 'zod';
import type { Event, RuntimeSnapshot } from './types.js';
import type {
  ConnectionInfo,
  ContextInspection,
  ModelCapabilities,
  ModelSettings,
  ModelUsage,
  PolicyCheck,
} from './inspection.js';
import { validTimestamp } from './inspection.js';
import {
  messageSchema,
  messagePartSchema,
  messageErrorSchema,
  isLegacyMessage,
} from './message-schema.js';
export { messageSchema, messagePartSchema } from './message-schema.js';

const id = z.string().min(1).max(160);
const short = z.string().max(1000);
const text = z.string().max(100_000);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const lifecycle = z.enum([
  'queued',
  'running',
  'waiting-input',
  'waiting-approval',
  'paused',
  'succeeded',
  'failed',
  'cancelled',
]);
const step = z.strictObject({
  id,
  label: short,
  state: z.enum(['queued', 'running', 'succeeded', 'failed', 'blocked']),
  detail: short.optional(),
  dependencyIds: z.array(id).max(50),
});
const tool = z.strictObject({
  id,
  name: short,
  revision,
  state: z.enum([
    'queued',
    'input-streaming',
    'approval-required',
    'running',
    'succeeded',
    'failed',
    'denied',
    'cancelled',
    'outcome-unknown',
  ]),
  input: text,
  output: text.optional(),
  error: short.optional(),
  durationMs: z.number().finite().nonnegative().optional(),
});
const resolvedApproval = z.enum(['approved', 'rejected', 'expired', 'superseded']);
const proposal = z.strictObject({
  id,
  version: revision,
  runId: id,
  toolCallId: id,
  actionDigest: id,
  title: short,
  target: short,
  scopes: z.array(short).max(50),
  impact: short,
  expiresAt: z.iso.datetime(),
  risk: z.enum(['low', 'medium', 'high', 'unknown']),
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'superseded']),
});
const source = z.strictObject({
  id,
  title: short,
  kind: z.enum(['document', 'web', 'record']),
  version: id,
  locator: short,
  access: z.enum(['available', 'missing', 'revoked']),
  url: z.string().max(2000).optional(),
  excerpt: short.optional(),
});
const artifact = z.strictObject({
  id,
  version: revision,
  title: short,
  kind: z.enum(['text', 'table', 'unsupported']),
  content: text,
  sourceIds: z.array(id).max(100),
});
const envelope = {
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  eventId: id,
  streamId: id,
  sequence: revision.min(1),
  threadId: id,
  runId: id,
  attemptId: id,
  occurredAt: z.iso.datetime(),
};
export const eventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...envelope,
    type: z.literal('run.updated'),
    payload: z.strictObject({ lifecycle, version: revision, activity: short.optional() }),
  }),
  z
    .strictObject({ ...envelope, type: z.literal('message.created'), payload: messageSchema })
    .refine(
      (event) => event.schemaVersion === 2 || isLegacyMessage(event.payload),
      'Rich messages require protocol v2',
    ),
  z.strictObject({
    ...envelope,
    type: z.literal('message.delta'),
    payload: z.strictObject({ id, offset: revision, text: z.string().max(10_000) }),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('message.completed'),
    payload: z.strictObject({ id }),
  }),
  z.strictObject({
    ...envelope,
    schemaVersion: z.literal(2),
    type: z.literal('message.part.added'),
    payload: z.strictObject({ id, part: messagePartSchema }),
  }),
  z.strictObject({
    ...envelope,
    schemaVersion: z.literal(2),
    type: z.literal('message.part.delta'),
    payload: z.strictObject({ id, partId: id, offset: revision, text: z.string().max(10_000) }),
  }),
  z.strictObject({
    ...envelope,
    schemaVersion: z.literal(2),
    type: z.literal('message.part.completed'),
    payload: z.strictObject({ id, partId: id }),
  }),
  z.strictObject({
    ...envelope,
    schemaVersion: z.literal(2),
    type: z.literal('message.failed'),
    payload: z.strictObject({ id, error: messageErrorSchema }),
  }),
  z.strictObject({ ...envelope, type: z.literal('step.updated'), payload: step }),
  z.strictObject({ ...envelope, type: z.literal('tool.updated'), payload: tool }),
  z.strictObject({ ...envelope, type: z.literal('approval.requested'), payload: proposal }),
  z.strictObject({
    ...envelope,
    type: z.literal('approval.resolved'),
    payload: z.strictObject({ id, version: revision, status: resolvedApproval }),
  }),
  z.strictObject({ ...envelope, type: z.literal('source.updated'), payload: source }),
  z.strictObject({ ...envelope, type: z.literal('artifact.created'), payload: artifact }),
]) satisfies z.ZodType<Event>;

export const snapshotSchema = z
  .strictObject({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    streamId: id,
    lastSequence: revision,
    run: z.strictObject({
      id,
      attemptId: id,
      threadId: id,
      version: revision,
      lifecycle,
      activity: short.optional(),
    }),
    messages: z.array(messageSchema).max(500),
    steps: z.array(step).max(200),
    tools: z.array(tool).max(200),
    approval: proposal.nullable(),
    sources: z.array(source).max(200),
    artifacts: z.array(artifact).max(100),
    connection: z.enum(['connected', 'reconnecting', 'disconnected']),
    stale: z.boolean(),
    diagnostic: short.nullable(),
  })
  .refine(
    (snapshot) => snapshot.schemaVersion === 2 || snapshot.messages.every(isLegacyMessage),
    'Rich messages require protocol v2',
  ) satisfies z.ZodType<RuntimeSnapshot>;

// Standalone host snapshots. These do not add event types to the single-run projector.
const timestamp = z.string().max(80).refine(validTimestamp, 'Expected a full ISO timestamp');
const named = id.refine((value) => value.trim().length > 0, 'Expected a nonblank identifier');
const uniqueIds = <T extends { id: string }>(values: T[]) =>
  new Set(values.map((value) => value.id)).size === values.length;
const uniqueStrings = (values: string[]) => new Set(values).size === values.length;
const toolIds = z.array(named).max(128).refine(uniqueStrings, 'Duplicate tool IDs');
export const connectionInfoSchema = z
  .strictObject({
    state: z.enum(['connected', 'reconnecting', 'disconnected']),
    recovery: z.enum(['none', 'resumed', 'incompatible']),
    freshness: z.enum(['current', 'stale', 'unknown']).optional(),
    adapter: z.strictObject({
      name: named,
      version: named,
      resume: z.boolean(),
      snapshot: z.boolean(),
    }),
    cursor: z.strictObject({ streamId: named, sequence: revision }).optional(),
    resumedAt: timestamp.optional(),
    detail: short.optional(),
  })
  .refine(
    (value) => value.recovery !== 'resumed' || !!value.resumedAt,
    'Resumed connections require an observation time',
  ) satisfies z.ZodType<ConnectionInfo>;
export const modelSettingsSchema = z.strictObject({
  modelId: named,
  modeId: named.optional(),
  toolIds,
  temperature: z.number().finite().optional(),
}) satisfies z.ZodType<ModelSettings>;
export const modelCapabilitiesSchema = z
  .strictObject({
    revision: named,
    source: named,
    observedAt: timestamp,
    models: z
      .array(
        z.strictObject({
          id: named,
          label: named,
          provider: named,
          available: z.boolean(),
          unavailableReason: short.optional(),
          modes: z
            .array(z.strictObject({ id: named, label: named }))
            .max(30)
            .refine(uniqueIds, 'Duplicate mode IDs'),
          toolIds,
          temperature: z
            .strictObject({
              min: z.number().finite(),
              max: z.number().finite(),
              step: z.number().finite().positive(),
            })
            .refine((value) => value.max > value.min, 'Invalid temperature bounds')
            .optional(),
        }),
      )
      .max(100)
      .refine(uniqueIds, 'Duplicate model IDs'),
    tools: z
      .array(
        z.strictObject({
          id: named,
          label: named,
          available: z.boolean(),
          unavailableReason: short.optional(),
        }),
      )
      .max(128)
      .refine(uniqueIds, 'Duplicate tool IDs'),
  })
  .refine(
    (value) =>
      value.models.every((model) =>
        model.toolIds.every((id) => value.tools.some((tool) => tool.id === id)),
      ),
    'A model references an unadvertised tool',
  ) satisfies z.ZodType<ModelCapabilities>;
export const modelUsageSchema = z.strictObject({
  modelId: named,
  kind: z.enum(['measured', 'estimated']),
  source: named,
  observedAt: timestamp,
  inputTokens: revision.optional(),
  outputTokens: revision.optional(),
  cost: z
    .strictObject({
      amount: z.number().finite().nonnegative(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      basis: named,
    })
    .optional(),
}) satisfies z.ZodType<ModelUsage>;
export const contextInspectionSchema = z.strictObject({
  revision: named,
  source: named,
  observedAt: timestamp,
  stale: z.boolean().optional(),
  items: z
    .array(
      z.strictObject({
        id: named,
        label: named,
        version: named,
        selected: z.boolean(),
        inclusion: z.enum(['included', 'excluded', 'pending', 'unknown']),
        access: z.enum(['available', 'missing', 'revoked']),
        reason: short.optional(),
        originalTokens: revision.optional(),
        includedTokens: revision.optional(),
        truncated: z.boolean().optional(),
      }),
    )
    .max(200)
    .refine(uniqueIds, 'Duplicate context source IDs'),
  usage: z
    .strictObject({
      used: revision,
      limit: revision.optional(),
      kind: z.enum(['measured', 'estimated']),
      model: named,
      measuredAt: timestamp,
    })
    .optional(),
}) satisfies z.ZodType<ContextInspection>;
export const policyCheckSchema = z.strictObject({
  id: named,
  label: named,
  result: z.enum(['pass', 'warn', 'fail', 'unknown']),
  detail: short.optional(),
  freshness: z.enum(['current', 'stale', 'unknown']),
  attestation: z
    .strictObject({ source: named, scope: named, policyVersion: named, checkedAt: timestamp })
    .optional(),
}) satisfies z.ZodType<PolicyCheck>;
export const policyChecksSchema = z
  .array(policyCheckSchema)
  .max(100)
  .refine(uniqueIds, 'Duplicate policy check IDs');
