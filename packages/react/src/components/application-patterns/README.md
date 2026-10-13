# Application patterns

These controlled compositions are used by the connected local SaaS admin template. Import them from `@stackunseen/ui/application` and load `@stackunseen/ui/application.css` alongside the base stylesheet. The integration lead owns entry/export/build configuration. No new dependency or theme configuration is required.

| Pattern              | Contract                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`         | `title`, optional `description`, `breadcrumb`, and `actions`. `headingLevel` defaults to 1; an embedded template uses 2. Actions remain trusted application children.                                                                                                                                                                                                                                             |
| `OrgSwitcher`        | Controlled `value`, immutable `organizations`, and `onValueChange`. A selection emits a scope request; the application may keep the original organization while showing its draft guard.                                                                                                                                                                                                                          |
| `ListToolbar`        | Controlled labeled search, optional filters/actions and a result summary. It never filters data. `disabled` affects its own search; the application disables supplied filters/actions explicitly.                                                                                                                                                                                                                 |
| `FilterBar`          | Controlled search (`onSearchSubmit` for Enter), an optional `order` switch (buttons or links), the main `facet` as toggle or link chips with counts and swatches, secondary `selects` with an "Any" option mapped to `null`, `onClear` shown only while something is active, and a `summary`. The host owns every value, usually in the URL; a `LinkProvider` makes the links router links.                       |
| `Checklist`          | A tick-off list whose checked ids the host owns (`value` / `onValueChange`). Progress at the top, consecutive items with the same `group` under one heading with "n / m", `rowToggle`, Reset with Undo, and Copy as Markdown (through `CopyButton`) when every title is plain text. `useStoredChecklist(storageKey)` is the opt-in way to keep progress in this browser; `checklistToMarkdown` builds the export. |
| `MasterDetail`       | Named `list` and `detail` regions, controlled `activePane`. Both panes appear on desktop; at a viewport of 720px or less, only the active pane is visible and exposed to accessibility tools. Hosts provide a back action.                                                                                                                                                                                        |
| `SettingsSaveCancel` | Controlled `dirty`, `canSave` and `SettingsSaveState`: `idle`, `pending`, `acknowledged`, `rejected`, or `unknown`. Pending/unknown block save and draft discard. Unknown offers `onReconcile`, which must look up the original receipt.                                                                                                                                                                          |
| `UnsavedGuard`       | Controlled `open`/`onOpenChange`, `onKeepEditing`, `onDiscard`, optional `destination`. Pass `returnFocusRef` with the requesting control captured before opening a guard without a Trigger. Discard emits local draft intent; the host closes the controlled dialog.                                                                                                                                             |

`SettingsSaveCancel` supports either `onSave` for button intent or `form` for native form submission. With `form`, the submit event owns saving and `onSave` is not called a second time. Messages are supplied by the host; the pattern cannot infer persistence or execution success.

```tsx
import { PageHeader, SettingsSaveCancel } from '@stackunseen/ui/application';

<form id="organization-profile" onSubmit={handleSubmit}>
  <PageHeader title="Organization settings" headingLevel={2} />
  {profileFields}
  <SettingsSaveCancel
    form="organization-profile"
    dirty={draftChanged}
    state={hostSubmission}
    onCancel={requestDraftDiscard}
    onReconcile={checkOriginalReceipt}
  />
</form>;
```

The application owns drafts, validation, before-unload behavior, data freshness, navigation and action receipts. These components do not provide authentication, payments, authorization or persistence. Scoped CSS uses the current theme tokens; there are no additional palette or variant controls.
