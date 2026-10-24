/**
 * What a compound component is made of, written from its source; keep it in step when the parts
 * change. Two kinds:
 * - `regions`: one component that lays out areas drawn by other library components (Chat,
 *   PromptInput). The figure is a grid of those areas.
 * - `parts`: named sub-components you put together yourself (Card.Header, AlertDialog.Action).
 *   The example shows how they nest.
 * component-anatomy.test.ts checks every prop and component named here against the package.
 */
export interface AnatomyPart {
  name: string;
  /** For `parts`: the component you render for this part, such as `Card.Header`. */
  render?: string;
  /** What it shows and when. */
  description: string;
  /** Library components that draw it, each with its own page. */
  builtFrom?: readonly string[];
  /** Props that change it: on the component itself, or on `render` for parts. */
  props?: readonly string[];
  /** For `regions`: its grid area in the figure. */
  area?: string;
}

export interface Anatomy {
  kind: 'regions' | 'parts';
  intro: string;
  parts: readonly AnatomyPart[];
  /** For `regions`: a schematic grid of the areas, in the order of `parts`. */
  figure?: { columns: string; rows: string; areas: readonly string[] };
  /** For `parts`: how the parts nest. */
  example?: string;
  /** Ways to give the component its data. */
  connection?: readonly { label: string; props: readonly string[]; description: string }[];
}

export const componentAnatomy: Readonly<Record<string, Anatomy>> = {
  Chat: {
    kind: 'regions',
    intro:
      'Chat puts four regions together. Each one is a library component you can also use on its own when you need a different layout.',
    figure: {
      columns: '1fr',
      rows: '36px 168px 36px 60px',
      areas: ['header', 'transcript', 'suggestions', 'composer'],
    },
    parts: [
      {
        name: 'Header',
        area: 'header',
        description:
          'The title above the conversation, in the panel style only. The title also names the chat for screen readers.',
        props: ['title', 'variant'],
      },
      {
        name: 'Transcript',
        area: 'transcript',
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
        area: 'suggestions',
        description:
          'Prompts people can send with one click. Before the first message it shows your starters; after that, whatever the server offers. Hidden while a reply is running.',
        builtFrom: ['Suggestions'],
        props: ['suggestions', 'starters'],
      },
      {
        name: 'Composer',
        area: 'composer',
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
          'Pass a `host` and Chat follows it: messages, status, suggestions and approvals come from the host, and sends, stops and decisions go back to it. `useLocalHost` gives you a stand-in; `useAiSdkChat` adapts the AI SDK.',
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

  PromptInput: {
    kind: 'regions',
    intro:
      'One form with the text box in the middle. The slots around it hold your own controls; the text, attachments and whether sending is allowed stay with your app.',
    figure: {
      columns: '1fr 72px',
      rows: '30px 30px 84px 32px 30px',
      areas: [
        'commands commands',
        'attachments attachments',
        'text text',
        'toolbar send',
        'hint hint',
      ],
    },
    parts: [
      {
        name: 'Command list',
        area: 'commands',
        description:
          'Opens above the text when someone types "/" or "@". Choosing an item calls you back with it.',
        props: ['commands', 'onCommand', 'mentions', 'onMention', 'onMentionQueryChange'],
      },
      {
        name: 'Attachments',
        area: 'attachments',
        description: 'Your attachment chips above the text, for example a row of Attachment.',
        builtFrom: ['Attachment'],
        props: ['attachments'],
      },
      {
        name: 'Text box',
        area: 'text',
        description:
          'Grows with the text. Enter sends and Shift + Enter adds a line; typing with an input method never sends early.',
        props: [
          'value',
          'onValueChange',
          'placeholder',
          'disabled',
          'disabledReason',
          'textareaRef',
          'selection',
          'onSelectionChange',
        ],
      },
      {
        name: 'Toolbar',
        area: 'toolbar',
        description: 'Your own controls beside the send button, such as a model picker.',
        props: ['toolbar'],
      },
      {
        name: 'Send button',
        area: 'send',
        description:
          'Sends the trimmed text. While a reply runs and you pass `onCancel`, it becomes Stop response.',
        builtFrom: ['IconButton', 'Button'],
        props: [
          'onSubmit',
          'busy',
          'onCancel',
          'submitDisabled',
          'submitDisabledReason',
          'allowEmptySubmit',
        ],
      },
      {
        name: 'Hint',
        area: 'hint',
        description:
          'A line under the box: your hint, or the reason sending is unavailable. Without either it is read to screen readers only.',
        props: ['hint'],
      },
    ],
  },

  ApprovalCard: {
    kind: 'regions',
    intro:
      'A card for one proposed action. It shows what your server sent, asks for a decision and never claims the action ran.',
    figure: {
      columns: '1fr',
      rows: '40px 44px 56px 28px 36px',
      areas: ['header', 'summary', 'details', 'warnings', 'decision'],
    },
    parts: [
      {
        name: 'Header',
        area: 'header',
        description:
          'A risk icon, what kind of decision it is ("Review required"), the action and its status.',
        builtFrom: ['StatusBadge'],
        props: ['proposal'],
      },
      {
        name: 'Summary',
        area: 'summary',
        description:
          'What your server supplied about the action, such as its scopes, then its impact in plain words.',
        props: ['proposal'],
      },
      {
        name: 'Details',
        area: 'details',
        description:
          'Hidden until someone presses Details: risk and version, expiry, scopes when none were given, and a note that permission is checked again before anything runs.',
        props: ['proposal'],
      },
      {
        name: 'Warnings',
        area: 'warnings',
        description:
          'Shown only when needed: the proposal changed, it expired, or your server reported an error.',
        props: ['stale', 'expired', 'error'],
      },
      {
        name: 'Decision',
        area: 'decision',
        description:
          'Details, Reject and Approve action, then a status line that says "Decision received" only once your server confirms. If the outcome is unknown, Check decision status replaces the buttons.',
        builtFrom: ['Button'],
        props: ['onDecision', 'submission', 'onReconcile'],
      },
    ],
  },

  WorkspaceShell: {
    kind: 'regions',
    intro:
      'The frame of an app screen. It only lays out the slots you fill; routing, access and state stay with your app, and each slot mounts once.',
    figure: {
      columns: '1fr 1.8fr 1fr',
      rows: '32px 132px 30px',
      areas: ['header header header', 'navigation main inspector', 'footer footer footer'],
    },
    parts: [
      {
        name: 'Header',
        area: 'header',
        description:
          'Across the whole workspace, or above the main area only with `headerPlacement="main"` so navigation runs full height, as in chat apps.',
        props: ['header', 'headerLabel', 'headerPlacement'],
      },
      {
        name: 'Navigation',
        area: 'navigation',
        description:
          'Stacks on narrow screens. In responsive mode it gets a toggle: it collapses on wide screens and becomes a drawer on narrow ones.',
        props: [
          'navigation',
          'navigationLabel',
          'navigationMode',
          'navigationOpen',
          'onNavigationOpenChange',
          'navigationBreakpoint',
          'navigationToggleLabel',
        ],
      },
      {
        name: 'Main',
        area: 'main',
        description:
          'Your content. Use `mainAs="section"` inside a page that already has a main landmark; `scrollMode="panes"` gives each column its own scroll in a fixed-height host.',
        props: ['main', 'mainLabel', 'mainAs', 'scrollMode'],
      },
      {
        name: 'Inspector',
        area: 'inspector',
        description: 'Optional details beside the main area, such as the selected item.',
        props: ['inspector', 'inspectorLabel', 'inspectorAs'],
      },
      {
        name: 'Footer',
        area: 'footer',
        description: 'Optional status or actions along the bottom.',
        props: ['footer', 'footerLabel'],
      },
    ],
  },

  ToolCall: {
    kind: 'parts',
    intro:
      'With only a `value`, ToolCall draws its summary, input and result for you. Pass the parts as children to choose which show and in what order.',
    example: `<ToolCall value={call}>
  <ToolCall.Summary />
  <ToolCall.Result />
</ToolCall>`,
    parts: [
      {
        name: 'Root',
        render: 'ToolCall',
        description: 'Holds the call. `variant="row"` is one line that opens for details.',
        props: ['value', 'variant', 'detail'],
      },
      {
        name: 'Summary',
        render: 'ToolCall.Summary',
        description: 'The tool name and a status badge.',
        builtFrom: ['StatusBadge'],
      },
      {
        name: 'Input',
        render: 'ToolCall.Input',
        description: 'The arguments, collapsed.',
        builtFrom: ['Accordion'],
      },
      {
        name: 'Result',
        render: 'ToolCall.Result',
        description: 'The output or error, or what happened, such as "Waiting for approval".',
        builtFrom: ['ToolResult', 'LoadingIndicator'],
      },
    ],
  },

  Message: {
    kind: 'parts',
    intro:
      'Message draws one message. Its content and actions are components of their own, so you can use them in your own layout too.',
    example: `<Message value={message}>
  <MessageActions text={text} onRetry={retry} onFeedback={rate} />
</Message>`,
    parts: [
      {
        name: 'Message',
        render: 'Message',
        description: 'Who sent it and when, then the content. Children go after it.',
        props: ['value', 'variant', 'renderContent'],
      },
      {
        name: 'Content',
        render: 'MessageContent',
        description: 'Text, reasoning, files, sources and tool calls. `renderContent` replaces it.',
        builtFrom: ['StreamingResponse', 'ToolCall', 'Attachment', 'Citation'],
        props: [
          'value',
          'renderTextPart',
          'renderTool',
          'responseVariant',
          'sources',
          'tools',
          'attachments',
        ],
      },
      {
        name: 'Actions',
        render: 'MessageActions',
        description: 'Copy, plus Retry, Edit and feedback for the callbacks you pass.',
        props: [
          'text',
          'onRetry',
          'retryAvailability',
          'retryLabel',
          'onEdit',
          'editAvailability',
          'onFeedback',
          'feedbackValue',
        ],
      },
    ],
  },

  Card: {
    kind: 'parts',
    intro: 'A section you fill with parts. Use only the ones you need.',
    example: `<Card>
  <Card.Header actions={<Button size="sm">Edit</Button>}>
    <Card.Title>Component library</Card.Title>
    <Card.Description>Reusable website and AI controls.</Card.Description>
  </Card.Header>
  <Card.Content>Explore the available components.</Card.Content>
  <Card.Footer>Updated today</Card.Footer>
</Card>`,
    parts: [
      {
        name: 'Card',
        render: 'Card',
        description: 'The surface. With `href` the whole card is one link.',
        props: ['href', 'external'],
      },
      {
        name: 'Header',
        render: 'Card.Header',
        description: 'Title and description, with optional actions beside them.',
        props: ['actions', 'actionsLabel'],
      },
      {
        name: 'Title',
        render: 'Card.Title',
        description: 'The heading; `as` sets its level.',
        props: ['as'],
      },
      { name: 'Description', render: 'Card.Description', description: 'A line under the title.' },
      { name: 'Content', render: 'Card.Content', description: 'The main content.' },
      {
        name: 'Footer',
        render: 'Card.Footer',
        description: 'Actions or details at the bottom.',
      },
    ],
  },

  AlertDialog: {
    kind: 'parts',
    intro:
      'A confirmation you put together from parts. The action only asks; your app closes the dialog once your server answers.',
    example: `<AlertDialog open={open} onOpenChange={setOpen} busy={pending}>
  <AlertDialog.Trigger asChild>
    <Button variant="outline">Archive project</Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content error={error}>
    <AlertDialog.Title>Archive project?</AlertDialog.Title>
    <AlertDialog.Description>You can restore it from the archive.</AlertDialog.Description>
    <AlertDialog.Actions>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onAction={requestArchive}>Archive project</AlertDialog.Action>
    </AlertDialog.Actions>
  </AlertDialog.Content>
</AlertDialog>`,
    parts: [
      {
        name: 'Root',
        render: 'AlertDialog',
        description: 'Holds the open state. `busy` stops the action being sent twice.',
        props: ['busy'],
      },
      {
        name: 'Trigger',
        render: 'AlertDialog.Trigger',
        description: 'Opens the dialog. Pass your own Button with `asChild`.',
      },
      {
        name: 'Content',
        render: 'AlertDialog.Content',
        description: 'The dialog. `error` shows a failure your server reported.',
        props: ['error', 'container'],
      },
      {
        name: 'Title and description',
        render: 'AlertDialog.Title',
        description: 'Says what will happen, with `AlertDialog.Description` under it.',
      },
      {
        name: 'Actions',
        render: 'AlertDialog.Actions',
        description: 'Holds Cancel and the action, in that order.',
      },
      {
        name: 'Cancel',
        render: 'AlertDialog.Cancel',
        description: 'Closes the dialog without doing anything.',
        props: ['variant', 'size'],
      },
      {
        name: 'Action',
        render: 'AlertDialog.Action',
        description: 'Calls `onAction` and stays open until your server confirms.',
        props: ['onAction', 'variant', 'size'],
      },
    ],
  },

  EmptyState: {
    kind: 'parts',
    intro:
      'For the common case, pass `title`, `description`, `icon` and `actions` as props. For full control, compose the parts.',
    example: `<EmptyState>
  <EmptyStateIcon>{icon}</EmptyStateIcon>
  <EmptyStateTitle>No projects yet</EmptyStateTitle>
  <EmptyStateDescription>Your projects will appear here when you add one.</EmptyStateDescription>
  <EmptyStateActions>
    <Button>New project</Button>
  </EmptyStateActions>
</EmptyState>`,
    parts: [
      {
        name: 'EmptyState',
        render: 'EmptyState',
        description: 'The container. Props cover the common case.',
        props: ['align', 'title', 'description', 'icon', 'actions', 'titleAs'],
      },
      { name: 'Icon', render: 'EmptyStateIcon', description: 'An optional decorative icon.' },
      {
        name: 'Title',
        render: 'EmptyStateTitle',
        description: 'Says what is missing.',
        props: ['as'],
      },
      {
        name: 'Description',
        render: 'EmptyStateDescription',
        description: 'Why it is empty, or how to fill it.',
      },
      {
        name: 'Actions',
        render: 'EmptyStateActions',
        description: 'The way forward, such as New project or Clear filters.',
      },
    ],
  },

  InputGroup: {
    kind: 'parts',
    intro: 'One border around an input and what goes with it. Wrap it in Field for the label.',
    example: `<Field label="Website">
  <InputGroup>
    <InputGroupAddon>https://</InputGroupAddon>
    <Input />
    <InputGroupButton type="submit">Check</InputGroupButton>
  </InputGroup>
</Field>`,
    parts: [
      {
        name: 'Group',
        render: 'InputGroup',
        description: 'The shared border around the parts.',
        props: ['attach', 'size', 'shape', 'invalid', 'disabled'],
      },
      {
        name: 'Addon',
        render: 'InputGroupAddon',
        description: 'A prefix or suffix such as an icon, a currency sign or a domain.',
      },
      {
        name: 'Input',
        render: 'Input',
        description: 'The field itself, a normal Input.',
        builtFrom: ['Input'],
      },
      {
        name: 'Button',
        render: 'InputGroupButton',
        description: 'The action at the end, such as Subscribe.',
        props: ['variant', 'size', 'asChild', 'href'],
      },
    ],
  },

  Popover: {
    kind: 'parts',
    intro:
      'A small panel that opens from a button and can hold controls. Focus and closing on Escape or outside clicks are handled for you.',
    example: `<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger asChild>
    <Button variant="outline">Project details</Button>
  </Popover.Trigger>
  <Popover.Content title="Project details">
    {/* fields */}
    <Popover.Close asChild>
      <Button>Done</Button>
    </Popover.Close>
  </Popover.Content>
</Popover>`,
    parts: [
      {
        name: 'Root',
        render: 'Popover',
        description:
          'Holds the open state; leave it uncontrolled or pass `open` and `onOpenChange`.',
      },
      {
        name: 'Trigger',
        render: 'Popover.Trigger',
        description: 'Opens it. Pass your own Button with `asChild`.',
        props: ['variant', 'size'],
      },
      {
        name: 'Content',
        render: 'Popover.Content',
        description: 'The panel; `title` is its heading.',
        props: ['title', 'description', 'headingLevel', 'container'],
      },
      {
        name: 'Close',
        render: 'Popover.Close',
        description: 'A button that closes it, such as Done.',
      },
      {
        name: 'Arrow',
        render: 'Popover.Arrow',
        description: 'An optional pointer toward the trigger.',
      },
    ],
  },

  Tooltip: {
    kind: 'parts',
    intro:
      'Short help text on hover and keyboard focus. Nothing inside it can be clicked; use Popover for that.',
    example: `<Tooltip>
  <Tooltip.Trigger asChild>
    <Button variant="outline">Read-only preview</Button>
  </Tooltip.Trigger>
  <Tooltip.Content>Changes are kept in this local example.</Tooltip.Content>
</Tooltip>`,
    parts: [
      {
        name: 'Provider',
        render: 'TooltipProvider',
        description: 'Optional; shares the hover delay across tooltips.',
      },
      { name: 'Root', render: 'Tooltip', description: 'Holds the open state.' },
      {
        name: 'Trigger',
        render: 'Tooltip.Trigger',
        description: 'The control it describes. Pass your own with `asChild`.',
      },
      {
        name: 'Content',
        render: 'Tooltip.Content',
        description: 'The text.',
        props: ['container'],
      },
      { name: 'Arrow', render: 'Tooltip.Arrow', description: 'An optional pointer.' },
    ],
  },

  Toast: {
    kind: 'parts',
    intro:
      'Notifications that appear in a corner and go away. One provider and one viewport serve a whole notification area.',
    example: `<ToastProvider>
  <Toast open={open} onOpenChange={setOpen} tone="success">
    <ToastTitle>Saved</ToastTitle>
    <ToastDescription>Your changes are on the server.</ToastDescription>
    <ToastAction altText="Open History to undo">Undo</ToastAction>
    <ToastClose />
  </Toast>
  <ToastViewport />
</ToastProvider>`,
    parts: [
      {
        name: 'Provider',
        render: 'ToastProvider',
        description: 'Wraps the area where toasts live.',
      },
      {
        name: 'Toast',
        render: 'Toast',
        description: 'One notification, announced politely.',
        props: ['tone'],
      },
      { name: 'Title', render: 'ToastTitle', description: 'A short headline.' },
      {
        name: 'Description',
        render: 'ToastDescription',
        description: 'One or two lines of detail.',
      },
      {
        name: 'Action',
        render: 'ToastAction',
        description: 'An optional button. `altText` says how to do it once the toast is gone.',
      },
      {
        name: 'Close',
        render: 'ToastClose',
        description: 'Dismisses the toast.',
        props: ['label'],
      },
      {
        name: 'Viewport',
        render: 'ToastViewport',
        description: 'Where toasts appear. F8 moves focus there.',
        props: ['position', 'container', 'portal'],
      },
    ],
  },

  Table: {
    kind: 'parts',
    intro:
      'A native HTML table with the library styles. Wide tables scroll sideways in their own keyboard-reachable area.',
    example: `<Table label="Packages">
  <Table.Caption>Sample package status</Table.Caption>
  <Table.Header>
    <Table.Row>
      <Table.Head>Package</Table.Head>
      <Table.Head>Status</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Head scope="row">Components</Table.Head>
      <Table.Cell>Experimental alpha</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>`,
    parts: [
      {
        name: 'Table',
        render: 'Table',
        description: '`label` names the table, even without a caption.',
        props: ['label', 'scrollLabel'],
      },
      { name: 'Caption', render: 'Table.Caption', description: 'An optional visible title.' },
      {
        name: 'Header, body and footer',
        render: 'Table.Header',
        description: 'Group the rows. `Table.Body` and `Table.Footer` work the same way.',
      },
      { name: 'Row', render: 'Table.Row', description: 'One row.' },
      {
        name: 'Head',
        render: 'Table.Head',
        description: 'A header cell. Use `scope="row"` for a heading at the start of a row.',
      },
      { name: 'Cell', render: 'Table.Cell', description: 'A data cell.' },
    ],
  },
};
