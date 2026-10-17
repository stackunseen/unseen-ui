# Application layouts

Sidecar, SplitPane and WorkspaceShell compose workspaces from application-owned content. They manage layout and focus; your host owns routing, persistence and authorization.

## Imports

The optional `@stackunseen/ui/application` entry adds DataGrid, Combobox (single or `type="multiple"`), Calendar, DateRangePicker, PageHeader, OrgSwitcher, ListToolbar, MasterDetail, SettingsSaveCancel and UnsavedGuard. Import `@stackunseen/ui/application.css` alongside the base stylesheet; it adds no peers. The existing layout entries below remain separate.

DataGrid receives a host-filtered, sorted and paged row window. Its selection is controlled and preserves off-page IDs. Calendar and DateRangePicker use Gregorian `YYYY-MM-DD` values with explicit month, locale and date bounds. The application patterns compose ordinary controls; organization changes, draft guards and save receipts remain host-owned. The local SaaS admin template exercises these patterns with in-memory customers, members, settings and sample billing.

Import from `@stackunseen/ui/layout` with the optional `react-resizable-panels` peer (tested 4.14.1). Use `/sidecar` or `/workspace` independently to avoid that peer. Import `@stackunseen/ui/styles.css` once. These entries are separate from the base package.

## Sidecar

Sidecar accepts controlled `open/onOpenChange`, title/description, `docked`, `drawer` or `overlay` presentation, logical start/end side, optional trigger and explicit initial/return focus refs. Actions trail the title beside Close; toolbar/body/footer are slots.

Mobile adaptation defaults to 768px and can be disabled. Docked panels are non-modal complementary landmarks; drawers use Radix Dialog for focus containment, Escape and focus return. Below the breakpoint a docked or overlay panel becomes a modal drawer, or with `narrowPresentation="sheet"` a non-modal bottom sheet of `--ai-sidecar-sheet-height` (46vh) that keeps the canvas it describes visible: the body is padded by the same height while it is open and `data-ai-sidecar-sheet` is set on the root element, so an inspector for a selected node stays usable on a tablet. Keep drafts in the host: switching between inline and portal presentation can remount children.

An overlay inspector is the most recently opened layer. When `open` turns true it moves focus to `initialFocusRef`, or to the panel itself, once its portal content exists, so a host that opens it from its own state (a selected node on a canvas) needs no focus code. Escape closes it wherever focus is and returns focus to `returnFocusRef` or the previously focused element; nested popups that consume Escape keep it open, and `closeOnEscape={false}` opts out. `inset` (a number, or `{ top, bottom, inline }` in pixels) keeps the panel clear of a sticky header; the same values are the CSS custom properties `--ai-sidecar-inset`, `--ai-sidecar-inset-top` and `--ai-sidecar-inset-bottom`.

## SplitPane

SplitPane accepts named primary/secondary descriptors, a controlled two-number percentage tuple totaling 100, minimum/maximum sizes and optional collapse. `onSizesChange(next, {source:'user', collapsedPanel})` reports completed interaction. Missing callbacks or `disabled` lock resizing.

The `split`, `stacked` and `responsive` presentations use the same DOM panes. Responsive layout changes orientation at a container width of 640px by default. Collapsed contents unmount. Each panel chooses host or automatic scrolling.

## WorkspaceShell

WorkspaceShell accepts header/navigation/main/inspector/footer slots, `workspace`, `contained` or `compact` presentation, and flow or bounded pane scrolling. Use `mainAs="section"` to avoid a nested main landmark, and `inspectorAs="div"` when a child Sidecar already supplies complementary semantics.

For a section header inside a slot, use `Card.Header` with `Card.Title` (choose the level with `as`), `Card.Description` and `actions`, which form a named group with native Tab order.

## Compose a workspace

Design Foundations and the plain React consumer include a workspace with local conversation history, a resizable inspector, context/detail tabs and a retained note. [Website components](WEBSITE-COMPONENTS.md) supply navigation, menus and feedback; [ConversationViewport](HISTORY-VIEWPORT.md) supplies the transcript.

Assign scrolling deliberately, keep header actions beside their content, and test focus return when panels close. Preserve accessible labels and touch targets when customizing. There is no docking framework, layout storage or router integration.
