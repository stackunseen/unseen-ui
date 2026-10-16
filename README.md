# Unseen UI

React and TypeScript components for AI interfaces and everyday application controls, by **Stack Unseen**.

**Experimental alpha.** The packages `@stackunseen/ui-core` and `@stackunseen/ui` are published on npm (`latest` points at the current prerelease; the `alpha` tag moves with each release) and MIT licensed (see [LICENSE](LICENSE)); the source repository stays private.

## Run locally

Use Node **24.13.0** and pnpm **11.5.0**:

```sh
git clone https://github.com/stackunseen/unseen-ui.git
cd unseen-ui
pnpm install --frozen-lockfile
pnpm build:packages
pnpm dev
```

Open `http://127.0.0.1:3000`. For a production preview, run `pnpm build`, then `pnpm preview`, and open `http://127.0.0.1:4173`.

The library targets React **19.3**. The gallery uses Next.js **16.3.6** and MDX; the plain React consumer uses Vite **8.3.1**. Consuming the components does not require Next.js or Tailwind. Build packages before running workspace consumers.

## Explore

The gallery has **165 component entries**: 67 under UI Components, 82 under AI Components, and 16 application and marketing compositions. It includes forms, menus, overlays, tables, chat, streaming responses, tools, approvals and host-state inspectors. Optional entries provide Markdown, math, diagrams, highlighting, terminal views and application layouts.

Patterns contains the simulated Agent workbench, Coding studio and the **Relay** dashboard/assistant template. Customize contains Theme Studio and design foundations.

To run [Relay](examples/consumer/src/relay/README.md), build packages, run `pnpm template:dev`, and open `http://127.0.0.1:4184/relay.html`. Its guide covers preview and customization. Login, account edits and assistant responses use in-memory sample data.

## Use and customize

Start with [Getting Started](docs/GETTING-STARTED.md) for a complete React example and entry/peer requirements. Import `@stackunseen/ui/styles.css` once. Use `AITheme` for appearance and theme tokens, and `IconsProvider` for semantic SVG overrides. [Customization](docs/CUSTOMIZATION.md) explains variants, fonts, content slots and supported styling.

Guides: [website components](docs/WEBSITE-COMPONENTS.md), [rich responses](docs/RICH-RESPONSES.md), [theming](docs/THEMING.md), [controls and icons](docs/CONTROLS-AND-ICONS.md), [permissions and handoffs](docs/PERMISSIONS-AND-HANDOFFS.md).

Local host examples have separate setup and limits: [files](docs/FILES.md), [terminal](docs/TERMINALS.md), [uploads](docs/UPLOADS.md) and [voice](docs/VOICES.md).

## Workspace

| Path                | Contents                                               |
| ------------------- | ------------------------------------------------------ |
| `packages/core`     | Framework-independent contracts and runtime projection |
| `packages/react`    | Controlled components and compiled CSS                 |
| `apps/docs`         | Component gallery and Getting Started page             |
| `examples/consumer` | Plain React examples and Relay                         |
| `docs`              | Setup, API and customization guides                    |
| `tests`, `scripts`  | Tests, browser journeys, builds and package checks     |

Component code lives in `packages/react/src/components/<name>/`, alongside its component-specific tests, stories, styles and optional hooks/types. Shared helpers and styles live in `src/shared/`; providers live in `src/providers/`. Core tests are in `packages/core/tests/`, and tests spanning several components are in `tests/integration/`.

## Check changes

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build`. `pnpm check:packages` verifies isolated packed consumers; `pnpm check:size` enforces bundle budgets. `pnpm storybook` opens component states on port 6006; `pnpm build:storybook` builds them.

[Releasing](docs/RELEASING.md) covers manual version bumps, alpha promotion, npm trusted publishing and recovery. Run `pnpm test:release` for the release safeguards.

After building, install Chromium with `pnpm exec playwright-cli install-browser chromium` (add `--with-deps` on Linux when needed), then run `pnpm test:browser` and `pnpm test:template`. Reports stay under ignored `output/` directories. Automated checks do not replace manual accessibility testing.

## Integration limits

Components display host state and emit callbacks. Servers authorize and execute actions, bind decisions to their version/scope, and reconcile unknown outcomes. Model and tool output is untrusted content. The examples do not establish production identity, provider integration or general durability guarantees.

Test browser support, accessibility, locale/RTL behavior and host failures in your application. Active rich-response documents reparse on updates; check performance with your own content.
