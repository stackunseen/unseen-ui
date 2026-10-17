# Website components

The root `@stackunseen/ui` entry includes 36 application component families alongside the AI components. They use the shared stylesheet and theme.

## Available families

| Group | Families | Contract |
| --- | --- | --- |
| Form controls | Field, Input, Textarea, Checkbox, Switch, RadioGroup, Slider | Native form values and explicit change handlers; associated labels and errors |
| Overlays | Popover, Tooltip, AlertDialog | Radix interaction primitives, themed portals and explicit open-state control |
| Menus | DropdownMenu, ContextMenu, NavigationMenu | Action menus or website navigation; keyboard behavior and host-provided destinations |
| Feedback | Alert, Toast, Progress, EmptyState | Host-supplied messages and measurements; deliberate announcement behavior |
| Navigation | Breadcrumb, Pagination, Sidebar | Native links/current-page semantics and controlled page requests |
| Surfaces | Card, Table | Composable section and native table markup |
| Actions and links | Button (`href`), ToggleGroup, Chip | Links with Button presentation; choices as filter pills or joined segments (buttons or links); link, removable and static chips |
| Display | Tag, Avatar, Stat, Matrix | Inert labels, people, metric cards and a heatmap table. A linked card is `Card` with `href`. A single fold is an Accordion with one item |
| Wayfinding | Stepper | Series and path steps |

Existing Button, IconButton, Select, Accordion, Tabs and Modal remain available. Dialog and Sheet are gallery aliases for Modal layouts, not additional exports; a side sheet, drawer or inspector beside content is [Sidecar](APPLICATION-FOUNDATIONS.md#sidecar). Use the [root public fixture](../tests/fixtures/website-public-example.tsx) for a composition of all 36 families using only supported imports. Each family also exports its public prop types.

## Actions, links and display

`Button` accepts `asChild` and then renders its single child element with the button presentation, so a router link keeps its own `href`, `target`, `rel` and modified-click behaviour. With `href`, `Button` itself renders a link (the LinkProvider link when one is set) with the same `variant` and `size` tokens. Neither disables a link; omit the destination instead.

`ToggleGroup` is a row of filter chips. Single selection (the default) uses radio semantics: one tab stop, arrow keys move and select, and `allowEmpty` lets the selected chip be cleared to `null`. `type="multiple"` uses pressed buttons: arrow keys move focus and Space or Enter toggles. Each option takes a host-supplied `count` and may be disabled. Variants are `pills` and `segmented`; `size` is `default` or `sm`.

`Tag` is an inert label with `tone` (`neutral`, `primary`, `accent`, `success`, `warning`) and `size`. Its meaning belongs to the application; `StatusBadge` stays keyed to run and approval states. `Avatar` shows an image, else initials derived from `name` (or explicit `initials`), else a generic icon; it is decorative unless `name` is supplied, which makes it `role="img"`. `Stat` renders an application-formatted `value` with `label`, optional `delta` (whose text must carry the sign; `trend` only colours it) and `note`; `StatGroup` lays a row out responsively. Both render on the server. Use `SourceCard` for cited material with a locator, version and access state.

`ToggleGroup` covers every choice shown at once: `variant="pills"` (filter pills with counts) or `"segmented"` (joined segments); single selection is a radiogroup with one tab stop (arrow keys move and select, Home and End jump), `type="multiple"` uses pressed buttons, and `mode="links"` renders anchors with `aria-current` for URL-driven views, which works in server-rendered filter UIs. Each option may carry a `count` and a `description` read after its label.

`Chip` reads its height, inline padding and type size from `--ai-chip-height`, `--ai-chip-padding-inline` and `--ai-chip-font-size`, darkens its border on hover, and as a link passes every other anchor prop (such as `title` or a router's `scroll`) to the link component; an active link chip carries `aria-current="true"` unless `current` says otherwise. `Chip` is one component with three shapes decided by its props: a link (`href`, `active`), a removable value (`onRemove`, with a labelled remove button and Backspace or Delete while focused) or a static label. `swatch` adds a leading colour dot; `--ai-chip-active-background` and `--ai-chip-active-color` set the active fill while keeping text contrast. `ChipGroup` names the row and either wraps or scrolls horizontally; the scroll mode uses `contain: inline-size` so it never widens a flex or grid parent.

`Stepper` renders a navigation landmark (or a plain list with `as="div"`) with an ordered list of steps, as dots, a printed list, or `segments`: equal-width bars that share the row (`--ai-stepper-segment-height`, `--ai-stepper-segment-gap`), the current one darkest, planned ones thinner, with the same states, links and tooltips; (`done`, `current`, `upcoming`, `planned`, or `available` for a reachable step that announces no state), as dots that keep their labels for assistive technology or as a printed list, plus optional previous and next links, a "Step 2 of 9" reading and, for dots, `tooltip` to show each label on hover and keyboard focus. `Matrix` is a heatmap table: a real `<table>` with scoped row and column headers, header and cell links, a single-hue fill from the primary token behind a printed number in every cell, inside a labelled, focusable scroll region. The fill ramps from 8% to 100% primary and the cell text switches to the primary foreground at `--ai-matrix-flip`, the level the theme measured for its own primary. `columnHeader="angled"` rotates many narrow column labels, `zero` prints a glyph in empty cells and a row's `swatch` keeps its colour dot. `totals` adds row totals as a trailing column, column totals as a trailing row, or both; they print their number and stay out of the fill scale. Counts, links and cell names take functions (`value`, `href`, `cellLabel`) or plain grids keyed by row id then column id (`values`, `hrefs`, `cellLabels`), so a server component can pass data; a cell name becomes the cell's hover title and accessible name. The corner cell stays blank. Tokens: `--ai-matrix-max-level` caps the fill (1 is solid primary; 0.6 keeps the darkest cell inside the table), `--ai-matrix-cell-width` and `--ai-matrix-cell-height` size cells (44 by 36px), and with angled headers the end padding comes from the last label's length or `--ai-matrix-end-padding`.

`Tag` also takes `hue` (any CSS colour mixed into its surface and text; mid-lightness hues keep AA text contrast in both schemes, very light hues need darkening by the host) and `mono` for identifiers. `Select` accepts option groups (`{ label, options }`) and an inline `label`; its trigger uses the same 13px scale as its items regardless of the parent's type. Per-role corner radii (`buttonRadius`, `pillRadius`, `cardRadius`, `tagRadius`) are theme seeds; see [Theming](THEMING.md).

### Copying and appearance

`CopyButton` copies a value and reports what happened: the icon switches to a check or stays put, a polite live region announces the copied or failed message, and the button's accessible name never changes mid-press. A failed copy says to copy by hand. `iconOnly` adds a tooltip and keeps the name. `Snippet` uses it, so the library has one copy behaviour; `useCopy` is exported for hosts that render their own control.

`AppearanceToggle` is the light, dark or system choice: a `cycle` icon button whose name states the current mode and what a press switches to, or a `segmented` radiogroup. Pass the value to `AITheme`. `useStoredAppearance({ storageKey })` keeps the choice in this browser through `useSyncExternalStore` with a `system` server snapshot, follows other tabs through the storage event and survives blocked storage. `useResolvedAppearance` resolves `system` through `matchMedia` and follows changes live. `appearanceInitScript({ storageKey })` returns an inline script for the document head that sets `data-appearance` on the root element before paint, so the host's own stylesheet shows the stored choice without a flash; the provider itself follows after hydration. Until hydration the cycle button shows a neutral mark.

### Filter bars

`FilterBar` in `@stackunseen/ui/application` composes the journal-style toolbar (`searchLabelVisibility="hidden"` keeps the search label as the accessible name only and `searchIcon` adds a leading icon; in popover mode Clear sits beside the summary, and a link facet with `removeHref` gets a removable token) (`presentation="popover"` keeps the facet chips and selects behind a counted Filters button and shows each active filter as a removable token): a search form (`onSearchSubmit` on Enter), an `order` segmented ToggleGroup in button or link mode, the main `facet` as a multiple-choice ToggleGroup or link chips, with counts and swatches, secondary `selects` with an "Any" option that maps to `null`, a Clear action that appears only while something is active, and a `summary` status line. Every value belongs to the host, usually the URL; with a `LinkProvider` the link modes become router links.

### Router links

`LinkProvider` takes the host's router link once at the root; Chip, ToggleGroup (links mode), Stepper, Card and Button (`href`), and Matrix then render it with `href`, `aria-current` and their other anchor props, so filter clicks are client-side navigations with prefetching. Without a provider they render native anchors. `useLinkComponent` exposes the same component to host code. ToggleGroup's links mode puts every link in the tab order; roving focus applies to button mode only.

### Server Components

Every compound part is also a top-level named export: `CardHeader`, `CardTitle`, `SidebarGroup`, `SidebarLink`, `TooltipTrigger`, `NavigationMenuList`, `DropdownMenuItem`, `ContextMenuContent` and so on. In a Next.js Server Component import those names; the `Card.Header` property form is undefined there because a client reference proxy carries no static properties. The property form works in Client Components.

Button, Tag, Stat, Stepper, Matrix, Progress, Card, Table, Breadcrumb and the marketing blocks render in Server Components. Controls with local state or handlers are Client Components that a Server Component can render: Select, Avatar, ToggleGroup, Chip, Accordion, Sidecar, Popover, Tooltip, the menus and the dialogs.

## Forms

`Field` labels one control and connects its description/error to supported child controls. Its `id` identifies the control, not the outer div. Use `labelAs="span"` around RadioGroup or Slider, whose group/thumbs use the label relationship. An error supplies invalid state unless the host explicitly overrides it. Field does not validate business data or submit a form.

Input and Textarea retain native value/change/name/required/disabled behavior. Checkbox supports an indeterminate display without inventing a submitted value. Switch uses a native checkbox input. RadioGroup accepts controlled `value`, `options` and `onValueChange`; Slider accepts a controlled array of values and range constraints. Supply meaningful labels for each slider thumb, especially for ranges. Native form reset and controlled React state are different: the host must update its controlled values when handling reset.

Use AIForm for schema-driven questions, repeatable groups, steps and versioned submission receipts. Use these primitives when the application owns the form structure. Read [form contracts](FORMS.md) before replacing one with the other.

`InputGroup` is one bordered control holding an input and its action, for sign-up fields, search with a button or a value with a copy action. The group draws the single border, radius (`shape="control"` or `"pill"`) and focus ring through `:focus-within`; the `Input` inside gives up its own border and ring, and `InputGroupButton` keeps an inner keyboard ring. `attach="flush"` fills the end cap with the button; `"inset"` keeps an even gap. `size="touch"` gives a 44px target. Inside `Field` it takes the label, description, error and disabled state, and it works in a native form without JavaScript.

## Overlays and menus

Popover, Tooltip and AlertDialog expose compound Trigger/Content parts. Tooltip needs TooltipProvider and supplements an existing accessible name; it must not hold essential or interactive content. Popover.Content takes a title or another accessible-name relationship. Use `asChild` only on parts that expose it, with one child that forwards the needed props/ref.

AlertDialog is for a consequential confirmation. Its Action emits `onAction` and stays open until the host changes controlled `open`; `busy` disables repeat action intents while cancellation remains available. Content's `error` displays host feedback. Clicking Action is not confirmation that the operation succeeded.

DropdownMenu and ContextMenu are action menus. NavigationMenu is website navigation, with native links rather than application-menu roles. They expose Root and their supported compound parts. Destinations and action handlers belong to the application; no component fetches routes, grants access or executes a backend command.

Portals preserve the resolved AITheme and IconsProvider context. Set `dir` on locally RTL overlays when document direction differs. Content sizing supports narrow viewports and local scrolling. Arbitrary root CSS variables need separate care across portals; see [customization](CUSTOMIZATION.md).

## Feedback

Alert defaults to static content. Set announcement behavior deliberately when a message must be announced; a colour/tone alone does not make it urgent. Title, Description and Actions are composable, and `icon` accepts custom content or `null`.

Use one ToastProvider and ToastViewport per notification area. The default duration is 10 seconds; `Infinity` keeps a notification until dismissal. The primitive handles its supported interaction pauses. Toast defaults to background/polite delivery, and hosts own open state, notification identities and retained history. ToastAction's `altText` describes another way to perform the action after expiration. F8 moves focus into the viewport. Choose an appropriate viewport label and direction for the application.

Progress takes a required label and a measured `value`/`max`. Missing, null or non-finite measurements remain indeterminate; invalid maxima also remain indeterminate. `valueText` explains units, such as "3 of 8 files". Reaching the maximum describes the supplied measurement, not proof of backend success. `labelVisibility="hidden"` keeps the label for assistive technology when a card title already names the work, and `showReading={false}` drops the visible reading when the host prints it elsewhere. The bar fills its container, including flex and grid parents.

EmptyState composes Icon, Title, Description and Actions as separately exported parts. It has no automatic request, retry or empty-data inference.

`Progress variant="ring"` draws the same measurement as a ring: a labelled `progressbar`, a bounded measured value, `valueText`, `labelVisibility` and `showReading`, plus `size`. Unknown work stays indeterminate. The SVG ring draws with tokens and animates only when reduced motion is off.

## Navigation and surfaces

### The navigation entry

`@stackunseen/ui/navigation` (with `navigation.css`) holds three site-level pieces that need the root's providers and controls but not the base stylesheet's size: `CommandPalette`, `TableOfContents` and `ShareMenu`.

`CommandPalette` is a Ctrl/Cmd+K dialog for jumping to places and searching. Static `items` filter locally (every word must match the label, hint, group or keywords); `search(query, signal)` returns async results, debounced and cancelled through the signal, and results for an older query are never shown. Items sit in labelled groups under a combobox with `aria-activedescendant`; a polite live region announces the count; the key hints are decorative. Up and Down wrap, Home and End jump, Enter selects (and does nothing during IME composition), Escape and the backdrop close, and focus returns to the element that opened it. `useCommandPalette()` opens it from anywhere, replacing window events; `markMatches(text, query)` marks whole-word matches in plain text without parsing HTML; `highlight` replaces or disables it for labels. When async results land before the user has moved the selection, the first result is selected. On phones and other coarse pointers a Cancel control replaces the Esc chip and key hints. With a `LinkProvider`, items with an `href` are that router link. Below 640px it is a full-height sheet.

`TableOfContents` is an "On this page" rail. The active heading is the last one whose top has passed the reading line, tracked with an IntersectionObserver and a passive scroll listener, both cleaned up; sections before it are marked read and only the active section's sub-items show. Links are plain in-page anchors, so nothing hijacks scrolling; set `scroll-behavior: smooth` on the root yourself under `prefers-reduced-motion: no-preference`. `numbered`, `showReading`, `collapsible` and `minItems` shape the rail; `activeId` controls it; `useActiveHeading(ids)` is the headless hook.

`ShareMenu` shares the current page: copy link through `CopyButton`, the device's own share sheet when `navigator.share` exists (decided on the client only, so server and first client render agree; a dismissed sheet is not an error), and LinkedIn, X, email or custom targets built with `encodeURIComponent`, opened in a new tab with `rel="noopener noreferrer"`. No tracking parameters are added. `presentation="menu"` puts the targets in a `DropdownMenu`.

Breadcrumb accepts host items with stable IDs, labels and destinations; the current item remains explicit. Sidebar supplies a labelled navigation region with Group and Link parts. Disabled links do not offer navigation. Icons and group content are application content slots.

Pagination uses a **one-based** `page`. Supply either known `pageCount` or unknown totals with explicit `hasNextPage`; unknown totals never become a guessed page count. Choose native URLs through `getPageHref` or controlled requests through `onPageChange`. Invalid host values are not silently clamped. This differs from DataTable's separate pagination model; check that family's API before sharing state.

Card supplies Header, Title, Description, Content and Footer. Select the Title heading element with `as` to fit the page outline. Table supplies Caption, Header, Body, Footer, Row, Head and Cell with native table semantics. Supply a useful label/caption and header relationships. It does not add sorting, paging or virtualization; DataTable provides the bounded host-controlled data presentation.

For compatibility, the root `TableRow` **type** remains the existing DataTable row-data shape. The root `TableRow` **value** is the native `<tr>` component, also available as `Table.Row`; its props are `TableRowProps`. TypeScript supports these separate namespaces. Import the data type with `import type` when both are used.

## Styling

Use theme density, the part's native `className`/`style`, and a few natural content slots. Styling applies to the DOM element exposed by that part; for example, Progress forwards native props to `<progress>`, not its surrounding label group. No generic size prop or internal spacing API is implied. [Customization](CUSTOMIZATION.md) lists current icon and older-card limitations.

Check keyboard navigation, focus return, contrast and reflow after adding your data and styles.
