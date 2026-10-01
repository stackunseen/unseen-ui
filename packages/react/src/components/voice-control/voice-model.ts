import { z } from 'zod';
import { boundedData } from '../../shared/bounded-data.js';

export type VoiceState =
  'idle' | 'requesting' | 'listening' | 'processing' | 'denied' | 'unsupported' | 'error';
export type VoiceCaptureState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'complete'
  | 'cancelled'
  | 'interrupted'
  | 'error'
  | 'unknown';
export type VoicePermission =
  'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'not-required';
export type VoiceAvailability =
  'ready' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown' | 'stale';
export interface VoiceContext {
  sessionId: string;
  captureId: string;
  version: string;
}
export interface VoiceCaptureSnapshot {
  context: VoiceContext;
  state: VoiceCaptureState;
  permission: VoicePermission;
  /** Whether this host still awaits an uncancellable browser permission request. */
  permissionRequestPending: boolean;
  source?: 'microphone' | 'synthetic';
  elapsedMs?: number;
  bytes?: number;
  /** Measured normalized amplitude, not a confidence or progress percentage. */
  inputLevel?: number;
  muted?: boolean;
  error?: string;
}
export interface VoiceTranscription {
  context: VoiceContext;
  state: 'idle' | 'unavailable' | 'streaming' | 'complete' | 'error' | 'unknown';
  text?: string;
  error?: string;
}
export interface VoiceDeviceRequest extends VoiceContext {
  deviceId: string;
}
export interface VoiceDevice {
  value: string;
  label: string;
}
const id = z
  .string()
  .max(160)
  .refine((s) => Boolean(s.trim()) && !/[\p{Cc}\p{Cs}]/u.test(s));
const context = z.object({ sessionId: id, captureId: id, version: id }).strict();
const capture = z
  .object({
    context,
    state: z.enum([
      'idle',
      'requesting',
      'recording',
      'stopping',
      'complete',
      'cancelled',
      'interrupted',
      'error',
      'unknown',
    ]),
    permission: z.enum(['unknown', 'prompt', 'granted', 'denied', 'unsupported', 'not-required']),
    permissionRequestPending: z.boolean(),
    source: z.enum(['microphone', 'synthetic']).optional(),
    elapsedMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    inputLevel: z.number().min(0).max(1).optional(),
    muted: z.boolean().optional(),
    error: z.string().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.state === 'recording' && !['granted', 'not-required'].includes(data.permission))
      ctx.addIssue({ code: 'custom', message: 'Recording requires reported access.' });
    if (data.inputLevel !== undefined && data.state !== 'recording')
      ctx.addIssue({ code: 'custom', message: 'Input level requires current capture.' });
  });
const device = z.object({ value: id, label: z.string().min(1).max(240) }).strict();
export const voiceContextKey = (value?: VoiceContext) =>
  value ? JSON.stringify([value.sessionId, value.captureId, value.version]) : 'legacy';
export const sameVoiceContext = (a: VoiceContext, b: VoiceContext) =>
  voiceContextKey(a) === voiceContextKey(b);
export function inspectVoiceCapture(value: unknown): VoiceCaptureSnapshot | undefined {
  if (!boundedData(value)) return;
  const parsed = capture.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
export function inspectVoiceDevices(value: unknown): VoiceDevice[] | undefined {
  if (!boundedData(value)) return;
  const parsed = z.array(device).max(50).safeParse(value);
  return parsed.success && new Set(parsed.data.map((v) => v.value)).size === parsed.data.length
    ? parsed.data
    : undefined;
}
// Transcript text has a separate 20,000-unit budget without traversing accessors.
export function inspectVoiceText(
  value: unknown,
  advanced: boolean,
):
  | { context?: VoiceContext; state: VoiceTranscription['state']; text?: string; error?: string }
  | undefined {
  try {
    if (
      !value ||
      typeof value !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    )
      return;
    const descriptors = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(descriptors);
    if (
      keys.some(
        (k) =>
          typeof k !== 'string' ||
          !['text', 'final', 'state', 'context', 'error'].includes(k) ||
          !('value' in descriptors[k]!),
      )
    )
      return;
    const text = descriptors.text?.value;
    if (text !== undefined && (typeof text !== 'string' || text.length > 20000)) return;
    const metadata = Object.fromEntries(
      Object.entries(descriptors)
        .filter(([k]) => k !== 'text')
        .map(([k, v]) => [k, v.value]),
    );
    if (!boundedData(metadata)) return;
    if (advanced) {
      const parsed = z
        .object({
          context,
          state: z.enum(['idle', 'unavailable', 'streaming', 'complete', 'error', 'unknown']),
          error: z.string().max(1000).optional(),
        })
        .strict()
        .safeParse(metadata);
      if (!parsed.success) return;
      return { ...parsed.data, text };
    }
    const parsed = z.object({ final: z.boolean() }).strict().safeParse(metadata);
    return parsed.success && typeof text === 'string'
      ? { state: parsed.data.final ? 'complete' : 'streaming', text }
      : undefined;
  } catch {
    return undefined;
  }
}
