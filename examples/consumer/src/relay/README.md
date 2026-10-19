# Relay

A customer dashboard and simulated assistant built with **Unseen UI by Stack Unseen**. It uses public library imports, local sample records and in-memory state.

## Run

Use Node 24.13.0 and pnpm 11.5.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm template:dev
```

Open `http://127.0.0.1:4184/relay.html`. For a built preview, stop the template development server and run:

```sh
pnpm --filter @unseen-ui/consumer build
pnpm template:preview
```

Relay is a separate HTML entry in `examples/consumer`. See [Getting Started](../../../../docs/GETTING-STARTED.md) for package requirements.

## Try it

1. Enter a display name at the mock login. No account or credentials are created.
2. Search, filter and sort the accounts. Open an account, edit its details, then save or cancel.
3. Ask the assistant for a summary or draft. Try Stop, Retry and **Simulate error**.
4. Use the profile menu for appearance or **Reset demo**. Reloading, resetting or leaving discards edits and conversation state.

The assistant uses deterministic text and local timers, not a model. It accepts 1,000 prompt characters, bounds responses to 4,000 characters and keeps six exchanges. Changing account context clears the conversation and pending timer. Nothing is sent to a customer or saved to a backend.

## Customize or reuse

| File                                              | Change                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `theme.ts`                                        | Brand colours, density, radius and elevation through createTheme |
| `icons.tsx`, `app.tsx`, `login.tsx`, `relay.html` | App mark, labels and document title                              |
| `data.ts`                                         | Sample records with unique IDs and valid dates                   |
| `account-table.tsx`, `account-details.tsx`        | Table/filter and controlled edit compositions                    |
| `assistant.tsx`, `assistant-host.ts`              | Conversation UI and simulated response lifecycle                 |
| CSS Modules                                       | Scoped application layout using public theme variables           |

To reuse the template, render `RelayApp` in a React app and import `@stackunseen/ui/styles.css` before app styles. Use a bundler with CSS Modules support and a client boundary in frameworks with server components. Relay uses no optional heavy renderer. Package setup is in [Getting Started](../../../../docs/GETTING-STARTED.md).

Replace the local gallery link in `app.tsx` when moving the template. The overview expects at least one account; add an empty portfolio state before supplying asynchronous data. `IconsProvider` replaces semantic library icons, while brand/sidebar SVGs are app content. See [Customize](https://unseenui.com/customize/) for theme and icon options.

The narrow table scrolls locally, and the assistant moves below it on smaller screens. Recheck keyboard navigation, focus return, contrast, 320px reflow, zoom and screen readers after customization.

## Check and connect a real host

After building and installing Chromium with `pnpm exec playwright-cli install-browser chromium`, run:

```sh
pnpm exec vitest run examples/consumer/src/relay/app.test.tsx examples/consumer/src/relay/assistant.test.tsx
pnpm test:template
```

Browser checks use an isolated preview and store reports under `output/playwright/relay-template/`.

For production, replace mock identity and in-memory updates with server authorization, validation and durable storage. Keep pending, failed, stale and acknowledged states separate. Normalize model events through a server adapter, keep credentials out of the browser, and define cancellation and disconnect recovery. Stopping an animation does not prove a remote operation stopped; unknown mutations require reconciliation before retry. Authorize any tools on the server and bind approvals to the exact action version/scope.
