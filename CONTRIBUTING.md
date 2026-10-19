# Contributing

Thanks for taking a look. Unseen UI is a small project in alpha, so APIs still move, and it's worth opening an issue before starting anything large.

## Bugs and requests

Open an issue with the package version, your React and bundler versions, and a short example that shows the problem. A screenshot helps for visual bugs. For security problems, follow [SECURITY.md](SECURITY.md) instead.

## Making a change

Setup is in the [README](README.md#working-on-this-repository). Each component lives in its own folder under `packages/react/src/components/`, next to its tests, stories and CSS module.

A few rules the codebase follows:

- Components are controlled. They take state as props and report intent through callbacks. Local state is fine for things like open/closed or focus, not for whether an action happened.
- `packages/core` stays free of React, browser APIs, networking and storage.
- New dependencies go behind an optional entry (like `@stackunseen/ui/markdown`) so the base package stays light. `pnpm check:size` enforces the budget.
- Every interactive state needs a keyboard path and an accessible name. Check light and dark themes.
- Never render model or tool output as HTML or code.

Before opening a pull request, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build`. If you change how a component looks or behaves, update its page in `apps/docs` and add a line to the changelog page.

Keep pull requests focused on one change, and say in the description what you tested.

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
