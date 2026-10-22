# @stackunseen/ui

React components for AI interfaces: chat, streaming replies, tool calls, approvals and agent runs, plus the forms, menus, overlays and tables an app around them needs. Part of [Unseen UI](https://unseenui.com) by Stack Unseen.

Alpha, MIT licensed. APIs can change between releases.

## Install

```sh
npm install @stackunseen/ui react@^19.3.0 react-dom@^19.3.0
```

`@stackunseen/ui-core` comes along as a dependency. Import the stylesheet once, before your own CSS, and wrap your components in `AITheme`:

```tsx
'use client';
import { AITheme, Button } from '@stackunseen/ui';
import '@stackunseen/ui/styles.css';

export function SaveButton({ onSave }: { onSave: () => void }) {
  return (
    <AITheme appearance="system" config={{ primary: '#2563eb' }}>
      <Button onClick={onSave}>Save</Button>
    </AITheme>
  );
}
```

You don't need Next.js or Tailwind. For a working chat to start from, run `npx @stackunseen/ui init` (add `--ai-sdk` for the Vercel AI SDK version).

## Entries

Ordinary components come from the package root. Heavier features live in their own entries so you only install what you use. Each entry's extra peers are only needed if you import it; supported ranges are in `package.json`.

| Entry                                                             | What's in it                                                                                                                | Extra peers                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/chat`                                                           | `Chat` and a simulated `useLocalHost`, plus `useAiSdkChat`. Import `chat.css`.                                              | none                                                       |
| `/theme`, `/status`, `/code`, `/sidecar`, `/workspace`, `/upload` | Theme helpers and smaller compositions                                                                                      | none                                                       |
| `/markdown`                                                       | Markdown replies                                                                                                            | react-markdown, remark-gfm, remend                         |
| `/math`                                                           | Formulas                                                                                                                    | katex (and its CSS)                                        |
| `/mermaid`                                                        | Diagrams                                                                                                                    | mermaid, dompurify                                         |
| `/rich-markdown`                                                  | Markdown with formulas and diagrams                                                                                         | the Markdown peers, remark-math, katex, mermaid, dompurify |
| `/highlight`                                                      | Highlighted code and diffs                                                                                                  | shiki                                                      |
| `/terminal`                                                       | Terminal view. Import `terminal.css`.                                                                                       | @xterm/xterm, @xterm/addon-fit                             |
| `/viewport`                                                       | Long conversation history                                                                                                   | @tanstack/react-virtual                                    |
| `/layout`                                                         | Resizable panels                                                                                                            | react-resizable-panels                                     |
| `/editor`                                                         | Code editor. Import `editor.css`.                                                                                           | the @codemirror packages                                   |
| `/application`                                                    | DataGrid, Combobox, Calendar, DateRangePicker and app page patterns. Import `application.css`.                              | none                                                       |
| `/marketing`                                                      | Header, hero, features, pricing, FAQ, contact and article blocks. Import `marketing.css`.                                   | none                                                       |
| `/navigation`                                                     | CommandPalette, TableOfContents, ShareMenu. Import `navigation.css`.                                                        | none                                                       |
| `/assistant`                                                      | Reasoning summary, ChainOfThought, Plan, Checkpoint, Sources, ModelSelector. Import `assistant.css`.                        | none                                                       |
| `/devtools`                                                       | Snippet, Commit, EnvironmentVariables, PackageInfo, SchemaDisplay, StackTrace, WebPreview, CodeTabs. Import `devtools.css`. | none                                                       |
| `/media`                                                          | AudioPlayer, Transcription, VoiceSelector, Persona, Image. Import `media.css`.                                              | none                                                       |
| `/conversation-flow`, `/artifact-editor`, `/mcp-apps`             | Branching and run overviews, draft editing, sandboxed MCP app views. Import the matching CSS file.                          | none                                                       |

Load `styles.css` first, then any entry stylesheet. There are no `/button` or `/icons` subpaths; use named imports from the root.

`styles.css` holds the styles of every base entry. To load less, import `styles/core.css` instead (about 21 KB gzip instead of 25 KB), then one sheet for each base entry you use, after it: `styles/layout.css`, `styles/markdown.css`, `styles/rich-markdown.css`, `styles/code.css`, `styles/highlight.css`, `styles/math.css`, `styles/mermaid.css`, `styles/terminal.css`, `styles/viewport.css`, `styles/sidecar.css`, `styles/workspace.css` or `styles/upload.css`. Optional entry sheets such as `chat.css` follow as before.

```ts
import '@stackunseen/ui/styles/core.css';
import '@stackunseen/ui/styles/layout.css';
import '@stackunseen/ui/styles/markdown.css';
import '@stackunseen/ui/chat.css';
```

## How the components behave

Components are controlled: you pass in state and get callbacks back. Your server decides what's allowed and runs the actions, so an approval card or a clicked button is a request, not proof that anything happened. The package makes no network calls, holds no credentials and doesn't connect to a model. Model and tool output is rendered as text, or through sanitized renderers, never as HTML or code.

Docs and live examples for every component: [unseenui.com](https://unseenui.com).
