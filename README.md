# Unseen UI

React components for AI interfaces, plus the everyday controls an app around them needs. Made by Stack Unseen.

Browse every component, with live examples, at [unseenui.com](https://unseenui.com).

Unseen UI is in alpha, so APIs can still change between releases. It is MIT licensed.

## Install

```sh
npm install @stackunseen/ui react@^19.3.0 react-dom@^19.3.0
```

Import the stylesheet once and wrap your app in `AITheme`:

```tsx
import { AITheme, Button } from '@stackunseen/ui';
import '@stackunseen/ui/styles.css';

export function App() {
  return (
    <AITheme>
      <Button>Save</Button>
    </AITheme>
  );
}
```

You don't need Tailwind or Next.js. To start from a working chat instead, run `npx @stackunseen/ui init`, or add a starter from the shadcn registry:

```sh
npx shadcn@latest add https://unseenui.com/r/chat.json
```

[Getting started](https://unseenui.com/getting-started/) walks through the rest, including the optional entries (Markdown, code highlighting, terminal, data grid and others) and the peers each one needs.

## How it works

Components are controlled. You pass in the current state and get callbacks back. Your server decides what is allowed and runs the actions; an approval card or a clicked button only sends a request. That keeps the hard states visible: pending approvals, failed tools, lost connections and replies that stopped halfway.

## Packages

| Package                                 | What it is                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| [`@stackunseen/ui`](packages/react)     | The React components and CSS                                                   |
| [`@stackunseen/ui-core`](packages/core) | State, validation and types with no React dependency. Installed automatically. |

## Working on this repository

You need Node 24.13 or later (within Node 24) and pnpm 11.5.0.

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm dev
```

The docs site runs at http://127.0.0.1:3000. Build the packages before starting the site or any example.

| Folder             | Contents                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `packages/core`    | Framework-independent state and types                                                                                |
| `packages/react`   | Components, one folder each under `src/components/`, with their tests and stories                                    |
| `apps/docs`        | The unseenui.com website                                                                                             |
| `examples`         | A plain React app (including the Relay template) and small local hosts; see [examples/README.md](examples/README.md) |
| `tests`, `scripts` | Cross-component tests, browser checks, package and size checks, release scripts                                      |

Before sending a change, run:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

`pnpm check:packages` installs the packed packages into clean Vite and Next.js apps, and `pnpm check:size` enforces the bundle budgets. For browser checks, install Chromium with `pnpm exec playwright-cli install-browser chromium`, then run `pnpm test:browser` and `pnpm test:template`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes, [SECURITY.md](SECURITY.md) to report a vulnerability, and [docs/RELEASING.md](docs/RELEASING.md) for how versions are published.

## License

[MIT](LICENSE)
