import type { TerminalContext, TerminalProcessState } from '@stackunseen/ui';
export interface PtySnapshot {
  context: TerminalContext;
  output: string;
  revision: number;
  state: TerminalProcessState;
  status: 'ready' | 'denied';
  exitCode?: number;
  stopRequested: boolean;
  outputLimited: boolean;
}
export interface PtyReceipt {
  requestId: string;
  action: string;
  context: TerminalContext;
  status: 'acknowledged' | 'outcome-unknown';
  message?: string;
}
export interface PtyHost {
  snapshot(): PtySnapshot;
  start(value: unknown): PtyReceipt;
  input(value: unknown): PtyReceipt;
  resize(value: unknown): PtyReceipt;
  stop(value: unknown): PtyReceipt;
  clear(value: unknown): PtyReceipt;
  receipt(requestId: string): PtyReceipt | { requestId: string; status: 'unknown' };
  setAccess(value: boolean): PtySnapshot;
  close(): Promise<void>;
}
export class PtyHostError extends Error {
  status: number;
}
export function createPtyHost(): PtyHost;
