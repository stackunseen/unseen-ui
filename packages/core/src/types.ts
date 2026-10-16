export type RunLifecycle =
  | 'queued'
  | 'running'
  | 'waiting-input'
  | 'waiting-approval'
  | 'paused'
  | 'succeeded'
  | 'failed'
  | 'cancelled';
export type ToolState =
  | 'queued'
  | 'input-streaming'
  | 'approval-required'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'denied'
  | 'cancelled'
  | 'outcome-unknown';
export type SubmissionState = 'idle' | 'submitting' | 'acknowledged' | 'failed' | 'outcome-unknown';
export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'expired' | 'superseded';
export interface Run {
  id: string;
  attemptId: string;
  threadId: string;
  version: number;
  lifecycle: RunLifecycle;
  activity?: string;
}
export type MessageState = 'complete' | 'streaming' | 'interrupted' | 'failed';
export interface MessageError {
  code: string;
  message: string;
}
export interface TextMessagePart {
  id: string;
  type: 'text';
  format: 'plain' | 'markdown';
  text: string;
  state: 'complete' | 'streaming' | 'interrupted';
}
export type MessagePart =
  | TextMessagePart
  | { id: string; type: 'tool'; toolCallId: string }
  | { id: string; type: 'source'; sourceId: string; version: string; locator: string }
  | { id: string; type: 'attachment'; attachmentId: string; version: string }
  | { id: string; type: 'unsupported'; kind: string; label: string };
interface MessageBase {
  id: string;
  role: 'user' | 'assistant' | 'system';
  state: MessageState;
  revision: number;
  createdAt?: string;
  error?: MessageError;
}
/** Exactly one content representation. Parts require protocol v2 in a runtime. */
export type MessageData = MessageBase &
  ({ text: string; parts?: never } | { parts: MessagePart[]; text?: never });
export interface Step {
  id: string;
  label: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';
  detail?: string;
  dependencyIds: string[];
}
export interface ToolCallData {
  id: string;
  name: string;
  /** Host-written step label, such as "Searched accounts". Rows show it instead of the name. */
  label?: string;
  /** What the step acted on, such as a file, query or record. */
  target?: string;
  revision: number;
  state: ToolState;
  input: string;
  output?: string;
  error?: string;
  durationMs?: number;
}
export interface ApprovalProposal {
  id: string;
  version: number;
  runId: string;
  toolCallId: string;
  actionDigest: string;
  title: string;
  target: string;
  scopes: string[];
  impact: string;
  expiresAt: string;
  /** `unknown` when the host did not assess risk; the card says so instead of guessing. */
  risk: 'low' | 'medium' | 'high' | 'unknown';
  status: ApprovalState;
}
export interface ApprovalDecision {
  commandId: string;
  proposalId: string;
  version: number;
  actionDigest: string;
  decision: 'approve' | 'reject';
}
export interface Source {
  id: string;
  title: string;
  kind: 'document' | 'web' | 'record';
  version: string;
  locator: string;
  access: 'available' | 'missing' | 'revoked';
  url?: string;
  excerpt?: string;
}
export interface Artifact {
  id: string;
  version: number;
  title: string;
  kind: 'text' | 'table' | 'unsupported';
  content: string;
  sourceIds: string[];
}
export interface ContextItem {
  id: string;
  label: string;
  state: 'connected' | 'selected' | 'included' | 'excluded';
  reason?: string;
}
export type Grounding =
  | { kind: 'unknown' }
  | { kind: 'coverage'; supported: number; total: number; method: string }
  | { kind: 'qualitative'; label: string; method: string };
export interface RuntimeSnapshot {
  schemaVersion: 1 | 2;
  streamId: string;
  lastSequence: number;
  run: Run;
  messages: MessageData[];
  steps: Step[];
  tools: ToolCallData[];
  approval: ApprovalProposal | null;
  sources: Source[];
  artifacts: Artifact[];
  connection: ConnectionState;
  stale: boolean;
  diagnostic: string | null;
}
export interface Envelope {
  schemaVersion: 1 | 2;
  eventId: string;
  streamId: string;
  sequence: number;
  threadId: string;
  runId: string;
  attemptId: string;
  occurredAt: string;
}
export type Event = Envelope &
  (
    | {
        type: 'run.updated';
        payload: { lifecycle: RunLifecycle; version: number; activity?: string };
      }
    | { type: 'message.created'; payload: MessageData }
    | { type: 'message.delta'; payload: { id: string; offset: number; text: string } }
    | { type: 'message.completed'; payload: { id: string } }
    | { schemaVersion: 2; type: 'message.part.added'; payload: { id: string; part: MessagePart } }
    | {
        schemaVersion: 2;
        type: 'message.part.delta';
        payload: { id: string; partId: string; offset: number; text: string };
      }
    | { schemaVersion: 2; type: 'message.part.completed'; payload: { id: string; partId: string } }
    | { schemaVersion: 2; type: 'message.failed'; payload: { id: string; error: MessageError } }
    | { type: 'step.updated'; payload: Step }
    | { type: 'tool.updated'; payload: ToolCallData }
    | { type: 'approval.requested'; payload: ApprovalProposal }
    | {
        type: 'approval.resolved';
        payload: { id: string; version: number; status: Exclude<ApprovalState, 'pending'> };
      }
    | { type: 'source.updated'; payload: Source }
    | { type: 'artifact.created'; payload: Artifact }
  );
export interface Runtime {
  getSnapshot(): RuntimeSnapshot;
  getServerSnapshot(): RuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  ingest(event: unknown): 'applied' | 'buffered' | 'duplicate' | 'rejected';
  replaceSnapshot(snapshot: unknown): void;
  setConnection(connection: ConnectionState): void;
  dispose(): void;
}
