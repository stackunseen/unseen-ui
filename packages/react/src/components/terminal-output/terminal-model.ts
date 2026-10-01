import stripAnsi from 'strip-ansi';
import { z } from 'zod';
import { boundedData } from '../../shared/bounded-data.js';
export interface TerminalContext {
  sessionId: string;
  streamId: string;
  version: string;
}
export type TerminalProcessState =
  'idle' | 'running' | 'complete' | 'failed' | 'cancelled' | 'unknown';
export type TerminalAvailability =
  'ready' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown' | 'stale';
const id = z
  .string()
  .min(1)
  .max(160)
  .refine((v) => v.trim().length > 0 && !/[\p{Cc}\p{Cs}]/u.test(v));
const contextSchema = z.object({ sessionId: id, streamId: id, version: id }).strict();
export function inspectTerminalContext(context: unknown): TerminalContext | undefined {
  if (!boundedData(context)) return;
  const parsed = contextSchema.safeParse(context);
  return parsed.success ? parsed.data : undefined;
}
export function terminalContextKey(context?: TerminalContext) {
  return context
    ? JSON.stringify([context.sessionId, context.streamId, context.version])
    : 'legacy';
}
export function inspectTerminal(
  output: unknown,
  state: unknown,
  context?: unknown,
  exitCode?: unknown,
) {
  if (
    typeof output !== 'string' ||
    !['idle', 'running', 'complete', 'failed', 'cancelled', 'unknown'].includes(state as string)
  )
    return;
  if (
    exitCode !== undefined &&
    (!Number.isSafeInteger(exitCode) || ['idle', 'running'].includes(state as string))
  )
    return;
  const scope = context === undefined ? undefined : inspectTerminalContext(context);
  if (context !== undefined && !scope) return;
  let raw = output.slice(-64000);
  if (/^[\uDC00-\uDFFF]/u.test(raw)) raw = raw.slice(1);
  const plain = stripAnsi(raw).replace(/\p{Cc}/gu, (char) =>
    ['\n', '\r', '\t'].includes(char) ? char : '\uFFFD',
  );
  const lines = plain.split('\n');
  const text = lines.slice(-1000).join('\n');
  return {
    raw,
    text,
    lines: lines.slice(-1000),
    context: scope,
    key: terminalContextKey(scope),
    truncated: output.length > 64000,
    omittedLines: Math.max(0, lines.length - 1000),
  };
}
