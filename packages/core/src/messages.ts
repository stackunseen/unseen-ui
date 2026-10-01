import type { MessageData, MessagePart, TextMessagePart } from './types.js';
export function nextMessageRevision(revision: number): number {
  if (revision >= Number.MAX_SAFE_INTEGER) throw new Error('Message revision limit reached.');
  return revision + 1;
}

/** Text-only export; references never turn into invented content or fetched data. */
export function messageText(message: MessageData): string {
  return message.parts
    ? message.parts
        .filter((part): part is TextMessagePart => part.type === 'text')
        .map((part) => part.text)
        .join('\n\n')
    : message.text;
}
export function messageTextLength(parts: readonly MessagePart[]): number {
  return parts.reduce((length, part) => length + (part.type === 'text' ? part.text.length : 0), 0);
}
export function interruptMessage(
  message: MessageData,
  state: 'interrupted' | 'failed' = 'interrupted',
): MessageData {
  if (!message.parts) return { ...message, state, revision: nextMessageRevision(message.revision) };
  return {
    ...message,
    state,
    revision: nextMessageRevision(message.revision),
    parts: message.parts.map((part) =>
      part.type === 'text' && part.state === 'streaming' ? { ...part, state: 'interrupted' } : part,
    ),
  };
}
