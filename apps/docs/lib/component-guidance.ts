import type { ComponentProps } from 'react';
import type { PromptInputProps, SelectProps, Tabs } from '@ai-interaction/react';
import type { MarkdownResponseProps } from '@ai-interaction/react/markdown';
import type { MathFormulaProps } from '@ai-interaction/react/math';
import type { MermaidDiagramProps } from '@ai-interaction/react/mermaid';

type APIs = {
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
type Guide<Props> = { use: string; keyboard: string; props: PropGuide<Props>[] };

const markdown = {
  use: 'Use for host-supplied Markdown. RichMarkdownResponse additionally supports bounded math and Mermaid fences. Supply public output, never executable MDX or private reasoning.',
  keyboard:
    'Tab reaches links and code actions. Overflowing code regions are keyboard scrollable. Source headings start at headingLevel; match it to the surrounding page.',
  props: [
    {
      name: 'text',
      type: 'string',
      description: 'The current response text; replace it as host output arrives.',
    },
    {
      name: 'state',
      type: "MessageData['state']",
      description: 'The host-reported response lifecycle; completion is not inferred from text.',
    },
    {
      name: 'headingLevel',
      type: '1 | 2 | 3 | 4 | 5 | 6 (optional)',
      description: 'HTML level used for a source # heading; deeper headings stop at level six.',
    },
    {
      name: 'renderCodeBlock',
      type: '(props: MarkdownCodeBlockProps) => ReactNode (optional)',
      description:
        'Trusted application callback for fenced code. Generated content cannot choose callbacks.',
    },
  ],
} satisfies Guide<MarkdownResponseProps>;

// Common prop names are checked against the public types.
const guides = {
  PromptInput: {
    use: 'Use standard for a primary composer, compact in constrained panels and inline for a short follow-up. Keep the draft in your application and provide explicit blocked-send reasons.',
    keyboard:
      'Enter submits a ready draft; Shift+Enter inserts a line break. IME composition does not submit. Tab reaches toolbar, submit and cancel actions when available.',
    props: [
      {
        name: 'value',
        type: 'string',
        description: 'Controlled draft. The host decides when to clear it.',
      },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Receives edits to the draft.',
      },
      {
        name: 'onSubmit',
        type: '(text: string) => void',
        description:
          'Receives a trimmed valid draft. This expresses intent; it does not confirm a sent message.',
      },
      {
        name: 'busy',
        type: 'boolean (optional)',
        description: 'Blocks another submission while the host reports work in progress.',
      },
      {
        name: 'submitDisabledReason',
        type: 'string (optional)',
        description: 'Explains why sending is unavailable when submitDisabled is true.',
      },
      {
        name: 'attachments',
        type: 'ReactNode (optional)',
        description: 'Composition slot; upload state and validation remain host-owned.',
      },
    ],
  },
  Select: {
    use: 'Use for one choice from a known set. Supply a visible label or aria-label; replace the options array when labels or availability change.',
    keyboard:
      'Space or arrow keys open the menu; arrows and typeahead choose an option. Escape closes it and restores focus. Disabled options cannot be selected.',
    props: [
      { name: 'value', type: 'string', description: 'Controlled option value.' },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Requests a change to the selected value.',
      },
      {
        name: 'options',
        type: 'readonly SelectOption[]',
        description: 'Each option has value and label, plus optional disabled.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Makes the trigger unavailable.',
      },
      {
        name: 'dir',
        type: "'ltr' | 'rtl' (optional)",
        description:
          'Sets the direction of this control. Test the surrounding layout separately for RTL support.',
      },
    ],
  },
  Tabs: {
    use: 'Use for related views within one context. Content in an inactive tab unmounts; keep drafts and other persistent values above Tabs.',
    keyboard:
      'Tab enters the selected tab. Arrow keys, Home and End move between tabs using Radix behavior; selection follows focus.',
    props: [
      { name: 'value', type: 'string', description: 'Controlled active item value.' },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Requests a different active view.',
      },
      {
        name: 'items',
        type: '{ value: string; label: string; content: ReactNode }[]',
        description: 'Unique values, visible labels and application-supplied content.',
      },
      { name: 'label', type: 'string', description: 'Accessible name for the tab list.' },
    ],
  },
  MarkdownResponse: markdown,
  RichMarkdownResponse: markdown,
  MathFormula: {
    use: 'Use inline within prose, block for a standalone equation and scroll when a wide formula needs its own reading region. Import the KaTeX stylesheet in the consuming application.',
    keyboard:
      'Overflow and rejected-source regions support keyboard reading. The renderer includes MathML; screen-reader support still requires application-level testing.',
    props: [
      {
        name: 'formula',
        type: 'string',
        description:
          'TeX source, bounded to 10,000 characters. Invalid or excessive source uses an explicit fallback.',
      },
      {
        name: 'label',
        type: 'string (optional)',
        description: 'Accessible label for the formula.',
      },
    ],
  },
  MermaidDiagram: {
    use: 'Use for bounded, read-only diagrams. Keep source and fallback access available; this component does not execute a graph or provide a graph editor.',
    keyboard:
      'Tab reaches source disclosure and diagram actions. The source remains available as a reading alternative to the rendered SVG.',
    props: [
      {
        name: 'code',
        type: 'string',
        description:
          'Mermaid source. Restricted or unsupported source falls back without executing generated code.',
      },
      { name: 'title', type: 'string (optional)', description: 'Human-readable diagram title.' },
      {
        name: 'description',
        type: 'string (optional)',
        description: 'Describes the purpose or relationships shown in the diagram.',
      },
      {
        name: 'state',
        type: "'complete' | 'streaming' (optional)",
        description: 'Keep incomplete source in the streaming state until the host completes it.',
      },
    ],
  },
} satisfies { [Name in keyof APIs]: Guide<APIs[Name]> };

export function componentGuidance(name: string) {
  return Object.hasOwn(guides, name) ? guides[name as keyof typeof guides] : undefined;
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
