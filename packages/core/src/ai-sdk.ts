import type {
  ApprovalProposal,
  MessageData,
  MessagePart,
  Source,
  SubmissionState,
  ToolCallData,
  ToolState,
} from './types.js';

/*
 * Structural mirrors of the Vercel AI SDK UI message shape (AI SDK 6, `UIMessage` and its parts).
 * They are declared here so core never imports the SDK; any object with this shape works.
 */
export interface AiSdkApproval {
  id: string;
  approved?: boolean;
  reason?: string;
  requestReason?: string;
  /** Set when a server rule decided; no person is asked, so no approval card is shown. */
  isAutomatic?: boolean;
}
export interface AiSdkToolPart {
  type: string;
  toolCallId: string;
  toolName?: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: AiSdkApproval;
}
export type AiSdkPart =
  | { type: 'text'; text: string; state?: 'streaming' | 'done' }
  | { type: 'reasoning'; text: string; state?: 'streaming' | 'done' }
  | { type: 'source-url'; sourceId: string; url: string; title?: string }
  | {
      type: 'source-document';
      sourceId: string;
      mediaType: string;
      title: string;
      filename?: string;
    }
  | { type: 'file'; mediaType: string; filename?: string; url: string }
  | { type: 'step-start' }
  | AiSdkToolPart
  | { type: string; [key: string]: unknown };
export interface AiSdkMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: readonly AiSdkPart[];
}
export type AiSdkStatus = 'submitted' | 'streaming' | 'ready' | 'error';

/** One tool call waiting on, or answered by, a person. */
export interface ChatApprovalRequest {
  toolCallId: string;
  /** The id the host checks when the decision arrives; for the AI SDK, `approval.id`. */
  approvalId: string;
  proposal: ApprovalProposal;
  submission: SubmissionState;
}
export interface ChatApprovalDecision {
  approvalId: string;
  toolCallId: string;
  approved: boolean;
}

export interface AiSdkMappingOptions {
  /** Words for the approval card. Anything left out reads as not supplied. */
  describeApproval?: (tool: { name: string; input: unknown; requestReason?: string }) => {
    title?: string;
    target?: string;
    impact?: string;
    scopes?: string[];
    risk?: ApprovalProposal['risk'];
  };
  /** Words for a tool row, such as `{ label: 'Searched accounts', target: input.query }`. */
  describeTool?: (tool: { name: string; input: unknown }) => { label?: string; target?: string };
  /** Bound on the JSON shown for tool input and output. */
  maxJsonLength?: number;
}

export interface AiSdkChatState {
  messages: MessageData[];
  tools: ToolCallData[];
  sources: Source[];
  approvals: ChatApprovalRequest[];
  status: 'idle' | 'streaming' | 'complete' | 'failed';
}

const toolStates: Record<string, ToolState> = {
  'input-streaming': 'input-streaming',
  'input-available': 'running',
  'approval-requested': 'approval-required',
  'output-available': 'succeeded',
  'output-error': 'failed',
  'output-denied': 'denied',
};

function isToolPart(part: AiSdkPart): part is AiSdkToolPart {
  return (
    typeof part.type === 'string' &&
    (part.type.startsWith('tool-') || part.type === 'dynamic-tool') &&
    typeof (part as AiSdkToolPart).toolCallId === 'string'
  );
}
function toolNameOf(part: AiSdkToolPart): string {
  return part.type === 'dynamic-tool' ? (part.toolName ?? 'tool') : part.type.slice(5);
}
function json(value: unknown, limit: number): string {
  if (value === undefined) return '';
  let text: string;
  try {
    text = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? '');
  } catch {
    text = String(value);
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
/** A short stable fingerprint of the tool input, shown so a reader can tell two requests apart. */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Maps AI SDK chat state (`useChat().messages`, `status`, `error`) onto the shapes the components
 * render. Reasoning parts are left out: only public output is shown. Approval cards are built from
 * `approval-requested` and `approval-responded` tool parts and settle when the tool runs or is
 * denied; the server still checks `approval.id` before executing.
 */
export function fromAiSdkChat(
  input: { messages: readonly AiSdkMessage[]; status: AiSdkStatus; error?: { message: string } },
  options: AiSdkMappingOptions = {},
): AiSdkChatState {
  const limit = options.maxJsonLength ?? 8000;
  const tools: ToolCallData[] = [];
  const sources: Source[] = [];
  const approvals: ChatApprovalRequest[] = [];
  const seenSources = new Set<string>();
  const busy = input.status === 'submitted' || input.status === 'streaming';
  // Only a reply at the very end can be streaming or failed; while submitted, the tail is the prompt.
  const tail = input.messages.at(-1);
  const lastAssistant = tail?.role === 'assistant' ? tail : undefined;

  const messages = input.messages.map((message): MessageData => {
    const parts: MessagePart[] = [];
    message.parts.forEach((part, index) => {
      const id = `${message.id}-${index}`;
      if (part.type === 'text' && typeof (part as { text?: unknown }).text === 'string') {
        const text = part as { text: string; state?: string };
        parts.push({
          id,
          type: 'text',
          format: message.role === 'assistant' ? 'markdown' : 'plain',
          text: text.text,
          state: text.state === 'streaming' ? 'streaming' : 'complete',
        });
      } else if (part.type === 'source-url' || part.type === 'source-document') {
        const source = part as {
          sourceId: string;
          url?: string;
          title?: string;
          filename?: string;
        };
        if (!seenSources.has(source.sourceId)) {
          seenSources.add(source.sourceId);
          sources.push({
            id: source.sourceId,
            title: source.title || source.filename || source.url || 'Source',
            kind: source.url ? 'web' : 'document',
            version: '1',
            locator: source.url ?? source.filename ?? source.sourceId,
            access: 'available',
            ...(source.url ? { url: source.url } : {}),
          });
        }
        parts.push({
          id,
          type: 'source',
          sourceId: source.sourceId,
          version: '1',
          locator: source.url ?? source.filename ?? source.sourceId,
        });
      } else if (part.type === 'file') {
        const file = part as { filename?: string; mediaType?: string };
        parts.push({
          id,
          type: 'unsupported',
          kind: file.mediaType ?? 'file',
          label: file.filename ?? 'Attached file',
        });
      } else if (isToolPart(part)) {
        const name = toolNameOf(part);
        const inputText = json(part.input, limit);
        const responded = part.state === 'approval-responded';
        const state: ToolState = responded
          ? part.approval?.approved
            ? 'running'
            : 'denied'
          : (toolStates[part.state] ?? 'running');
        const call: ToolCallData = {
          id: part.toolCallId,
          name,
          revision: 1,
          state,
          input: inputText,
        };
        const words = options.describeTool?.({ name, input: part.input });
        if (words?.label) call.label = words.label;
        if (words?.target) call.target = words.target;
        if (part.state === 'output-available') call.output = json(part.output, limit);
        if (part.state === 'output-error') call.error = part.errorText ?? 'The tool failed.';
        tools.push(call);
        parts.push({ id, type: 'tool', toolCallId: part.toolCallId });
        if (part.approval && !part.approval.isAutomatic) {
          const described = options.describeApproval?.({
            name,
            input: part.input,
            requestReason: part.approval.requestReason,
          });
          const decided = part.approval.approved;
          const settled = ['output-available', 'output-error', 'output-denied'].includes(
            part.state,
          );
          const status =
            decided === undefined && part.state === 'approval-requested'
              ? 'pending'
              : decided === false || part.state === 'output-denied'
                ? 'rejected'
                : 'approved';
          // Without describeApproval, reuse the tool row's words rather than the function name.
          const fallbackImpact = {
            pending:
              'The assistant asks to run this tool with the input shown. Nothing runs until you decide.',
            approved: 'You approved this call. The tool row shows what happened.',
            rejected: 'You rejected this call, so the tool did not run.',
          }[status];
          approvals.push({
            toolCallId: part.toolCallId,
            approvalId: part.approval.id,
            proposal: {
              id: part.approval.id,
              version: 1,
              runId: message.id,
              toolCallId: part.toolCallId,
              actionDigest: `${name}:${fingerprint(inputText)}`,
              title: described?.title ?? words?.label ?? `Run ${name}`,
              target: described?.target ?? words?.target ?? name,
              scopes: described?.scopes ?? [],
              impact:
                described?.impact ??
                (status === 'pending' ? part.approval.requestReason : undefined) ??
                fallbackImpact,
              expiresAt: '',
              risk: described?.risk ?? 'unknown',
              status,
            },
            submission:
              part.state === 'approval-requested'
                ? 'idle'
                : settled
                  ? 'acknowledged'
                  : 'submitting',
          });
        }
      }
    });
    const streaming = busy && message === lastAssistant;
    const failed = input.status === 'error' && message === lastAssistant;
    const data: MessageData = {
      id: message.id,
      role: message.role,
      revision: parts.length,
      state: failed ? 'failed' : streaming ? 'streaming' : 'complete',
      parts: streaming
        ? parts
        : parts.map((part) =>
            part.type === 'text' ? { ...part, state: 'complete' as const } : part,
          ),
    };
    if (failed)
      data.error = { code: 'ai-sdk-error', message: input.error?.message ?? 'The reply failed.' };
    return data;
  });

  return {
    messages,
    tools,
    sources,
    approvals,
    status: busy
      ? 'streaming'
      : input.status === 'error'
        ? 'failed'
        : input.messages.length
          ? 'complete'
          : 'idle',
  };
}
