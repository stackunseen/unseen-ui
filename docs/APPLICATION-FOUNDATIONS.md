# Application layouts

Sidecar, SplitPane, WorkspaceShell and PanelHeader compose workspaces from application-owned content. They manage layout and focus; your host owns routing, persistence and authorization.

## Imports

Import from `@ai-interaction/react/layout` with the optional `react-resizable-panels` peer (tested 4.14.1). Use `/sidecar` or `/workspace` independently to avoid that peer. Import `@ai-interaction/react/styles.css` once. These entries are separate from the base package.

## Sidecar

Sidecar accepts controlled `open/onOpenChange`, title/description, `docked`, `drawer` or `overlay` presentation, logical start/end side, optional trigger and explicit initial/return focus refs. Actions trail the title beside Close; toolbar/body/footer are slots.

Mobile adaptation defaults to 768px and can be disabled. Docked panels are non-modal complementary landmarks; drawers use Radix Dialog for focus containment, Escape and focus return. Keep drafts in the host: switching between inline and portal presentation can remount children.

## SplitPane

SplitPane accepts named primary/secondary descriptors, a controlled two-number percentage tuple totaling 100, minimum/maximum sizes and optional collapse. `onSizesChange(next, {source:'user', collapsedPanel})` reports completed interaction. Missing callbacks or `disabled` lock resizing.

The `split`, `stacked` and `responsive` presentations use the same DOM panes. Responsive layout changes orientation at a container width of 640px by default. Collapsed contents unmount. Each panel chooses host or automatic scrolling.

## WorkspaceShell and PanelHeader

WorkspaceShell accepts header/navigation/main/inspector/footer slots, `workspace`, `contained` or `compact` presentation, and flow or bounded pane scrolling. Use `mainAs="section"` to avoid a nested main landmark, and `inspectorAs="div"` when a child Sidecar already supplies complementary semantics.

PanelHeader provides heading level, description, leading/status/actions slots and a named action group with native Tab order.

## Compose a workspace

Design Foundations and the plain React consumer include a workspace with local conversation history, a resizable inspector, context/detail tabs and a retained note. [Website components](WEBSITE-COMPONENTS.md) supply navigation, menus and feedback; [ConversationViewport](HISTORY-VIEWPORT.md) supplies the transcript.

Assign scrolling deliberately, keep header actions beside their content, and test focus return when panels close. Preserve accessible labels and touch targets when customizing. There is no docking framework, layout storage or router integration.
