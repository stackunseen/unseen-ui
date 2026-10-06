# DataGrid

Optional application table for trusted application records and React cells. It keeps a native table, caption, column headers and optional row headers. The existing AI-facing `DataTable` keeps its bounded inert-value contract.

The integration lead supplies `@stackunseen/ui/application` and `@stackunseen/ui/application.css`. This directory does not change central exports, manifests or builds.

```tsx
import { DataGrid } from '@stackunseen/ui/application';
import type { DataGridColumn } from '@stackunseen/ui/application';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/application.css';

interface Customer {
  id: string;
  name: string;
  seats: number;
}

const columns: readonly DataGridColumn<Customer>[] = [
  {
    id: 'name',
    header: 'Customer',
    cell: (customer) => customer.name,
    rowHeader: true,
    hideable: false,
    sortable: true,
  },
  { id: 'seats', header: 'Seats', cell: (customer) => customer.seats, align: 'end' },
];

// The application supplies the already-filtered, sorted page of customers.
<DataGrid
  caption="Customer workspaces"
  columns={columns}
  rows={customersOnPage}
  getRowId={(customer) => customer.id}
  getRowLabel={(customer) => customer.name}
  sort={sort}
  onSortChange={requestSort}
  pagination={pageSnapshot}
  onPageChange={requestPage}
  selectedRowIds={selectedIds}
  onSelectionChange={setSelectedIds}
  filter={{ value: query, onValueChange: requestFilter, label: 'Find customers' }}
  columnVisibility={visibility}
  onColumnVisibilityChange={setVisibility}
/>;
```

Use `AITheme` to provide scoped semantic tokens. Base styles supply the reused Button, Checkbox, Input and Popover styles; DataGrid's CSS stays in the optional application entry.

## Ownership and API

| API                                            | Contract                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`, `rows`, `getRowId`                  | Required immutable column definitions and current page/window. Row and column IDs must be unique and non-empty. `getRowId` must be pure and stable. There is no automatic 100-row truncation or virtualization. The host bounds large datasets with paging.                                                                           |
| `caption`                                      | Required visible table name.                                                                                                                                                                                                                                                                                                          |
| `DataGridColumn<Row>`                          | Stable `id`, string `header`, trusted `cell(row): ReactNode`; optional `sortable`, `hideable`, `align` (`start`, `center`, `end`) and `rowHeader`. Do not evaluate model-supplied JSX/code. The application handles cell content, links and action authorization.                                                                     |
| `sort`, `onSortChange`                         | Optional controlled `{ columnId, direction: 'asc' \| 'desc' }` or `null`. Activation requests ascending, descending, then clear. The host supplies the resulting row order. Hidden/unavailable sort columns do not silently clear host sorting.                                                                                       |
| `pagination`, `onPageChange`                   | Optional zero-based `pageIndex`, positive `pageSize`, optional `totalRows` and `hasNextPage`. Supplied rows already belong to the page. Inconsistent page metadata suppresses navigation. Unknown totals require explicit `hasNextPage: true` for Next. Known totals determine Next. No fetching, repeated slicing or inferred total. |
| `selectedRowIds`, `onSelectionChange`          | Presence of the ID array enables checkboxes. Callback receives a new ID array. Select-all affects only selectable supplied rows; off-page IDs and already-selected nonselectable IDs are preserved. Missing callback makes selection read-only.                                                                                       |
| `getRowLabel`, `isRowSelectable`               | Optional human-readable selection name (default stable ID) and row-specific selection availability. Row click does not select; cell actions retain independent behavior.                                                                                                                                                              |
| `filter`                                       | Controlled string `value`, optional `onValueChange` and visible `label`. Missing callback makes the field read-only. The host filters rows and resets its page when appropriate. No debounce, URL storage or hidden local filter state.                                                                                               |
| `columnVisibility`, `onColumnVisibilityChange` | Controlled ID-to-boolean map. Missing keys are visible. `hideable: false` columns remain visible and are labeled Required. A callback enables the Columns popover. Hiding every optional column produces an explicit empty-column state.                                                                                              |
| `toolbar`                                      | Optional trusted React controls. The host controls their enabled state and action outcomes.                                                                                                                                                                                                                                           |
| `loading`, `error`, `disabled`, `emptyMessage` | Loading disables built-in mutations and preserves supplied rows; an empty initial load renders three inert placeholders and a public loading status. Errors remain visible beside retained rows. Disabled locks built-in mutations; it does not represent authorization. Empty text distinguishes filtered from unfiltered rows.      |
| Root div props, `dir`                          | `className`, `style`, events and native div attributes are passed through. `dir` accepts `ltr` or `rtl`, including column-popover placement. Theme/density use existing tokens.                                                                                                                                                       |

Only popover disclosure and focus tracking are local UI state. The grid never acknowledges a server action or owns persistent selection, paging, sorting, visibility or filter state. Application callbacks must validate their scope and return authoritative snapshots.

## Keyboard and layout

- Native Tab order reaches the filter, Columns, scroll area, selection, sort buttons, rich cell controls and page buttons. Enter activates buttons; Space toggles checkboxes. The grid does not install spreadsheet arrow-key navigation.
- Headers expose `aria-sort`; checkboxes expose selected/mixed state and row-specific names. Selection summaries count global IDs and IDs on the current page.
- Radix Popover owns Escape dismissal, focus containment and trigger restoration. If a host page/visibility update removes a focused table control, focus returns to the named table scroll area only when it fell back to the document body.
- At narrow widths, toolbar and paging controls wrap. Wide table columns scroll inside the focusable table region; the document stays within its viewport. Sorting and shared controls retain 44px coarse-pointer targets.
- Surfaces, text, borders, focus, selected-row fill, spacing and density use existing `--ai-*` tokens. No motion is required. Selected checkboxes remain the primary selection cue in forced colors.

Stories demonstrate controlled paging/sort/filter/selection/visibility, React cell actions, light/dark, narrow/RTL, initial loading, refreshing, empty and retained-row error states with synthetic local customer records.

## Integration handoff

Export only `DataGrid` and the five public types (`DataGridProps`, `DataGridColumn`, `DataGridSort`, `DataGridPagination`, `DataGridFilter`) through the application entry. Internal table/toolbar/paging helpers are not public API. Keep the module stylesheet in `application.css`; importing this subtree into the existing aggregate build would consume base CSS budget. No dependencies were added.

The public entry is `@stackunseen/ui/application`. Load `@stackunseen/ui/styles.css` and `@stackunseen/ui/application.css` in your application. The existing AI DataTable remains a separate component. The repository handoff records validation and remaining acceptance limits.
