# Getting started

Unseen UI by Stack Unseen provides React components for AI interfaces and everyday application controls. It is a private experimental alpha with unpublished packages marked `UNLICENSED`. The `@ai-interaction/*` names are workspace imports, not an npm registry installation.

## Run the workspace

Use Node 24.13.0 and pnpm 11.5.0. With access to the private repository, create a local checkout:

```sh
git clone https://github.com/stackunseen/unseen-ui.git
cd unseen-ui
```

From the checkout root, install and build the packages before starting the gallery:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm dev
```

Open `http://127.0.0.1:3000`. For a production preview, run `pnpm build`, then `pnpm preview`, and open `http://127.0.0.1:4173`.

`packages/core` contains framework-independent contracts. `packages/react` contains components and compiled CSS. `apps/docs` is the Next/MDX gallery, and `examples/consumer` is a plain React/Vite application. Tailwind is used only for gallery layout; consumers do not need it or a CSS Modules configuration.

The gallery uses Next.js 16.3.6 and React 19.3.0; the consumer uses Vite 8.3.1. The workspace includes optional renderers for its examples. Other applications need only the peers required by their chosen entries.

## Explore the library and template

The gallery contains 93 component entries: 44 UI Components and 49 AI Components. Patterns includes Agent workbench, Coding studio and the single current template, Relay. Customize contains Theme Studio and design foundations. Style and State selectors show the presentations and fixtures that each component actually supports.

[Relay](../examples/consumer/src/relay/README.md) is a customer dashboard with mock login, editable accounts and a simulated assistant. After building packages, run `pnpm template:dev` and open `http://127.0.0.1:4184/relay.html`. Its guide covers the built preview and customization. All state stays in memory; no identity or model service is connected.

For another application in this pnpm workspace, use workspace dependencies on `@ai-interaction/react` and `@ai-interaction/core`, plus compatible React and ReactDOM peers. Both React peers are currently `^19.3.0`. The package's ordinary dependencies, including Radix primitives, install with it. For an isolated local application, `pnpm check:packages` demonstrates packing both packages and installing them together without a registry release.

## Render a controlled component

Import the stylesheet once in the application entry. In Next, put interactive composition in a Client Component; pure theme helpers remain available from `@ai-interaction/react/theme` on the server.

```tsx
'use client';
import { useState } from 'react';
import { AITheme, Button, Field, Input } from '@ai-interaction/react';
import '@ai-interaction/react/styles.css';

export function NameForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <AITheme appearance="system" config={{ primary: '#2563eb', density: 'comfortable' }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name);
        }}
      >
        <Field label="Display name" description="Shown to your team" required>
          <Input name="displayName" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Button type="submit">Save name</Button>
      </form>
    </AITheme>
  );
}
```

The callback requests a save. The host validates and persists the value and supplies any pending, error or confirmed state. For approvals, permissions and handoffs, use the family-specific versioned contracts rather than treating a click as confirmation.

## Choose the right entry

| Import | Use | Additional optional peers |
| --- | --- | --- |
| `@ai-interaction/react` | AI components, native form controls, overlays, feedback, menus, navigation, Card and Table | None beyond React/ReactDOM |
| `@ai-interaction/react/theme` | Pure theme resolution, validation and export | None |
| `@ai-interaction/react/status` | StatusBadge entry | None |
| `@ai-interaction/react/code` | Plain code blocks | None |
| `@ai-interaction/react/markdown` | GFM responses | react-markdown, remark-gfm, remend |
| `@ai-interaction/react/math` | Standalone formulae | katex, plus its CSS/fonts |
| `@ai-interaction/react/mermaid` | Standalone diagrams | mermaid, dompurify; math-label styling also needs KaTeX CSS/fonts |
| `@ai-interaction/react/rich-markdown` | Markdown with formulae and diagrams | Markdown peers, remark-math, katex, mermaid, dompurify |
| `@ai-interaction/react/highlight` | Highlighted code and diffs | shiki |
| `@ai-interaction/react/terminal` | Optional xterm view | @xterm/xterm, @xterm/addon-fit; also import terminal.css |
| `@ai-interaction/react/viewport` | Bounded conversation history views | @tanstack/react-virtual |
| `@ai-interaction/react/layout` | Resizable application layout | react-resizable-panels |
| `@ai-interaction/react/sidecar`, `/workspace`, `/upload` | Independent application compositions | No additional optional peer |

Use named public imports. There are no `/button`, `/icons` or generic-family subpaths. Heavy renderer and layout peers stay outside the base entry. Importing an optional entry requires its peers even when a particular render skips that feature. Exact tested versions are in the [React package manifest](../packages/react/package.json) and the relevant feature guide.

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
