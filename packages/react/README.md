# @ai-interaction/react

React components for **Unseen UI by Stack Unseen**. Experimental, private and unpublished; package manifests remain `UNLICENSED`. The current import name is `@ai-interaction/react`.

Use React/ReactDOM `^19.3.0` and follow [Getting Started](../../docs/GETTING-STARTED.md) for local setup. Import `@ai-interaction/react/styles.css` once before application CSS. Components do not require Next.js, Tailwind or a CSS Modules build setup.

## Use the library

- [Website components](../../docs/WEBSITE-COMPONENTS.md): forms, overlays, menus, notifications, navigation, Card and Table.
- [Customization](../../docs/CUSTOMIZATION.md): AITheme, semantic icon overrides, variants and supported styling.
- [Rich responses](../../docs/RICH-RESPONSES.md): Markdown, code, math, diagrams and highlighting.
- [Application layouts](../../docs/APPLICATION-FOUNDATIONS.md) and [history viewport](../../docs/HISTORY-VIEWPORT.md): independent optional entries.
- [Permissions and handoffs](../../docs/PERMISSIONS-AND-HANDOFFS.md): version-bound host decisions and receipts.
- [Relay](../../examples/consumer/src/relay/README.md): a dashboard and assistant using public component imports.

Use named imports from the root for ordinary components. There are no `/button` or `/icons` subpaths. Heavy renderers have optional entries and peers listed in [Getting Started](../../docs/GETTING-STARTED.md#choose-the-right-entry) and [package.json](package.json). Pure theme helpers are available from `@ai-interaction/react/theme`.

Components receive controlled values and emit callbacks. Your host authorizes actions, executes tools and supplies confirmed outcomes. This package provides no model connection, MCP transport, authentication or hidden persistence. `RuntimeProvider` is optional.

See the [root README](../../README.md#check-changes) for development checks.
