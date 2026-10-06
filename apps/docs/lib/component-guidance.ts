import type { ComponentProps } from 'react';
import type {
  AlertDialogProps,
  AccordionProps,
  ApprovalCardProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  ConnectionStatusProps,
  InputProps,
  MessageProps,
  Modal,
  PromptInputProps,
  SelectProps,
  SwitchProps,
  Tabs,
  ToolCall,
} from '@stackunseen/ui';
import type { MarkdownResponseProps } from '@stackunseen/ui/markdown';
import type { MathFormulaProps } from '@stackunseen/ui/math';
import type { MermaidDiagramProps } from '@stackunseen/ui/mermaid';
import { optionalGuidance } from './optional-guidance';

type APIs = {
  Button: ButtonProps;
  Input: InputProps;
  Checkbox: CheckboxProps;
  Switch: SwitchProps;
  Modal: ComponentProps<typeof Modal>;
  AlertDialog: AlertDialogProps;
  Accordion: AccordionProps;
  Card: CardProps;
  ApprovalCard: ApprovalCardProps;
  ToolCall: ComponentProps<typeof ToolCall>;
  ConnectionStatus: ConnectionStatusProps;
  Message: MessageProps;
  PromptInput: PromptInputProps;
  Select: SelectProps;
  Tabs: ComponentProps<typeof Tabs>;
  MarkdownResponse: MarkdownResponseProps;
  RichMarkdownResponse: MarkdownResponseProps;
  MathFormula: MathFormulaProps;
  MermaidDiagram: MermaidDiagramProps;
};
type PropGuide<Props> = {
  name: Extract<keyof Props, string>;
  type: string;
  description: string;
};
export type Guide<Props> = { use: string; keyboard: string; props: PropGuide<Props>[] };

const markdown = {
  use: 'Display a Markdown response as text arrives. RichMarkdownResponse also renders supported math and Mermaid fences. Pass the Markdown text from your response.',
  keyboard:
    'Tab reaches links and code actions. Wide code blocks can be scrolled with the keyboard. Set headingLevel to fit the page outline.',
  props: [
    {
      name: 'text',
      type: 'string',
      description: 'The response so far. Update it as new text arrives.',
    },
    {
      name: 'state',
      type: "MessageData['state']",
      description: 'The response state from your application, including streaming or complete.',
    },
    {
      name: 'headingLevel',
      type: '1 | 2 | 3 | 4 | 5 | 6 (optional)',
      description:
        'Heading level for a Markdown # heading. Defaults to 3; deeper headings stop at 6.',
    },
    {
      name: 'renderCodeBlock',
      type: '(props: MarkdownCodeBlockProps) => ReactNode (optional)',
      description:
        'Render fenced code with your own component. Define this callback in your application.',
    },
  ],
} satisfies Guide<MarkdownResponseProps>;

// Common prop names are checked against the public types.
const guides = {
  Accordion: {
    use: 'Put supporting information in labelled panels. Keep approval scope and other decision details visible. Set an item’s keepMounted to true when closing it must preserve a local form draft.',
    keyboard:
      'Enter or Space toggles the focused panel. Arrow keys, Home and End move between enabled headings. Closed controls are hidden from keyboard navigation.',
    props: [
      {
        name: 'type',
        type: "'single' | 'multiple'",
        description: 'Allow one or several panels to be open.',
      },
      {
        name: 'items',
        type: 'AccordionItem[]',
        description:
          'Stable value, title and content for each panel. Optional disabled and keepMounted flags. Titles must not contain buttons or links.',
      },
      {
        name: 'value',
        type: 'string | string[] (optional)',
        description:
          'Controlled open panel values; update them through onValueChange. Use defaultValue for local disclosure state.',
      },
      {
        name: 'headingLevel',
        type: '2 | 3 | 4 | 5 | 6 (optional)',
        description: 'Match the surrounding heading outline. Defaults to 3.',
      },
      {
        name: 'region',
        type: 'boolean (optional)',
        description:
          'Use false for nested or repeated supporting panels to avoid excess region landmarks.',
      },
    ],
  },
  Button: {
    use: 'Use for an action such as saving or opening a panel. Give it clear text; use IconButton when the action only has an icon. Use a link for navigation.',
    keyboard: 'Tab focuses the button. Enter or Space activates it; disabled buttons are skipped.',
    props: [
      { name: 'children', type: 'ReactNode (optional)', description: 'The visible button label.' },
      {
        name: 'onClick',
        type: '(event: MouseEvent<HTMLButtonElement>) => void (optional)',
        description: 'Handles activation. Track pending, success and failure in your application.',
      },
      {
        name: 'type',
        type: "'button' | 'submit' | 'reset' (optional)",
        description: 'Defaults to button. Set submit when it should submit a form.',
      },
      {
        name: 'variant',
        type: "'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' (optional)",
        description: 'Visual emphasis. Defaults to primary; danger suits a destructive action.',
      },
      {
        name: 'size',
        type: "'default' | 'sm' (optional)",
        description: 'Use sm for a compact secondary action. Omit it for the regular size.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Prevents activation. Explain unavailable actions near the button.',
      },
    ],
  },
  Input: {
    use: 'Use for a single-line form value. Wrap it in Field for a label, help text and an error, or connect a label with id and htmlFor. A placeholder does not replace a label.',
    keyboard:
      'Tab focuses the input. Editing and form submission follow the native input type; readOnly keeps the field focusable, while disabled skips it.',
    props: [
      {
        name: 'value',
        type: 'string | number | readonly string[] (optional)',
        description: 'The controlled value. For a text field, keep a string in application state.',
      },
      {
        name: 'onChange',
        type: '(event: ChangeEvent<HTMLInputElement>) => void (optional)',
        description: 'Read event.currentTarget.value to update your controlled text value.',
      },
      {
        name: 'type',
        type: 'HTMLInputTypeAttribute (optional)',
        description:
          'Defaults to text. Choose email, password or another native input type as needed.',
      },
      { name: 'name', type: 'string (optional)', description: 'The key used in native form data.' },
      {
        name: 'required',
        type: 'boolean (optional)',
        description: 'Enables native required validation. Validate application rules separately.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Blocks editing and excludes the input from native form submission.',
      },
    ],
  },
  Checkbox: {
    use: 'Use for an independent choice or several choices in a group. Give each checkbox a label through Field or a native label. Use indeterminate for a mixed selection.',
    keyboard: 'Tab focuses the checkbox. Space toggles it. Disabled checkboxes are skipped.',
    props: [
      {
        name: 'checked',
        type: 'boolean (optional)',
        description: 'The controlled checked state. Update it when the user changes the selection.',
      },
      {
        name: 'onCheckedChange',
        type: '(checked: boolean) => void (optional)',
        description:
          'Receives the next checked value. Use it with checked for a controlled checkbox.',
      },
      {
        name: 'indeterminate',
        type: 'boolean (optional)',
        description: 'Shows a mixed selection. It does not change checked or the submitted value.',
      },
      { name: 'name', type: 'string (optional)', description: 'The key used in native form data.' },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Prevents changes and excludes the checkbox from native form submission.',
      },
    ],
  },
  Switch: {
    use: 'Use for an on/off setting, such as email notifications. Give it a label through Field or a native label, and keep the label the same in both states.',
    keyboard: 'Tab focuses the switch. Space toggles it. Disabled switches are skipped.',
    props: [
      { name: 'checked', type: 'boolean (optional)', description: 'The controlled on/off state.' },
      {
        name: 'onCheckedChange',
        type: '(checked: boolean) => void (optional)',
        description: 'Receives the next state. Your application decides when to save the setting.',
      },
      {
        name: 'name',
        type: 'string (optional)',
        description: 'The form-data key. The switch uses a native checkbox input.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Prevents changes and excludes the switch from native form submission.',
      },
    ],
  },
  Modal: {
    use: 'Use for a focused task without leaving the page. Keep open in application state and put the form or other content in children. Use header for a custom heading and footer for actions that stay visible while the body scrolls.',
    keyboard:
      'Opening moves focus inside. Tab stays within the panel; Escape closes it and returns focus to the trigger.',
    props: [
      { name: 'open', type: 'boolean', description: 'Whether the panel is open.' },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        description: 'Update open when the trigger, close button or dismissal changes it.',
      },
      {
        name: 'title',
        type: 'string',
        description:
          'The accessible panel name. Also shown as the heading unless you supply header.',
      },
      {
        name: 'description',
        type: 'string',
        description:
          'A short task explanation. It remains visible below the default or custom heading.',
      },
      {
        name: 'trigger',
        type: 'ReactNode',
        description: 'One trigger element that accepts button props and a ref.',
      },
      { name: 'children', type: 'ReactNode', description: 'Your content in the scrollable body.' },
      {
        name: 'layout',
        type: "'dialog' | 'sheet' | 'fullscreen' (optional)",
        description: 'Choose the panel presentation. Defaults to dialog.',
      },
      {
        name: 'header',
        type: 'ReactNode (optional)',
        description:
          'Replaces the visible title. The title prop still supplies the accessible name.',
      },
      {
        name: 'footer',
        type: 'ReactNode (optional)',
        description:
          'Your actions below the scrolling body. Set open to false from a cancel handler.',
      },
      {
        name: 'className',
        type: 'string (optional)',
        description: 'Adds a class to the panel surface in every layout.',
      },
      {
        name: 'style',
        type: 'CSSProperties (optional)',
        description: 'Inline styles for the panel surface, such as a custom width.',
      },
    ],
  },
  AlertDialog: {
    use: 'Use for a consequential confirmation. Compose Trigger, Content, Title, Description and Actions, with Cancel before Action. Action.onAction starts your request; close the controlled dialog after it succeeds. Show failures through Content.error.',
    keyboard:
      'Opening focuses Cancel by default. Tab stays inside. Cancel or Escape closes the dialog and restores trigger focus; clicking outside does not close it.',
    props: [
      {
        name: 'open',
        type: 'boolean (optional)',
        description:
          'Control whether the confirmation is open, especially for asynchronous actions.',
      },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void (optional)',
        description: 'Update open when the user opens or dismisses the confirmation.',
      },
      {
        name: 'busy',
        type: 'boolean (optional)',
        description: 'Disables Action while a request is pending. Cancel remains available.',
      },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description:
          'The compound parts. Action stays open until your application closes the dialog.',
      },
    ],
  },
  Card: {
    use: 'Group related content with Header, Title, Description, Content and Footer. These parts accept your children; render your own header and footer content. Set Title.as to match the page heading level.',
    keyboard:
      'A card is a section, not a button. Tab reaches links and controls inside it; the card itself has no keyboard action.',
    props: [
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description: 'Your content, with or without the supplied compound parts.',
      },
      {
        name: 'aria-labelledby',
        type: 'string (optional)',
        description: 'Point to the title id when the section should be a named region.',
      },
      {
        name: 'className',
        type: 'string (optional)',
        description:
          'Add application styles to the section. Each compound part also accepts className.',
      },
    ],
  },
  ApprovalCard: {
    use: 'Show an action for review before sending a decision to your server. Keep the proposal version and action digest with the request, and track execution separately from the decision receipt.',
    keyboard:
      'Tab reaches Reject, then Approve action. When the outcome is unknown, it reaches Check decision status instead. Enter or Space activates an enabled action.',
    props: [
      {
        name: 'proposal',
        type: 'ApprovalProposal',
        description:
          'The action details, scope, version, digest, status and expiry from your server.',
      },
      {
        name: 'submission',
        type: 'SubmissionState',
        description: 'The decision request state. Keep it separate from proposal.status.',
      },
      {
        name: 'onDecision',
        type: "(decision: 'approve' | 'reject', proposal: ApprovalProposal) => void",
        description:
          'Send the chosen decision for this proposal and update submission from the result.',
      },
      {
        name: 'stale',
        type: 'boolean (optional)',
        description: 'Disables decisions when the displayed proposal may be out of date.',
      },
      {
        name: 'error',
        type: 'string (optional)',
        description: 'The decision failure to show. The card does not infer a result from a click.',
      },
      {
        name: 'onReconcile',
        type: '() => void (optional)',
        description: 'Look up the original decision after an unknown outcome before trying again.',
      },
    ],
  },
  ToolCall: {
    use: 'Show a tool request and the result reported by your server. Update value as input arrives or execution changes, and preserve outcome-unknown until the server resolves it.',
    keyboard:
      'Tab reaches input and execution disclosures. Enter or Space opens them; the input preview supports keyboard reading and scrolling.',
    props: [
      {
        name: 'value',
        type: 'ToolCallData',
        description:
          'The tool id, name, revision, state and input, with optional output, error and durationMs.',
      },
      {
        name: 'variant',
        type: "'card' | 'terminal' | 'compact' (optional)",
        description: 'Defaults to card. Compact keeps execution details behind a disclosure.',
      },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description:
          'Replace the default layout with Summary, Input and Result inside ToolCall.Root.',
      },
    ],
  },
  ConnectionStatus: {
    use: 'Show connection state alongside the freshness of the displayed data. Your application supplies both and handles recovery requests; keep completed actions visible during a connection loss.',
    keyboard:
      'Tab reaches available recovery actions and connection details. Enter or Space activates an action or opens the details.',
    props: [
      {
        name: 'value',
        type: 'ConnectionInfo',
        description:
          'Connection state, data freshness, adapter capabilities and any recovery cursor.',
      },
      {
        name: 'submission',
        type: 'SubmissionState (optional)',
        description:
          'The recovery request state. Defaults to idle; track unknown outcomes explicitly.',
      },
      {
        name: 'onResume',
        type: '(cursor: RecoveryCursor) => void (optional)',
        description: 'Ask your host to resume from the supplied cursor when replay is available.',
      },
      {
        name: 'onRefresh',
        type: '() => void (optional)',
        description: 'Request a current snapshot when the adapter supports it.',
      },
      {
        name: 'error',
        type: 'string (optional)',
        description: 'The recovery failure to show alongside the retained connection state.',
      },
      {
        name: 'variant',
        type: "'banner' | 'card' | 'compact' (optional)",
        description: 'Choose a presentation for the available space. Defaults to banner.',
      },
    ],
  },
  Message: {
    use: 'Display one user, assistant or system message. Supply plain text or ordered parts and resolve their references through sources, tools and attachments. Use renderTextPart to format text parts, or renderContent to replace the whole body.',
    keyboard:
      'The message itself is an article. Tab reaches the links, disclosures and actions inside it; their controls handle keyboard interaction.',
    props: [
      {
        name: 'value',
        type: 'MessageData',
        description: 'The id, role, state and revision, with either text or parts as its content.',
      },
      {
        name: 'sources',
        type: 'readonly Source[] (optional)',
        description: 'Source records matched to source parts by sourceId. Keep ids unique.',
      },
      {
        name: 'tools',
        type: 'readonly ToolCallData[] (optional)',
        description: 'Tool records matched to tool parts by toolCallId. Keep ids unique.',
      },
      {
        name: 'attachments',
        type: 'readonly MessageAttachment[] (optional)',
        description:
          'Attachment records matched by id and version, including access and preview data.',
      },
      {
        name: 'renderTextPart',
        type: "(part: TextMessagePart, variant: ComponentVariant<'StreamingResponse'>) => ReactNode (optional)",
        description: 'Render each text part, for example as Markdown. Keep the callback stable.',
      },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description: 'Content after the message body, such as MessageActions or extra attachments.',
      },
    ],
  },
  PromptInput: {
    use: 'Use standard for the main composer, compact in a small panel and inline for a short follow-up. Keep the draft in application state and explain why sending is unavailable.',
    keyboard:
      'Enter sends a ready draft; Shift+Enter adds a line break. Enter does not send while composing with an IME. Tab reaches the toolbar and send or stop controls.',
    props: [
      {
        name: 'value',
        type: 'string',
        description: 'The controlled draft. Clear it when your application is ready to do so.',
      },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Update value with the edited draft.',
      },
      {
        name: 'onSubmit',
        type: '(text: string) => void',
        description:
          'Receives the trimmed draft. Send it through your application and track the result there.',
      },
      {
        name: 'busy',
        type: 'boolean (optional)',
        description: 'Prevents another send while a response is in progress.',
      },
      {
        name: 'submitDisabled',
        type: 'boolean (optional)',
        description: 'Disables sending while keeping the draft editable.',
      },
      {
        name: 'submitDisabledReason',
        type: 'string (optional)',
        description: 'The explanation shown when submitDisabled is true.',
      },
      {
        name: 'attachments',
        type: 'ReactNode (optional)',
        description:
          'Content above the draft, such as attachment previews. Handle uploads separately.',
      },
    ],
  },
  Select: {
    use: 'Use for one choice from a list. Give the trigger a visible label or aria-label, and replace options when choices change. Use an empty value to show the placeholder.',
    keyboard:
      'Enter, Space or arrow keys open the list. Arrows move through options; typing jumps to a matching label. Enter or Space selects, and Escape closes and restores focus.',
    props: [
      {
        name: 'value',
        type: 'string',
        description: 'The selected option value, or an empty string.',
      },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Update value with the selected option.',
      },
      {
        name: 'options',
        type: 'readonly SelectOption[]',
        description:
          'Options need unique, non-empty values and labels. Set disabled on unavailable ones.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Prevents opening or changing the selection.',
      },
      {
        name: 'dir',
        type: "'ltr' | 'rtl' (optional)",
        description:
          'Sets the control direction. Check the surrounding layout when using right-to-left text.',
      },
    ],
  },
  Tabs: {
    use: 'Use for related views on the same page. Inactive content unmounts, so keep drafts and values that must survive switching in the parent component.',
    keyboard:
      'Tab focuses the selected tab. Left and Right arrows, Home and End move between tabs and activate them. Tab then moves into the active panel.',
    props: [
      { name: 'value', type: 'string', description: 'The active item value.' },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Update value when a different tab is selected.',
      },
      {
        name: 'items',
        type: '{ value: string; label: string; content: ReactNode }[]',
        description: 'Each item needs a unique value, a visible label and its panel content.',
      },
      { name: 'label', type: 'string', description: 'The accessible name for this group of tabs.' },
    ],
  },
  MarkdownResponse: markdown,
  RichMarkdownResponse: markdown,
  MathFormula: {
    use: 'Use inline within a sentence, block for a standalone equation and scroll for a wide formula. Import the KaTeX stylesheet in your application.',
    keyboard:
      'Tab reaches the formula or fallback source for keyboard reading and scrolling. The output includes MathML; test it with the screen readers you support.',
    props: [
      {
        name: 'formula',
        type: 'string',
        description:
          'TeX source, up to 10,000 characters. Invalid or longer input shows a source preview and message.',
      },
      {
        name: 'label',
        type: 'string (optional)',
        description: 'An accessible name. Defaults to Mathematical formula.',
      },
    ],
  },
  MermaidDiagram: {
    use: 'Display a Mermaid diagram with its source available to read. This is a diagram viewer; handle editing and workflow execution in your application.',
    keyboard:
      'Tab reaches the source disclosure and diagram controls. Use the source view as an alternative to reading the diagram.',
    props: [
      {
        name: 'code',
        type: 'string',
        description:
          'Mermaid source. Restricted, unsupported or invalid input shows a source preview and message.',
      },
      {
        name: 'title',
        type: 'string (optional)',
        description: 'The diagram title. Defaults to Diagram.',
      },
      {
        name: 'description',
        type: 'string (optional)',
        description: 'A short explanation of what the diagram shows.',
      },
      {
        name: 'state',
        type: "'complete' | 'streaming' (optional)",
        description:
          'Use streaming while source is arriving, then complete when it is ready to render.',
      },
    ],
  },
} satisfies { [Name in keyof APIs]: Guide<APIs[Name]> };

export function componentGuidance(name: string) {
  return Object.hasOwn(guides, name) ? guides[name as keyof typeof guides] : optionalGuidance(name);
}

export const rendererPeers: Record<string, string[]> = {
  '/layout': ['react-resizable-panels'],
  '/markdown': ['react-markdown', 'remark-gfm', 'remend'],
  '/math': ['katex'],
  '/mermaid': ['mermaid', 'dompurify'],
  '/rich-markdown': [
    'react-markdown',
    'remark-gfm',
    'remend',
    'remark-math',
    'katex',
    'mermaid',
    'dompurify',
  ],
  '/highlight': ['shiki'],
  '/terminal': ['@xterm/xterm', '@xterm/addon-fit'],
};
