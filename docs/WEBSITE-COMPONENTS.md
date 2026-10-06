# Website components

The root `@stackunseen/ui` entry includes 22 application component families alongside the AI components. They use the shared stylesheet and theme.

## Available families

| Group | Families | Contract |
| --- | --- | --- |
| Form controls | Field, Input, Textarea, Checkbox, Switch, RadioGroup, Slider | Native form values and explicit change handlers; associated labels and errors |
| Overlays | Popover, Tooltip, AlertDialog | Radix interaction primitives, themed portals and explicit open-state control |
| Menus | DropdownMenu, ContextMenu, NavigationMenu | Action menus or website navigation; keyboard behavior and host-provided destinations |
| Feedback | Alert, Toast, Progress, EmptyState | Host-supplied messages and measurements; deliberate announcement behavior |
| Navigation | Breadcrumb, Pagination, Sidebar | Native links/current-page semantics and controlled page requests |
| Surfaces | Card, Table | Composable section and native table markup |

Existing Button, IconButton, Select, Accordion, Tabs and Modal remain available. Dialog and Sheet are gallery aliases for Modal layouts, not additional exports. Use the [root public fixture](../tests/fixtures/website-public-example.tsx) for a composition of all 22 families using only supported imports. Each family also exports its public prop types.

## Forms

`Field` labels one control and connects its description/error to supported child controls. Its `id` identifies the control, not the outer div. Use `labelAs="span"` around RadioGroup or Slider, whose group/thumbs use the label relationship. An error supplies invalid state unless the host explicitly overrides it. Field does not validate business data or submit a form.

Input and Textarea retain native value/change/name/required/disabled behavior. Checkbox supports an indeterminate display without inventing a submitted value. Switch uses a native checkbox input. RadioGroup accepts controlled `value`, `options` and `onValueChange`; Slider accepts a controlled array of values and range constraints. Supply meaningful labels for each slider thumb, especially for ranges. Native form reset and controlled React state are different: the host must update its controlled values when handling reset.

Use AIForm for schema-driven questions, repeatable groups, steps and versioned submission receipts. Use these primitives when the application owns the form structure. Read [form contracts](FORMS.md) before replacing one with the other.

## Overlays and menus

Popover, Tooltip and AlertDialog expose compound Trigger/Content parts. Tooltip needs TooltipProvider and supplements an existing accessible name; it must not hold essential or interactive content. Popover.Content takes a title or another accessible-name relationship. Use `asChild` only on parts that expose it, with one child that forwards the needed props/ref.

AlertDialog is for a consequential confirmation. Its Action emits `onAction` and stays open until the host changes controlled `open`; `busy` disables repeat action intents while cancellation remains available. Content's `error` displays host feedback. Clicking Action is not confirmation that the operation succeeded.

DropdownMenu and ContextMenu are action menus. NavigationMenu is website navigation, with native links rather than application-menu roles. They expose Root and their supported compound parts. Destinations and action handlers belong to the application; no component fetches routes, grants access or executes a backend command.

Portals preserve the resolved AITheme and IconsProvider context. Set `dir` on locally RTL overlays when document direction differs. Content sizing supports narrow viewports and local scrolling. Arbitrary root CSS variables need separate care across portals; see [customization](CUSTOMIZATION.md).

## Feedback

Alert defaults to static content. Set announcement behavior deliberately when a message must be announced; a colour/tone alone does not make it urgent. Title, Description and Actions are composable, and `icon` accepts custom content or `null`.

Use one ToastProvider and ToastViewport per notification area. The default duration is 10 seconds; `Infinity` keeps a notification until dismissal. The primitive handles its supported interaction pauses. Toast defaults to background/polite delivery, and hosts own open state, notification identities and retained history. ToastAction's `altText` describes another way to perform the action after expiration. F8 moves focus into the viewport. Choose an appropriate viewport label and direction for the application.

Progress takes a required label and a measured `value`/`max`. Missing, null or non-finite measurements remain indeterminate; invalid maxima also remain indeterminate. `valueText` explains units, such as "3 of 8 files". Reaching the maximum describes the supplied measurement, not proof of backend success.

EmptyState composes Icon, Title, Description and Actions as separately exported parts. It has no automatic request, retry or empty-data inference.

## Navigation and surfaces

Breadcrumb accepts host items with stable IDs, labels and destinations; the current item remains explicit. Sidebar supplies a labelled navigation region with Group and Link parts. Disabled links do not offer navigation. Icons and group content are application content slots.

Pagination uses a **one-based** `page`. Supply either known `pageCount` or unknown totals with explicit `hasNextPage`; unknown totals never become a guessed page count. Choose native URLs through `getPageHref` or controlled requests through `onPageChange`. Invalid host values are not silently clamped. This differs from DataTable's separate pagination model; check that family's API before sharing state.

Card supplies Header, Title, Description, Content and Footer. Select the Title heading element with `as` to fit the page outline. Table supplies Caption, Header, Body, Footer, Row, Head and Cell with native table semantics. Supply a useful label/caption and header relationships. It does not add sorting, paging or virtualization; DataTable provides the bounded host-controlled data presentation.

For compatibility, the root `TableRow` **type** remains the existing DataTable row-data shape. The root `TableRow` **value** is the native `<tr>` component, also available as `Table.Row`; its props are `TableRowProps`. TypeScript supports these separate namespaces. Import the data type with `import type` when both are used.

## Styling

Use theme density, the part's native `className`/`style`, and a few natural content slots. Styling applies to the DOM element exposed by that part; for example, Progress forwards native props to `<progress>`, not its surrounding label group. No generic size prop or internal spacing API is implied. [Customization](CUSTOMIZATION.md) lists current icon and older-card limitations.

Check keyboard navigation, focus return, contrast and reflow after adding your data and styles.
