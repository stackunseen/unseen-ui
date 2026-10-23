/**
 * What a composed component is made of: its regions, the components that draw them and the props
 * that shape each one. Written from the component's source; keep it in step when the parts change.
 */
export interface AnatomyPart {
  name: string;
  /** What the region shows and when. */
  description: string;
  /** Library components that draw it, each with its own page. */
  builtFrom: readonly string[];
  /** Props on the composed component that change this region. */
  props: readonly string[];
}

export interface Anatomy {
  intro: string;
  parts: readonly AnatomyPart[];
  /** How the component gets its data. */
  connection: readonly { label: string; props: readonly string[]; description: string }[];
}

export const componentAnatomy: Readonly<Record<string, Anatomy>> = {
  Chat: {
    intro:
      'Chat puts four regions together. Each one is a library component you can also use on its own when you need a different layout.',
    parts: [
      {
        name: 'Header',
        description:
          'The title above the conversation, in the panel style only. The title also names the chat for screen readers.',
        builtFrom: [],
        props: ['title', 'variant'],
      },
      {
        name: 'Transcript',
        description:
          'The messages: text, reasoning, files, sources and tool calls. Tools that need a person show an approval card underneath. It follows new messages and offers "Jump to latest" when you scroll up. With no messages it shows the empty state.',
        builtFrom: ['Message', 'StreamingResponse', 'ToolCall', 'ApprovalCard', 'MessageActions'],
        props: [
          'messageVariant',
          'responseVariant',
          'renderTextPart',
          'renderTool',
          'renderMessageActions',
          'feedback',
          'onFeedback',
          'onEdit',
          'branches',
          'onBranchChange',
          'emptyTitle',
          'emptyDescription',
          'emptyContent',
        ],
      },
      {
        name: 'Suggestions',
        description:
          'Prompts people can send with one click. Before the first message it shows your starters; after that, whatever the server offers. Hidden while a reply is running.',
        builtFrom: ['Suggestions'],
        props: ['suggestions', 'starters'],
      },
      {
        name: 'Composer',
        description:
          'Where people type. It sends on Enter, turns into a stop button while a reply runs and can hold your own buttons, attachments, slash commands and mentions.',
        builtFrom: ['PromptInput'],
        props: [
          'placeholder',
          'composerHint',
          'toolbar',
          'attachments',
          'commands',
          'onCommand',
          'mentions',
          'onMention',
          'maxPromptLength',
        ],
      },
    ],
    connection: [
      {
        label: 'Your server',
        props: ['host'],
        description:
          'Pass a host and Chat follows it: messages, status, suggestions and approvals come from the host, and sends, stops and decisions go back to it. useLocalHost gives you a stand-in; useAiSdkChat adapts the AI SDK.',
      },
      {
        label: 'Your own state',
        props: [
          'messages',
          'status',
          'draft',
          'onDraftChange',
          'onSend',
          'onCancel',
          'onRetry',
          'approvals',
          'onDecision',
        ],
        description:
          'Or pass the conversation as props and handle each callback yourself. Use one way or the other, not both.',
      },
    ],
  },
};
