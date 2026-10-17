import type { CatalogEntry } from './catalog';

type WebsiteEntry = Omit<CatalogEntry, 'category' | 'presentations' | 'presentationProp'>;
const entry = (value: WebsiteEntry): CatalogEntry => ({
  ...value,
  category: value.group ?? 'Website components',
  presentations: ['default'],
  presentationProp: null,
});
const fieldOwner =
  'The application owns the value and validation result. Field associates the visible label, description and error with its control; a rendered error is not server validation.';
const inputKeyboard =
  'Tab focuses the native control. Labels are associated with their inputs; disabled controls leave the tab order. Error text remains available through aria-describedby.';

export const websiteCatalog: CatalogEntry[] = [
  entry({
    name: 'Field',
    group: 'Forms',
    aliases: ['Form field', 'Label', 'Validation message'],
    description: 'A shared label, description and validation message around a form control.',
    states: ['Default', 'Required', 'Invalid', 'Disabled'],
    contract:
      'label · description? · error? · required? · disabled? · invalid? · labelAs? · children',
    responsibility: fieldOwner,
    keyboard: inputKeyboard,
    relatedImports: ['Input'],
    code: '<Field label="Project name" description="Shown on your project page." error={error}><Input value={name} onChange={event => setName(event.target.value)} /></Field>',
  }),
  entry({
    name: 'Input',
    group: 'Forms',
    aliases: ['Text field', 'Text input'],
    description: 'A native text input that composes with Field and application validation.',
    states: ['Default', 'Invalid', 'Disabled', 'Read-only', 'Long value'],
    contract: 'Native input props/ref · value · onChange · disabled? · readOnly?',
    responsibility: fieldOwner,
    keyboard: inputKeyboard,
    relatedImports: ['Field'],
    code: '<Field label="Project name"><Input value={name} onChange={event => setName(event.target.value)} /></Field>',
  }),
  entry({
    name: 'Textarea',
    group: 'Forms',
    aliases: ['Multiline input', 'Description field'],
    description: 'A native multiline field for descriptions and longer written content.',
    states: ['Default', 'Invalid', 'Disabled', 'Read-only', 'Long value'],
    contract: 'Native textarea props/ref · value · onChange · rows? · disabled? · readOnly?',
    responsibility: fieldOwner,
    keyboard:
      'Tab moves to the next control; Enter inserts a new line. Native selection, editing and resizing remain available.',
    relatedImports: ['Field'],
    code: '<Field label="Project description"><Textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} /></Field>',
  }),
  entry({
    name: 'Checkbox',
    group: 'Forms',
    aliases: ['Check box', 'Mixed selection'],
    description:
      'A native checkbox for an explicit choice, including a host-controlled mixed state.',
    states: ['Default', 'Checked', 'Indeterminate', 'Invalid', 'Disabled'],
    contract: 'checked? · onCheckedChange? · indeterminate? · native checkbox props/ref',
    responsibility:
      'Own checked and indeterminate separately. Clear or recompute the mixed state when the selection changes.',
    keyboard:
      'Tab focuses the checkbox; Space toggles it. Its associated label can also activate it.',
    relatedImports: ['Field'],
    code: '<Field label="Include documentation"><Checkbox checked={included} onCheckedChange={setIncluded} /></Field>',
  }),
  entry({
    name: 'Switch',
    group: 'Forms',
    aliases: ['Toggle', 'Setting'],
    description: 'A labelled on/off setting with native focus and switch semantics.',
    states: ['Default', 'Checked', 'Invalid', 'Disabled'],
    contract: 'checked? · onCheckedChange? · native input props/ref',
    responsibility:
      'Use a persistent setting label. The checked value comes from application state, not from an inferred network result.',
    keyboard: 'Tab focuses the switch; Space toggles it. Disabled switches leave the tab order.',
    relatedImports: ['Field'],
    code: '<Field label="Show release notes"><Switch checked={enabled} onCheckedChange={setEnabled} /></Field>',
  }),
  entry({
    name: 'RadioGroup',
    group: 'Forms',
    aliases: ['Radio buttons', 'Single choice'],
    description: 'A named group of mutually exclusive native radio choices.',
    states: ['Default', 'Horizontal', 'Invalid', 'Disabled', 'Empty'],
    contract:
      'options · value? · onValueChange? · name? · orientation? · disabled? · emptyMessage?',
    responsibility:
      'Supply stable option values and use Field labelAs="span" for the group label. Empty options need an explicit explanation.',
    keyboard:
      'Tab enters the selected radio; arrow keys move and select within the native group. Space selects the focused option.',
    relatedImports: ['Field'],
    code: '<Field label="Project visibility" labelAs="span"><RadioGroup value={visibility} onValueChange={setVisibility} options={[{value: "public", label: "Public"}, {value: "private", label: "Private"}]} /></Field>',
  }),
  entry({
    name: 'Slider',
    group: 'Forms',
    aliases: ['Range', 'Range input'],
    description: 'A controlled numeric range with named thumbs and keyboard adjustments.',
    states: ['Default', 'Range', 'Disabled'],
    contract:
      'value: number[] · onValueChange? · onValueCommit? · min? · max? · step? · thumbLabels? · getValueLabel?',
    responsibility:
      'Supply meaningful units and bounds. Name each thumb for a multi-value range; reserve persistence for the host callback.',
    keyboard:
      'Arrow keys adjust by one step; Home and End move to bounds. Tab visits each available thumb.',
    relatedImports: ['Field'],
    code: '<Field label="Preview scale" labelAs="span"><Slider value={scale} onValueChange={setScale} min={0} max={100} thumbLabels={["Preview scale"]} getValueLabel={value => `${value}%`} /></Field>',
  }),
  entry({
    name: 'Popover',
    group: 'Overlays',
    aliases: ['Anchored panel', 'Floating panel'],
    description: 'A named interactive panel anchored to its trigger.',
    states: ['Default', 'Form', 'Long content'],
    contract:
      'Root: open? · onOpenChange? · Content: title · description? · headingLevel? · Trigger/Close asChild?',
    responsibility:
      'Own draft and open state. Use a popover for a short related task; move longer workflows into an appropriate dialog or page.',
    keyboard:
      'Enter or Space opens the trigger. Focus moves into the panel; Escape closes it and returns focus.',
    relatedImports: ['Button', 'Field', 'Input'],
    code: '<Popover open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button variant="outline">Project details</Button></Popover.Trigger><Popover.Content title="Project details"><Field label="Project name"><Input value={name} onChange={event => setName(event.target.value)} /></Field><Popover.Close asChild><Button>Done</Button></Popover.Close></Popover.Content></Popover>',
  }),
  entry({
    name: 'Tooltip',
    group: 'Overlays',
    aliases: ['Hint', 'Hover text'],
    description: 'A short non-interactive description available on hover and keyboard focus.',
    states: ['Default', 'Long content'],
    contract: 'Root: open? · onOpenChange? · Provider: delayDuration? · Trigger/Content',
    responsibility:
      'Keep essential labels visible. Tooltip content is supporting text and must not contain interactive controls.',
    keyboard: 'Focusing the trigger reveals the hint; Escape dismisses it without moving focus.',
    relatedImports: ['Button'],
    code: '<Tooltip><Tooltip.Trigger asChild><Button variant="outline">Read-only preview</Button></Tooltip.Trigger><Tooltip.Content>Changes are kept in this local example.</Tooltip.Content></Tooltip>',
  }),
  entry({
    name: 'AlertDialog',
    group: 'Overlays',
    aliases: ['Confirmation', 'Confirm dialog', 'Destructive action'],
    description: 'A focused confirmation that waits for an explicit application acknowledgement.',
    states: ['Default', 'Pending', 'Error'],
    contract:
      'Root: open · onOpenChange · busy? · Content: error? · Action: onAction · Title/Description/Cancel',
    responsibility:
      'A click expresses intent. Keep the dialog open while the host processes the request; close it only after acknowledgement. The demo only changes local sample state.',
    keyboard:
      'Opening focuses Cancel. Tab remains inside; Escape or Cancel dismisses. Busy prevents repeated action requests while cancellation remains available.',
    relatedImports: ['Button'],
    code: '<AlertDialog open={open} onOpenChange={setOpen} busy={pending}><AlertDialog.Trigger asChild><Button variant="outline">Archive project</Button></AlertDialog.Trigger><AlertDialog.Content error={error}><AlertDialog.Title>Archive project?</AlertDialog.Title><AlertDialog.Description>You can restore it from the archive.</AlertDialog.Description><AlertDialog.Actions><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onAction={requestArchive}>Archive project</AlertDialog.Action></AlertDialog.Actions></AlertDialog.Content></AlertDialog>',
  }),
  entry({
    name: 'DropdownMenu',
    group: 'Navigation',
    aliases: ['Action menu', 'Menu button'],
    description: 'An action menu with managed focus, selection controls and disabled items.',
    states: ['Default', 'Selection', 'Disabled item'],
    contract:
      'Root/Trigger/Content/Item · Item: onSelect · CheckboxItem: checked/onCheckedChange · RadioGroup: value/onValueChange',
    responsibility:
      'Use actions in a menu and links for destination navigation. Menu selection requests application work; it does not establish success.',
    keyboard:
      'Enter, Space or ArrowDown opens the menu. Arrow keys and typeahead move between items; Enter selects, Escape returns focus.',
    code: '<DropdownMenu.Root><DropdownMenu.Trigger>Project actions</DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Item onSelect={requestRename}>Rename project</DropdownMenu.Item><DropdownMenu.Item onSelect={requestArchive}>Archive project</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>',
  }),
  entry({
    name: 'ContextMenu',
    group: 'Navigation',
    aliases: ['Right-click menu', 'Context actions'],
    description: 'Contextual actions available from pointer and keyboard invocation.',
    states: ['Default', 'Disabled item'],
    contract: 'Root: onOpenChange? · Trigger · Content · Item: onSelect/disabled?',
    responsibility:
      'Provide a visible explanation of the context action. Essential actions should also be discoverable without a context menu.',
    keyboard:
      'Focus the trigger and press Shift+F10 or the Context Menu key. Arrow keys navigate; Escape returns to the trigger.',
    code: '<ContextMenu.Root><ContextMenu.Trigger>Project preview — right-click or press Shift+F10</ContextMenu.Trigger><ContextMenu.Content><ContextMenu.Item onSelect={requestRename}>Rename project</ContextMenu.Item></ContextMenu.Content></ContextMenu.Root>',
  }),
  entry({
    name: 'NavigationMenu',
    group: 'Navigation',
    aliases: ['Website navigation', 'Navigation dropdown'],
    description: 'Website links and disclosed destination groups with native navigation semantics.',
    states: ['Default', 'Disabled trigger'],
    contract: 'Root: value?/onValueChange? · List/Item/Trigger/Content/Link · Link: href/active?',
    responsibility:
      'Supply real destinations and an appropriate navigation label. This example links to existing component detail pages.',
    keyboard:
      'Tab visits links and triggers. Arrow keys move within the navigation; Escape dismisses open destination content.',
    code: '<NavigationMenu.Root aria-label="Components"><NavigationMenu.List><NavigationMenu.Item><NavigationMenu.Link href="/?component=Button">Foundations</NavigationMenu.Link></NavigationMenu.Item><NavigationMenu.Item><NavigationMenu.Trigger>Forms</NavigationMenu.Trigger><NavigationMenu.Content><NavigationMenu.Link href="/?component=Input">Input</NavigationMenu.Link></NavigationMenu.Content></NavigationMenu.Item></NavigationMenu.List></NavigationMenu.Root>',
  }),
  entry({
    name: 'Alert',
    group: 'Feedback',
    aliases: ['Banner', 'Notice', 'Inline feedback'],
    description:
      'A persistent message with semantic tone, optional actions and explicit announcement urgency.',
    states: ['Default', 'Success', 'Warning', 'Error', 'With action'],
    contract:
      'tone?: neutral | info | success | warning | danger · icon? · native div props · Title/Description/Actions',
    responsibility:
      'Tone supplements the written message. Static content has no automatic live announcement; use status or alert only for appropriate dynamic updates.',
    keyboard: 'The message is read in document order. Only nested actions enter the tab sequence.',
    relatedImports: ['AlertTitle', 'AlertDescription'],
    code: '<Alert tone="info"><AlertTitle>Preview environment</AlertTitle><AlertDescription>Changes here affect the local example only.</AlertDescription></Alert>',
  }),
  entry({
    name: 'EmptyState',
    group: 'Feedback',
    aliases: ['No results', 'Empty content', 'Recovery'],
    description: 'An explanation of missing content with an appropriate next action.',
    states: ['Default', 'No results', 'With action'],
    contract:
      'align?: start | center · native div props · EmptyStateTitle/Description/Actions/Icon',
    responsibility:
      'Distinguish no content, filtered results and access failures in the message. Choose a next action that resolves the actual reason.',
    keyboard:
      'The heading and description remain ordinary content. A recovery action follows native button behavior.',
    relatedImports: ['EmptyStateTitle', 'EmptyStateDescription'],
    code: '<EmptyState><EmptyStateTitle>No projects yet</EmptyStateTitle><EmptyStateDescription>Your projects will appear here when you add one.</EmptyStateDescription></EmptyState>',
  }),
  {
    ...entry({
      name: 'Progress',
      group: 'Feedback',
      aliases: ['Progress bar', 'Indeterminate progress'],
      description:
        'Named progress for a measured amount or an explicitly unknown total, as a bar or a ring.',
      states: ['Default', 'Indeterminate', 'Complete', 'Hidden label'],
      contract:
        'label: string · value?: number | null · max?: number · valueText? · labelVisibility?: visible | hidden · showReading? · variant?: bar | ring · size?: sm | default | lg',
      responsibility:
        'Use a numeric value only for measured work with a known denominator. The interactive example counts local sample steps; it does not claim real upload or AI completion progress.',
      keyboard:
        'The native progress element is named but is not an extra tab stop. Nearby controls remain available while work advances.',
      code: '<Progress label="Sample steps completed" value={completedSteps} max={10} valueText={`${completedSteps} of 10 sample steps`} />',
    }),
    presentations: ['bar', 'ring'],
    presentationProp: 'variant',
  },
  entry({
    name: 'Toast',
    group: 'Feedback',
    aliases: ['Notification', 'Snackbar'],
    description:
      'A controlled temporary notification with dismissal and retained action alternatives.',
    states: ['Default', 'With action', 'Error'],
    contract:
      'ToastProvider · Toast: open/onOpenChange/tone/type/duration · ToastAction: altText · ToastClose · ToastViewport',
    responsibility:
      'Own notification identity and state. Retain important results elsewhere; provide another route to actions after expiry. One provider and viewport serve each notification area.',
    keyboard:
      'F8 moves focus into the notification area. Hover or focus pauses expiry; Escape dismisses a focused notification.',
    relatedImports: [
      'ToastProvider',
      'ToastTitle',
      'ToastDescription',
      'ToastAction',
      'ToastClose',
      'ToastViewport',
    ],
    code: '<ToastProvider><Toast open={open} onOpenChange={setOpen}><ToastTitle>Local sample updated</ToastTitle><ToastDescription>The notification can be dismissed.</ToastDescription><ToastClose /></Toast><ToastViewport /></ToastProvider>',
  }),
  entry({
    name: 'Breadcrumb',
    group: 'Navigation',
    aliases: ['Breadcrumbs', 'Location trail'],
    description: 'A compact path of real destinations with an explicit current location.',
    states: ['Default', 'Long labels', 'Single item'],
    contract: 'items: {id,label,href?,onClick?}[] · currentId? · label? · separator?',
    responsibility:
      'Use actual links for ancestors. The current item defaults to the last item and is not rendered as a navigation link.',
    keyboard:
      'Tab visits ancestor links. The current page is readable text with aria-current="page".',
    code: '<Breadcrumb items={[{id: "components", label: "Components", href: "/"}, {id: "button", label: "Button"}]} />',
  }),
  entry({
    name: 'Pagination',
    group: 'Navigation',
    aliases: ['Pages', 'Page controls', 'Previous next'],
    description: 'Controlled page navigation for known and unknown totals.',
    states: ['Default', 'Unknown total', 'Empty', 'Disabled'],
    contract:
      'page: number (1-based) · pageCount OR hasNextPage · onPageChange OR getPageHref · disabled?',
    responsibility:
      'Keep page and result state consistent. For unknown totals, enable Next only with explicit hasNextPage=true. Do not invent a total.',
    keyboard:
      'Native buttons or links follow Tab order. Unavailable boundaries are disabled. Current page is identified with aria-current.',
    code: '<Pagination page={page} pageCount={12} onPageChange={setPage} />',
  }),
  entry({
    name: 'Sidebar',
    group: 'Navigation',
    aliases: ['Side navigation', 'Navigation rail'],
    description: 'Visible navigation groups and native links with current and disabled states.',
    states: ['Default', 'Disabled link', 'Long labels'],
    contract: 'Sidebar: label?/as? · Group: label? · Link: href/current?/disabled?/icon?/badge?',
    responsibility:
      'Keep destination labels visible. Compose Sidebar with Sidecar for a mobile drawer; Sidebar itself does not own disclosure state.',
    keyboard:
      'Tab visits available links in document order. Current links use aria-current; disabled destinations are removed from the tab sequence.',
    code: '<Sidebar label="Component navigation"><Sidebar.Group label="Library"><Sidebar.Link href="/?component=Button">Foundations</Sidebar.Link><Sidebar.Link href="/?component=Sidebar" current>Navigation</Sidebar.Link></Sidebar.Group></Sidebar>',
  }),
  entry({
    name: 'Card',
    group: 'Data Display',
    aliases: ['Content card', 'Surface', 'Panel', 'Link card', 'Resource card', 'Section header'],
    description:
      'A surface with a header (title, description, actions), body and footer, or a whole-card link.',
    states: ['Default', 'Header actions', 'With action', 'Link', 'External link', 'Long content'],
    contract:
      'Native section props · href? · external? · Card.Header actions? actionsLabel? · Card.Title as?: h2–h6 · Card.Description/Content/Footer',
    responsibility:
      'Choose a heading level appropriate to the page. Add aria-labelledby only when the card should be a named region. With href the whole card is one link, so keep buttons and other links out of it.',
    keyboard:
      'The surface adds no tab stop; links and actions inside it follow ordinary document order.',
    code: '<Card><Card.Header><Card.Title>Component library</Card.Title><Card.Description>Reusable website and AI controls.</Card.Description></Card.Header><Card.Content>Explore the available components.</Card.Content></Card>',
  }),
  entry({
    name: 'Table',
    group: 'Data Display',
    aliases: ['Native table', 'HTML table', 'Simple table'],
    description: 'Native tabular content inside a named, keyboard-scrollable region.',
    states: ['Default', 'Empty', 'Wide content'],
    contract:
      'label: string · scrollLabel? · native table props/ref · Caption/Header/Body/Footer/Row/Head/Cell',
    responsibility:
      'Supply meaningful captions and headers. Sorting, loading and selection are host compositions; use DataTable when its structured-data API matches the task.',
    keyboard:
      'Tab reaches the scroll region when needed; arrow keys scroll wide content. Column and row headers preserve native table semantics.',
    code: '<Table label="Packages"><Table.Caption>Sample package status</Table.Caption><Table.Header><Table.Row><Table.Head>Package</Table.Head><Table.Head>Status</Table.Head></Table.Row></Table.Header><Table.Body><Table.Row><Table.Head scope="row">Components</Table.Head><Table.Cell>Experimental alpha</Table.Cell></Table.Row></Table.Body></Table>',
  }),
  {
    ...entry({
      name: 'ToggleGroup',
      group: 'Actions',
      aliases: [
        'Filter chips',
        'Toggle buttons',
        'Segmented control',
        'View switch',
        'Joined buttons',
      ],
      description:
        'Choose one or several options shown at once: filter pills with counts, or joined segments, as buttons or links.',
      states: ['Default', 'Multiple', 'With counts', 'Links', 'Disabled option', 'Small'],
      contract:
        'label · options: { value, label, count?, description?, href?, disabled? }[] · type?: single | multiple · value · onValueChange? · allowEmpty? · mode?: buttons | links · variant?: pills | segmented · size?: default | sm · disabled?',
      responsibility:
        'The application owns the selected values and the counts. Single selection uses radio semantics; multiple selection uses pressed buttons; links mode renders anchors with aria-current for URL-driven views and works before hydration.',
      keyboard:
        'Tab reaches the group once. Arrow keys, Home and End move between enabled options; in single mode they also select. Space or Enter toggles an option in multiple mode. In links mode every link is in the tab order.',
      code: '<ToggleGroup label="Topics" options={topics} value={topic} onValueChange={setTopic} />',
    }),
    presentations: ['pills', 'segmented'],
    presentationProp: 'variant',
  },
  entry({
    name: 'Tag',
    group: 'Data Display',
    aliases: ['Label', 'Category badge', 'Chip'],
    description: 'A neutral label for categories and levels, with tones and two sizes.',
    states: ['Default', 'Tones', 'Small', 'With icon', 'Custom hue', 'Mono'],
    contract:
      'Native span props · children · tone?: neutral | primary | accent | success | warning · hue? · size?: default | sm · mono? · icon?',
    responsibility:
      'Meaning belongs to the application; the tag adds no status semantics. Use StatusBadge for run and approval states.',
    keyboard: 'Inert content; it adds no tab stop.',
    relatedImports: ['StatusBadge'],
    code: '<Tag tone="accent">Advanced</Tag>',
  }),
  entry({
    name: 'Avatar',
    group: 'Data Display',
    aliases: ['Profile picture', 'Initials', 'User image'],
    description: 'An image or initials for a person or team, decorative unless given a name.',
    states: ['Default', 'With image', 'Image failed', 'Sizes', 'No name'],
    contract: 'name? · initials? · src? · size?: sm | default | lg · native span props',
    responsibility:
      'Pass name when the avatar is the only sign of who is shown; otherwise leave it decorative beside visible text. Supply accessible, licensed image URLs.',
    keyboard: 'Inert content; it adds no tab stop.',
    code: '<Avatar name="Ada Lovelace" src={photoUrl} />',
  }),
  {
    ...entry({
      name: 'Stat',
      group: 'Data Display',
      aliases: ['Metric', 'KPI', 'Number tile'],
      description:
        'A formatted number with its label, optional change and note, for rows of metrics.',
      states: ['Default', 'With trend', 'Group'],
      contract:
        'label · value · delta? · trend?: up | down | neutral · note? · StatGroup: native div props',
      responsibility:
        'Format numbers, units and signs in the application. Trend colour only reinforces text that already carries the sign. Renders on the server.',
      keyboard: 'Inert content; it adds no tab stop.',
      relatedImports: ['StatGroup'],
      code: '<StatGroup aria-label="Usage">\n  <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />\n</StatGroup>',
    }),
    presentations: ['card', 'plain'],
    presentationProp: 'variant',
  },
  entry({
    name: 'Chip',
    group: 'Actions',
    aliases: ['Filter link', 'Removable chip', 'Tag link', 'ChipGroup'],
    description:
      'A compact label that links or can be removed, with a group that wraps or scrolls. For choices, use ToggleGroup.',
    states: ['Default', 'Removable', 'Scrolling group'],
    contract:
      'children · href/active/current? + anchor props | onRemove/removeLabel · swatch? · size?: default | sm · disabled? · ChipGroup: label · overflow?: wrap | scroll',
    responsibility:
      'Chips report intents; the host applies the filter. Link chips render the LinkProvider link when one is set. Active fills use --ai-chip-active-background and --ai-chip-active-color so labels keep their contrast.',
    keyboard:
      'Link chips are links; the remove control is a button. Backspace or Delete on a removable chip removes it.',
    relatedImports: ['ChipGroup'],
    code: '<ChipGroup label="Lens"><Chip pressed={lens === "agents"} onPressedChange={() => setLens("agents")}>Agents</Chip></ChipGroup>',
  }),
  entry({
    name: 'Stepper',
    group: 'Navigation',
    aliases: ['Step indicator', 'Series dots', 'Path steps'],
    description:
      'A step indicator for series and multi-step paths, as dots or a list, with optional links.',
    states: ['Default', 'List', 'Segments', 'With navigation', 'Tooltips'],
    contract:
      'label · steps: { id, label, href?, state?: done | current | upcoming | planned | available }[] · presentation?: dots | list | segments · previous? · next? · reading? · tooltip? · as?: nav | div',
    responsibility:
      'Supply the current step from routing or host state. Planned steps have no destination; the reading prints "Step 2 of 9" from the current step.',
    keyboard:
      'Steps with destinations are ordinary links in a navigation landmark; dots carry their labels for assistive technology.',
    code: '<Stepper label="Series parts" steps={steps} reading previous={{ href: prev }} next={{ href: next }} />',
  }),
  entry({
    name: 'Matrix',
    group: 'Data Display',
    aliases: ['Heatmap', 'Coverage matrix', 'Grid of counts'],
    description:
      'A heatmap table of counts with a single-hue fill, linked headers and linked cells.',
    states: ['Default', 'Linked cells', 'Angled headers', 'Totals', 'Plain data'],
    contract:
      'label · rows: { id, label, href?, swatch? }[] · columns · value?(row, column) | values · href?(row, column) | hrefs · cellLabel?(row, column, value) | cellLabels · max? · format? · caption? · scrollLabel? · columnHeader?: horizontal | angled · zero? · totals?: rows | columns | both · totalsLabel?',
    responsibility:
      'Every cell prints its number; the fill from the primary token only reinforces it and the text flips to the primary foreground at the level the theme measured. Supply counts and destinations from the host.',
    keyboard:
      'A real table with scoped headers inside a focusable, labelled scroll region; header and cell links are ordinary links.',
    relatedImports: ['Table'],
    code: '<Matrix label="Coverage" rows={disciplines} columns={kinds} value={count} href={filterHref} />',
  }),
  entry({
    name: 'CopyButton',
    group: 'Actions',
    aliases: ['Copy to clipboard', 'Copy link'],
    description: 'Copies a value and reports the real outcome.',
    states: ['Default', 'Icon only', 'Primary'],
    contract:
      'value · label? · copiedLabel? · failedLabel? · iconOnly? · onCopy?(ok) · resetMs? · variant? · size?',
    responsibility:
      'The outcome is announced in a polite live region and shown by the icon; the accessible name never changes mid-press. A failed copy says to copy by hand. Snippet uses it, so the library has one copy behaviour.',
    keyboard:
      'A button: Enter or Space copies. The icon-only form has a tooltip and an accessible name.',
    relatedImports: ['useCopy'],
    code: '<CopyButton value={url} label="Copy link" onCopy={(ok) => track(ok)} />',
  }),
  entry({
    name: 'InputGroup',
    group: 'Forms',
    aliases: ['Input with button', 'Sign-up field', 'Search field'],
    description: 'One bordered control that holds an input and its action.',
    states: ['Default', 'Inset', 'Search', 'Invalid'],
    contract:
      'attach?: flush | inset · size?: default | touch · shape?: control | pill · invalid? · disabled? · InputGroupAddon · InputGroupButton',
    responsibility:
      'The group draws the one border, radius and focus ring through :focus-within; the input gives up its own, and the button keeps an inner keyboard ring. Field supplies the label, description, error and disabled state; it works in a native form.',
    keyboard: 'Tab moves from the input to the button; Enter in the input submits the form.',
    relatedImports: ['Field', 'Input'],
    code: '<Field label="Email address">\n  <InputGroup shape="pill" size="touch">\n    <Input type="email" />\n    <InputGroupButton type="submit">Subscribe</InputGroupButton>\n  </InputGroup>\n</Field>',
  }),
  entry({
    name: 'AppearanceToggle',
    group: 'Actions',
    aliases: ['Theme toggle', 'Dark mode switch', 'Light dark system'],
    description: 'A light, dark or system choice that drives the theme provider.',
    states: ['Default', 'Segmented', 'Stored'],
    contract:
      'value · onValueChange · variant?: cycle | segmented · labels? · label? · size? · useStoredAppearance({ storageKey }) · useResolvedAppearance(value) · appearanceInitScript({ storageKey })',
    responsibility:
      'Pass the value to AITheme. useStoredAppearance keeps it in this browser and follows other tabs; appearanceInitScript applies it before paint through a root attribute your stylesheet reads. Until hydration the cycle button shows a neutral mark.',
    keyboard:
      'The cycle button names the current mode and what a press switches to; the segmented form is a radiogroup.',
    relatedImports: ['AITheme'],
    code: '<AppearanceToggle value={appearance} onValueChange={setAppearance} />',
  }),
  entry({
    name: 'CommandPalette',
    group: 'Navigation',
    aliases: ['Command menu', 'Search dialog', 'Cmd K', 'Ctrl K'],
    importPath: '/navigation',
    description: 'A Ctrl/Cmd+K menu for jumping to places and searching, with results in groups.',
    states: ['Default', 'Async results'],
    contract:
      'open? · defaultOpen? · onOpenChange? · items · search?(query, signal) · debounceMs? · onSelect · shortcut?: "mod+k" | false · label? · placeholder? · emptyState? · footerHints? · trailingAction?(query) · highlight?(text, query) | false · cancelLabel? · useCommandPalette() · markMatches(text, query)',
    responsibility:
      'Static items filter locally by every word; async results are debounced, cancelled through the signal and never shown for an older query. With a LinkProvider, items with an href are that router link. Excerpts are plain text; markMatches marks them safely.',
    keyboard:
      'Up and Down move and wrap, Home and End jump, Enter selects, Escape and the backdrop close. Enter does nothing during IME composition. Focus returns to the opener.',
    relatedImports: ['Button'],
    code: '<CommandPalette items={jumps} search={searchSite} onSelect={(item) => router.push(item.href)} />',
  }),
  entry({
    name: 'TableOfContents',
    group: 'Navigation',
    aliases: ['On this page', 'Toc', 'Page outline'],
    importPath: '/navigation',
    description: 'An "On this page" rail that marks the section being read.',
    states: ['Default', 'Collapsible', 'Plain'],
    contract:
      'items: { id, title, items? }[] · label? · numbered? · showReading? · collapsible?: narrow | never | always · readingLine? · minItems? · activeId? · onActiveChange? · useActiveHeading(ids)',
    responsibility:
      'Links are plain in-page anchors; nothing hijacks scrolling. The active heading is the last one past the reading line, tracked with an IntersectionObserver and a passive scroll listener. Below minItems it renders nothing.',
    keyboard:
      'Ordinary links in a navigation landmark; the active one carries aria-current="location".',
    code: '<TableOfContents items={outline} numbered showReading />',
  }),
  entry({
    name: 'ShareMenu',
    group: 'Navigation',
    aliases: ['Share buttons', 'Share sheet', 'Social share', 'Open in chat'],
    importPath: '/navigation',
    description: 'Copy link, the device share sheet when there is one, and configurable targets.',
    states: ['Default', 'Menu', 'Custom targets', 'Open in chat'],
    contract:
      'url · title · text? · targets?: (copy | native | linkedin | x | email | { id, label, href })[] · presentation?: inline | menu · label? · onShare?(target)',
    responsibility:
      'Native share support is decided on the client only, so server and first client render agree. A dismissed share is not an error. External targets open in a new tab with rel="noopener noreferrer"; no tracking parameters are added. Custom targets must be http(s), mailto or relative links; others are dropped. For "open in another chat", build each href from the query.',
    keyboard: 'Buttons and links in a labelled group, or a menu with arrow keys.',
    relatedImports: ['CopyButton'],
    code: "<ShareMenu url={pageUrl} title={pageTitle} targets={['copy', 'native', 'linkedin', 'x']} />",
  }),
];

export const websiteNames = new Set<string>(websiteCatalog.map((item) => item.name));
