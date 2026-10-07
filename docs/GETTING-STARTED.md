# Getting started

Unseen UI by Stack Unseen is an experimental React component library, published on npm under the `alpha` tag as `@stackunseen/ui` (with `@stackunseen/ui-core` as its dependency). The source repository is private.

## Install from npm

```sh
npm install @stackunseen/ui@alpha react@^19.3.0 react-dom@^19.3.0
```

Pin the exact version in your lockfile; the `alpha` tag moves with each prerelease.

## Start with a local build

With an authorized checkout:

For this workspace, use **Node 24.13 or later within Node 24** and **pnpm 11.5.0**. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm dev
```

Open [the development site](http://127.0.0.1:3000). Build the packages before starting a workspace consumer.

For the static website preview:

```sh
pnpm --filter @ai-interaction/docs build
node apps/docs/scripts/preview.mjs
```

Open [the website preview](http://127.0.0.1:4175). The preview serves the built site; rebuild the docs app after changing a page.


## Render your first component

Import the base stylesheet once and wrap the interface in `AITheme`. Put interactive composition in a Client Component in Next.js. This example saves a name in local memory and shows the result; nothing is sent or persisted.

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

The application owns validation and persistence. Connect the local callback to your host and render its pending, failed or confirmed state.

## Choose the right entry

| Import | Use | Additional optional peers |
| --- | --- | --- |
| `@stackunseen/ui` | AI components, native form controls, overlays, feedback, menus, navigation, Card and Table | None beyond React/ReactDOM |
| `@stackunseen/ui/theme` | Pure theme resolution, validation and export | None |
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
| `@stackunseen/ui/editor` | Controlled CodeMirror editing, selection, diagnostics and text proposals | @codemirror/state, @codemirror/view, @codemirror/commands, @codemirror/language, @codemirror/lint, @codemirror/lang-javascript; import editor.css |
| `@stackunseen/ui/artifact-editor` | Draft preview/edit/diff, save/export requests and receipt recovery | No additional peer; import artifact-editor.css. Compose CodeEditor through renderEditor when needed |
| `@stackunseen/ui/conversation-flow` | Exact message edit-to-branch and regenerate-to-attempt intents | No additional peer; import conversation-flow.css |
| `@stackunseen/ui/assistant` | Reasoning summary, ChainOfThought, Plan, Task, Checkpoint, Shimmer, Sources, ModelSelector, OpenInChat | No additional peer; import assistant.css |
| `@stackunseen/ui/devtools` | Snippet, Commit, EnvironmentVariables, PackageInfo, SchemaDisplay, StackTrace, sandboxed WebPreview | No additional peer; import devtools.css |
| `@stackunseen/ui/media` | AudioPlayer, Transcription, VoiceSelector, Persona, Image | No additional peer; import media.css |
| `@stackunseen/ui-core/editing` | Pure document identities, UTF-16 ranges and bounded atomic text edits | None |

Use named public imports. There are no `/button`, `/icons` or generic-family subpaths. Heavy renderer and layout peers stay outside the base entry. Importing an optional entry requires its peers even when a particular render skips that feature. Exact tested versions are in the [React package manifest](../packages/react/package.json) and the relevant feature guide.

The [public editing example](../tests/fixtures/editing-public-example.tsx) composes the optional entries. The host supplies document/draft revisions, command identities, permissions and receipts. CodeEditor preserves host UTF-16 offsets and existing line endings; a single completion can emit a next-word prefix intent. The host must validate that prefix against its original proposal. Pending and unknown requests require the original receipt before another mutation. These UI contracts do not provide model services, authentication, filesystem writes or durable storage.

## Continue with a feature

- [Website components](WEBSITE-COMPONENTS.md): forms, overlays, feedback, navigation and semantic surfaces.
- [Minimal customization](CUSTOMIZATION.md): themes, fonts, variants, icons and composition.
- [Controls and icons](CONTROLS-AND-ICONS.md) and [theming](THEMING.md): exact provider APIs and limitations.
- [Permissions and handoffs](PERMISSIONS-AND-HANDOFFS.md): scope, original receipts and acknowledged ownership.
- [Rich responses](RICH-RESPONSES.md), [forms](FORMS.md) and [application foundations](APPLICATION-FOUNDATIONS.md): larger compositions.

## Verify an integration

The [root README](../README.md#check-changes) lists development checks. `pnpm check:packages` tests isolated packed Vite/Next consumers, SSR and optional-peer absence. It also compiles the [public website example](../tests/fixtures/website-public-example.tsx).

After building and installing the local Playwright Chromium browser, `pnpm test:browser` runs the bounded decision/form/select smoke. It is not a complete browser or assistive-technology audit.

Hosts own authorization, execution, routing, storage and durable receipts. The gallery uses simulated hosts; the file, upload, voice and PTY guides describe separate local integrations. Test your production host and accessibility requirements independently.

If your page reserves a scrollbar gutter (`html { scrollbar-gutter: stable }`), add this rule as well. Select and DropdownMenu lock body scrolling while open; with a reserved gutter that lock hides the scrollbar and shifts the page, so the rule lets the page keep scrolling while the open list follows its trigger. Dialogs keep the lock.

```css
html body[data-scroll-locked]:has([data-radix-select-viewport], [data-radix-menu-content]) {
  overflow: visible !important;
  padding-right: 0 !important;
  margin-right: 0 !important;
}
```
