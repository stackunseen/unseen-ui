/**
 * Deliberate choices a component makes that a reader might not expect: where it shows less than
 * it could, or differs from an earlier version. Shown as "Good to know" on the component page and
 * in llms-full.txt, so a surprise is documented instead of discovered.
 */
export const behaviourNotes: Record<string, readonly string[]> = {
  ModelSelector: [
    'The search field shows only for more than seven models; pass `searchable` to choose.',
    'Provider headings show only when the models come from more than one provider.',
    'The current model has a check, not a radio circle; arrow keys still move between models.',
  ],
  MCPServerCard: ['`auth-required` reads "Sign-in required"; other states show as words.'],
  MessageQueue: [
    'Rows that are simply queued carry no tag; sending, failed and unknown outcomes do.',
  ],
  AgentSteps: [
    'A finished step shows only its check; running, failed and blocked steps add a badge. The words stay available to screen readers.',
  ],
  BackgroundStatus: [
    'Zero counts are hidden and an idle status reads "Nothing running". An unknown count still shows, as "?".',
  ],
  Attachment: [
    'Media types show as short names such as CSV, PDF or "PNG image".',
    'Ready is announced to screen readers but not shown; other upload states are shown.',
  ],
  CodeTabs: ['With `copy`, the file has one Copy button: the code block inside hides its own.'],
  ScopeGrant: [
    'An expired grant says so in its badge only.',
    'Uses the host does not count read "Uses not counted", with the reason.',
  ],
  ThreadList: [
    'Compact rows are 36px with 1px between them, and showing their actions never changes a row’s height.',
    'In a sidebar that scrolls, set `--ai-navigation-height: none` and `--ai-navigation-gutter: auto` so the list grows instead of scrolling inside it; `--ai-list-inset` lines rows up with your navigation.',
  ],
  WorkspaceShell: [
    'Scrolling panes keep 4px of padding and room for a scrollbar. When a pane’s content scrolls itself (a chat, a sidebar list), set `--ai-workspace-pane-padding: 0` and `--ai-workspace-pane-gutter: auto`.',
  ],
  Message: [
    'In the chat variant a Markdown reply reads at the message size (16px), not the interface size.',
    'Earlier replies keep their actions hidden until hovered or focused; the last reply always shows them.',
  ],
  IconButton: [
    'The hint opens on hover and on keyboard focus, not when focus arrives from a click or a script.',
  ],
  Select: [
    'The empty value a form’s hidden native select reports is ignored, so a choice never resets to the placeholder.',
  ],
  FileExplorer: [
    'Only the metadata the host supplies is shown; nothing is inferred from the name.',
  ],
};
