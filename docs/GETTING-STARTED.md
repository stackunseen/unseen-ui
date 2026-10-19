# Getting started

Unseen UI is a React component library for AI interfaces. It's published on npm as `@stackunseen/ui`, which pulls in `@stackunseen/ui-core` automatically. The full guide, with live examples, is at [unseenui.com/getting-started](https://unseenui.com/getting-started/).

## Install

```sh
npm install @stackunseen/ui react@^19.3.0 react-dom@^19.3.0
```

The packages are in alpha. Every release goes out under the `alpha` tag; `latest` moves by hand. Pin the exact version in your lockfile.

## Render your first component

Import the base stylesheet once and wrap your interface in `AITheme`. In Next.js, put interactive code in a Client Component. This example keeps a name in memory and shows it back; nothing is sent anywhere.

```tsx
'use client';
import { useState } from 'react';
import { AITheme, Button, Field, Input } from '@stackunseen/ui';
import '@stackunseen/ui/styles.css';

export function FirstExample() {
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  return (
    <AITheme>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 360 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSavedName(name.trim());
        }}
      >
        <Field label="Your name" required>
          <Input
            name="displayName"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Button type="submit">Save locally</Button>
        <p role="status">{savedName ? `Saved locally: ${savedName}` : 'Nothing saved yet.'}</p>
      </form>
    </AITheme>
  );
}
```

Your app owns validation and saving. When you connect the callback to a server, show its pending, failed and confirmed states.

## Next.js notes

### Compound parts in Server Components

`Card.Header`, `Sidebar.Group`, `Tooltip.Trigger`, `NavigationMenu.List` and the other dotted parts are undefined inside a Next.js Server Component, because the client reference proxy drops static properties. Every part is also a named export, so import it directly there:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@stackunseen/ui';
```

The dotted form works in Client Components. Button, Tag, Stat, Stepper, Matrix, Progress, Card, Table, Breadcrumb and the marketing blocks render on the server. Controls with state or handlers (Select, Avatar, ToggleGroup, Chip, Accordion, Sidecar, Popover, Tooltip, the menus and dialogs) are Client Components, which a Server Component can still render.

### Router links

Chip, ToggleGroup in links mode, Stepper, Matrix, and Card or Button with `href` render plain anchors by default, which means a full page load in Next.js. Wrap the app once in `LinkProvider` to use the router's link instead:

```tsx
import Link from 'next/link';
import { LinkProvider } from '@stackunseen/ui';

<LinkProvider component={Link}>{children}</LinkProvider>
```

A root layout can render the provider, and the components inside still render on the server. `useLinkComponent` returns the same link component for anchors you write yourself. Disabled links stay plain anchors with no destination.

### Dark code panels on a light page

Nest a second `AITheme` with `appearance="dark"` around `HighlightedCodeBlock` (or anything else). It inherits the parent theme's colors, and popovers opened inside it stay dark too.

```tsx
<AITheme appearance="dark">
  <HighlightedCodeBlock code={code} language="tsx" />
</AITheme>
```

## Choose the right entry

| Import | Use | Additional optional peers |
| --- | --- | --- |
| `@stackunseen/ui` | AI components, native form controls, overlays, feedback, menus, navigation, Card and Table; UsageMeter, ProvenanceBadge, ConfidenceNote and FeedbackCapture for trust signals | None beyond React/ReactDOM |
| `@stackunseen/ui/theme` | Pure theme resolution, validation and export | None |
| `@stackunseen/ui/chat` | Chat surface and `useLocalHost`, a simulated host for prototypes; import chat.css | None |
| `@stackunseen/ui/status` | StatusBadge entry | None |
| `@stackunseen/ui/code` | Plain code blocks | None |
| `@stackunseen/ui/markdown` | GFM responses | react-markdown, remark-gfm, remend |
| `@stackunseen/ui/math` | Standalone formulae | katex, plus its CSS/fonts |
| `@stackunseen/ui/mermaid` | Standalone diagrams | mermaid, dompurify; math-label styling also needs KaTeX CSS/fonts |
| `@stackunseen/ui/rich-markdown` | Markdown with formulae and diagrams | Markdown peers, remark-math, katex, mermaid, dompurify |
| `@stackunseen/ui/highlight` | Highlighted code and diffs | shiki |
| `@stackunseen/ui/terminal` | Optional xterm view | @xterm/xterm, @xterm/addon-fit; also import terminal.css |
| `@stackunseen/ui/viewport` | Bounded conversation history views | @tanstack/react-virtual |
| `@stackunseen/ui/layout` | Resizable application layout | react-resizable-panels |
| `@stackunseen/ui/sidecar`, `/workspace`, `/upload` | Independent application compositions | No additional optional peer |
| `@stackunseen/ui/application` | DataGrid, searchable selection, date controls and application patterns | No additional peer; import application.css alongside styles.css |
| `@stackunseen/ui/marketing` | Website navigation, hero, features, pricing, FAQ, contact and article blocks | No additional peer; import marketing.css alongside styles.css |
| `@stackunseen/ui/navigation` | CommandPalette, TableOfContents and ShareMenu for a site shell | No additional peer; import navigation.css alongside styles.css |
| `@stackunseen/ui/editor` | Controlled CodeMirror editing, selection, diagnostics and text proposals | @codemirror/state, @codemirror/view, @codemirror/commands, @codemirror/language, @codemirror/lint, @codemirror/lang-javascript; import editor.css |
| `@stackunseen/ui/artifact-editor` | Draft preview/edit/diff, save/export requests and receipt recovery | No additional peer; import artifact-editor.css. Compose CodeEditor through renderEditor when needed |
| `@stackunseen/ui/mcp-apps` | MCPAppFrame: a sandboxed MCP App view with the declared policy and a host-controlled JSON-RPC bridge | No additional peer; import mcp-apps.css |
| `@stackunseen/ui/conversation-flow` | Exact message edit-to-branch and regenerate-to-attempt intents; RunBoard, AttentionQueue, RunSummaryCard, BackgroundStatus, RunCompare and SubagentTree for work across threads; ScopeGrantList, DryRunPreview and ApprovalBatch for standing permissions, declared effects and batched approvals | No additional peer; import conversation-flow.css |
| `@stackunseen/ui/assistant` | Reasoning summary, ChainOfThought, Plan, Checkpoint, Sources, ModelSelector | No additional peer; import assistant.css |
| `@stackunseen/ui/devtools` | Snippet, Commit, EnvironmentVariables, PackageInfo, SchemaDisplay, StackTrace, sandboxed WebPreview, CodeTabs | No additional peer; import devtools.css |
| `@stackunseen/ui/media` | AudioPlayer, Transcription, VoiceSelector, Persona, Image | No additional peer; import media.css |
| `@stackunseen/ui-core/editing` | Pure document identities, UTF-16 ranges and bounded atomic text edits | None |

Use named imports. There are no `/button` or `/icons` subpaths. An optional entry needs its peers installed as soon as you import it, even if you don't use every feature. The tested peer versions are in the [package manifest](../packages/react/package.json).

The [editing example](../tests/fixtures/editing-public-example.tsx) shows several optional entries together.

## Scrollbar gutter

If your page reserves a scrollbar gutter (`html { scrollbar-gutter: stable }`), add this rule. Select and DropdownMenu lock body scrolling while open, and with a reserved gutter that lock shifts the page. The rule keeps the page still. Dialogs keep the lock.

```css
html body[data-scroll-locked]:has([data-radix-select-viewport], [data-radix-menu-content]) {
  overflow: visible !important;
  padding-right: 0 !important;
  margin-right: 0 !important;
}
```

## Working from the repository

To run the docs site and examples locally, use Node 24.13 or later (within Node 24) and pnpm 11.5.0:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm dev
```

The site runs at http://127.0.0.1:3000. For a static preview of the built site:

```sh
pnpm --filter @unseen-ui/docs build
node apps/docs/scripts/preview.mjs
```

Then open http://127.0.0.1:4175.

## More

- [Components](https://unseenui.com/components/): every component with its props, variants and states.
- [Customize](https://unseenui.com/customize/): colors, fonts, density and corners.
- [Connect to your app](https://unseenui.com/docs/integration/): wiring components to a server, tools and approvals.
- [Examples](../examples/README.md): local demo hosts for files, uploads, a terminal and voice.
