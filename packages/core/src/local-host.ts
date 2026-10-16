import type { MessageData, ToolCallData } from './types.js';

export type LocalHostStatus = 'idle' | 'streaming' | 'complete' | 'cancelled' | 'failed';

/** What one simulated turn produces. Text streams; a tool, when present, runs before it. */
export interface LocalReply {
  text: string;
  tool?: {
    name: string;
    /** Step label shown in tool rows, such as "Searched notes". */
    label?: string;
    target?: string;
    input: string;
    output?: string;
    error?: string;
    durationMs?: number;
  };
  /** Prompts to offer once the reply is complete. */
  suggestions?: readonly string[];
  /** Stop part way through with a failure, to exercise error states. */
  fail?: boolean;
}

export interface LocalHostSnapshot {
  messages: readonly MessageData[];
  tools: readonly ToolCallData[];
  status: LocalHostStatus;
  suggestions: readonly string[];
  /** The prompt the last turn answered; retry resends it, which regenerates a completed reply. */
  lastPrompt?: string;
}

export interface LocalHostOptions {
  /** Builds the reply for a prompt. Deterministic text by default; never a model. */
  reply?: (prompt: string, messages: readonly MessageData[]) => string | LocalReply;
  /** Prompts offered before the first message. */
  suggestions?: readonly string[];
  charsPerTick?: number;
  tickMs?: number;
  /** Oldest messages are dropped beyond this many. */
  maxMessages?: number;
  maxPromptLength?: number;
  /** Host clock for createdAt stamps. */
  now?: () => string;
  /** Timer injection for tests; defaults to setTimeout and clearTimeout. */
  schedule?: (callback: () => void, ms: number) => () => void;
}

export interface LocalHost {
  getSnapshot(): LocalHostSnapshot;
  subscribe(listener: () => void): () => void;
  /** Starts a turn. Returns false when busy, empty or over the length limit. */
  send(text: string): boolean;
  cancel(): void;
  /** Resends the last prompt, replacing the last reply: regenerate after complete, retry after cancelled or failed. */
  retry(): void;
  reset(): void;
  dispose(): void;
}

const quote = (text: string) => `“${text.length > 80 ? `${text.slice(0, 79)}…` : text}”`;

/** The built-in reply: visibly simulated, with a tool call for search-like prompts. */
export function defaultLocalReply(prompt: string): LocalReply {
  if (/\b(fail|error|break)\b/i.test(prompt))
    return {
      text: 'Starting a reply that will not finish, so the failed state is visible. The connector drops',
      fail: true,
    };
  if (/\b(search|find|look\s?up)\b/i.test(prompt)) {
    const query = prompt.replace(/^(please\s+)?(search|find|look\s?up)( for| the)?\s*/i, '').trim();
    return {
      tool: {
        name: 'search_notes',
        label: 'Searched notes',
        target: query || prompt,
        input: JSON.stringify({ query: query || prompt, limit: 5 }, null, 2),
        output: '3 notes matched\nRenewal plan · Owner review · Q3 summary',
        durationMs: 640,
      },
      text: `I searched your notes for ${quote(query || prompt)} and found three matches: the renewal plan, the owner review and the Q3 summary. This is a simulated reply from a local host; no model or service was called.`,
      suggestions: ['Summarize those notes', 'Draft a follow-up'],
    };
  }
  if (/\b(summar|brief|overview|explain)\w*/i.test(prompt))
    return {
      text: `Here is a short summary for ${quote(prompt)}.\n\n1. The local host streams this text a few characters at a time, exactly as a real host would deliver tokens.\n2. Nothing here came from a model: the text is deterministic so the interface can be checked.\n3. Replace the host with your server when you are ready; the components stay the same.`,
      suggestions: ['Search notes for renewals', 'Make that shorter'],
    };
  return {
    text: `You asked: ${quote(prompt)}.\n\nThis is a simulated reply from a local host, so no model was called. Try “search notes for renewals” to see a tool call, “summarize the plan” for a longer answer, or “fail” to see a failed turn.`,
    suggestions: ['Search notes for renewals', 'Summarize the plan', 'Fail on purpose'],
  };
}

/**
 * An in-memory host for prototypes and tests. It owns the conversation the way a server would:
 * messages, tool calls, status and retry, published as immutable snapshots. It never contacts a
 * model or a network, and it says so in its default replies.
 */
export function createLocalHost(options: LocalHostOptions = {}): LocalHost {
  const {
    reply = defaultLocalReply,
    charsPerTick = 12,
    tickMs = 40,
    maxMessages = 60,
    maxPromptLength = 4000,
    now = () => new Date().toISOString(),
    schedule = (callback, ms) => {
      const handle = setTimeout(callback, ms);
      return () => clearTimeout(handle);
    },
  } = options;
  const listeners = new Set<() => void>();
  let snapshot: LocalHostSnapshot = {
    messages: [],
    tools: [],
    status: 'idle',
    suggestions: options.suggestions ?? [],
  };
  let counter = 0;
  let cancelTimer: (() => void) | undefined;
  let disposed = false;

  function publish(next: Partial<LocalHostSnapshot>) {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  }
  function updateMessage(id: string, change: (message: MessageData) => MessageData) {
    publish({
      messages: snapshot.messages.map((message) => (message.id === id ? change(message) : message)),
    });
  }
  function updateTool(id: string, change: Partial<ToolCallData>) {
    publish({
      tools: snapshot.tools.map((tool) => (tool.id === id ? { ...tool, ...change } : tool)),
    });
  }
  function stopTimer() {
    cancelTimer?.();
    cancelTimer = undefined;
  }

  function start(text: string) {
    const built = reply(text, snapshot.messages);
    const turn: LocalReply = typeof built === 'string' ? { text: built } : built;
    const n = ++counter;
    const userId = `local-user-${n}`;
    const assistantId = `local-assistant-${n}`;
    const toolId = turn.tool ? `local-tool-${n}` : undefined;
    const user: MessageData = {
      id: userId,
      role: 'user',
      text,
      state: 'complete',
      revision: 0,
      createdAt: now(),
    };
    const assistant: MessageData = toolId
      ? {
          id: assistantId,
          role: 'assistant',
          state: 'streaming',
          revision: 0,
          createdAt: now(),
          parts: [
            { id: `${assistantId}-tool`, type: 'tool', toolCallId: toolId },
            {
              id: `${assistantId}-text`,
              type: 'text',
              format: 'plain',
              text: '',
              state: 'streaming',
            },
          ],
        }
      : {
          id: assistantId,
          role: 'assistant',
          text: '',
          state: 'streaming',
          revision: 0,
          createdAt: now(),
        };
    const messages = [...snapshot.messages, user, assistant].slice(-maxMessages);
    const tools =
      toolId && turn.tool
        ? [
            ...snapshot.tools,
            {
              id: toolId,
              name: turn.tool.name,
              ...(turn.tool.label === undefined ? {} : { label: turn.tool.label }),
              ...(turn.tool.target === undefined ? {} : { target: turn.tool.target }),
              revision: 1,
              state: 'running' as const,
              input: turn.tool.input,
            },
          ]
        : snapshot.tools;
    publish({ messages, tools, status: 'streaming', suggestions: [], lastPrompt: text });

    const total = turn.text.length;
    const failAt = turn.fail ? Math.min(total, Math.max(1, Math.floor(total * 0.6))) : undefined;
    let offset = 0;
    let toolDone = !turn.tool;
    const toolTicks = 6;
    let ticks = 0;

    function setText(message: MessageData, next: string, state: MessageData['state']) {
      const partState =
        state === 'streaming' ? 'streaming' : state === 'complete' ? 'complete' : 'interrupted';
      const revision = message.revision + 1;
      if (message.parts)
        return {
          ...message,
          revision,
          state,
          parts: message.parts.map((part) =>
            part.type === 'text' ? { ...part, text: next, state: partState } : part,
          ),
        } as MessageData;
      return { ...message, revision, state, text: next } as MessageData;
    }

    function tick() {
      if (disposed) return;
      ticks++;
      if (!toolDone) {
        if (ticks >= toolTicks && toolId && turn.tool) {
          toolDone = true;
          updateTool(
            toolId,
            turn.tool.error
              ? { state: 'failed', error: turn.tool.error, durationMs: turn.tool.durationMs }
              : {
                  state: 'succeeded',
                  output: turn.tool.output ?? '',
                  durationMs: turn.tool.durationMs,
                },
          );
        }
        cancelTimer = schedule(tick, tickMs);
        return;
      }
      offset = Math.min(total, offset + charsPerTick);
      const failed = failAt !== undefined && offset >= failAt;
      const done = offset >= total;
      if (failed) {
        updateMessage(assistantId, (message) => ({
          ...setText(message, turn.text.slice(0, failAt), 'failed'),
          error: {
            code: 'simulated-failure',
            message: 'The simulated connector dropped the reply.',
          },
        }));
        publish({ status: 'failed' });
        cancelTimer = undefined;
        return;
      }
      updateMessage(assistantId, (message) =>
        setText(message, turn.text.slice(0, offset), done ? 'complete' : 'streaming'),
      );
      if (done) {
        publish({ status: 'complete', suggestions: turn.suggestions ?? [] });
        cancelTimer = undefined;
        return;
      }
      cancelTimer = schedule(tick, tickMs);
    }
    cancelTimer = schedule(tick, tickMs);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send(text) {
      const trimmed = text.trim();
      if (
        disposed ||
        snapshot.status === 'streaming' ||
        !trimmed ||
        trimmed.length > maxPromptLength
      )
        return false;
      start(trimmed);
      return true;
    },
    cancel() {
      if (snapshot.status !== 'streaming') return;
      stopTimer();
      const last = snapshot.messages.at(-1);
      if (last?.role === 'assistant')
        updateMessage(last.id, (message) =>
          message.parts
            ? ({
                ...message,
                revision: message.revision + 1,
                state: 'interrupted',
                parts: message.parts.map((part) =>
                  part.type === 'text' ? { ...part, state: 'interrupted' } : part,
                ),
              } as MessageData)
            : { ...message, revision: message.revision + 1, state: 'interrupted' },
        );
      publish({
        status: 'cancelled',
        tools: snapshot.tools.map((tool) =>
          tool.state === 'running' ? { ...tool, state: 'cancelled' } : tool,
        ),
      });
    },
    retry() {
      const prompt = snapshot.lastPrompt;
      if (snapshot.status === 'streaming' || !prompt) return;
      stopTimer();
      const messages = snapshot.messages.slice();
      const last = messages.at(-1);
      if (last?.role === 'assistant') messages.pop();
      const user = messages.at(-1);
      if (user?.role === 'user' && user.text === prompt) messages.pop();
      publish({ messages, status: 'idle' });
      start(prompt);
    },
    reset() {
      stopTimer();
      publish({
        messages: [],
        tools: [],
        status: 'idle',
        suggestions: options.suggestions ?? [],
        lastPrompt: undefined,
      });
    },
    dispose() {
      disposed = true;
      stopTimer();
      listeners.clear();
    },
  };
}
