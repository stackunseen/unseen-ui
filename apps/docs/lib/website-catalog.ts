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
    description: 'A text input that works with Field and your own validation.',
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
    description: 'A checkbox, including a mixed state for partly selected groups.',
    states: ['Default', 'Checked', 'Indeterminate', 'Invalid', 'Disabled'],
    contract: 'checked? · onCheckedChange? · indeterminate? · native checkbox props/ref',
    responsibility:
      'Keep checked and the mixed state separately in your app, and update the mixed state when the selection changes.',
    keyboard:
      'Tab focuses the checkbox; Space toggles it. Its associated label can also activate it.',
    relatedImports: ['Field'],
    code: '<Field label="Include documentation"><Checkbox checked={included} onCheckedChange={setIncluded} /></Field>',
  }),
  entry({
    name: 'Switch',
    group: 'Forms',
    aliases: ['Toggle', 'Setting'],
    description: 'An on/off setting with a label.',
    states: ['Default', 'Checked', 'Invalid', 'Disabled'],
    contract: 'checked? · onCheckedChange? · native input props/ref',
    responsibility:
      'Keep the label the same whether it’s on or off. Whether it’s on comes from your app, not from a guess about what the server did.',
    keyboard: 'Tab focuses the switch; Space toggles it. Disabled switches leave the tab order.',
    relatedImports: ['Field'],
    code: '<Field label="Show release notes"><Switch checked={enabled} onCheckedChange={setEnabled} /></Field>',
  }),
  entry({
    name: 'RadioGroup',
    group: 'Forms',
    aliases: ['Radio buttons', 'Single choice'],
    description: 'A labeled set of options where only one can be picked.',
    states: ['Default', 'Horizontal', 'Invalid', 'Disabled', 'Empty'],
    contract:
      'options · value? · onValueChange? · name? · orientation? · disabled? · emptyMessage?',
    responsibility:
      'Supply stable option values and use Field labelAs="span" for the group label. If there are no options, say why.',
    keyboard:
      'Tab enters the selected radio; arrow keys move and select within the native group. Space selects the focused option.',
    relatedImports: ['Field'],
    code: '<Field label="Project visibility" labelAs="span"><RadioGroup value={visibility} onValueChange={setVisibility} options={[{value: "public", label: "Public"}, {value: "private", label: "Private"}]} /></Field>',
  }),
  entry({
    name: 'TonePad',
    group: 'Forms',
    aliases: ['2D slider', 'Tone control', 'XY pad', 'Formal to casual'],
    description:
      'Two choices on one square: drag the handle between Formal and Casual, Brief and Detailed.',
    states: ['Default', 'Disabled'],
    contract:
      'value: { x, y } (0–1) · onValueChange · axes: { x: [left, right], y: [bottom, top] } · step? · label? · disabled?',
    responsibility:
      'Name both axes with the real words your model uses. The pad is made of two native sliders, one per axis, so keyboard and screen-reader users set the same two numbers.',
    keyboard:
      'Tab visits the two sliders; arrow keys move one step, Home and End to the ends. The square itself takes pointer input.',
    relatedImports: ['Field', 'Slider'],
    code: '<Field label="Tone" labelAs="span"><TonePad value={tone} onValueChange={setTone} axes={{ x: ["Formal", "Casual"], y: ["Detailed", "Brief"] }} /></Field>',
  }),
  entry({
    name: 'Slider',
    group: 'Forms',
    aliases: ['Range', 'Range input'],
    description: 'Pick a number or a range by dragging or with the arrow keys.',
    states: ['Default', 'Range', 'Disabled'],
    contract:
      'value: number[] · onValueChange? · onValueCommit? · min? · max? · step? · thumbLabels? · getValueLabel?',
    responsibility:
      'Give it real units and limits, and name each handle in a range. Save the value from your own callback.',
    keyboard:
      'Arrow keys adjust by one step; Home and End move to bounds. Tab visits each available thumb.',
    relatedImports: ['Field'],
    code: '<Field label="Preview scale" labelAs="span"><Slider value={scale} onValueChange={setScale} min={0} max={100} thumbLabels={["Preview scale"]} getValueLabel={value => `${value}%`} /></Field>',
  }),
  entry({
    name: 'Popover',
    group: 'Overlays',
    aliases: ['Anchored panel', 'Floating panel'],
    description: 'A small panel that opens from a button and can hold controls.',
    states: ['Default', 'Form', 'Long content'],
    contract:
      'Root: open? · onOpenChange? · Content: title · description? · headingLevel? · Trigger/Close asChild?',
    responsibility:
      'Keep whether it’s open, and any draft, in your app. Use it for short tasks; move longer ones into a dialog or a page.',
    keyboard:
      'Enter or Space opens the trigger. Focus moves into the panel; Escape closes it and returns focus.',
    relatedImports: ['Button', 'Field', 'Input'],
    code: '<Popover open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button variant="outline">Project details</Button></Popover.Trigger><Popover.Content title="Project details"><Field label="Project name"><Input value={name} onChange={event => setName(event.target.value)} /></Field><Popover.Close asChild><Button>Done</Button></Popover.Close></Popover.Content></Popover>',
  }),
  entry({
    name: 'Tooltip',
    group: 'Overlays',
    aliases: ['Hint', 'Hover text'],
    description: 'A short hint that appears on hover and keyboard focus.',
    states: ['Default', 'Long content'],
    contract: 'Root: open? · onOpenChange? · Provider: delayDuration? · Trigger/Content',
    responsibility:
      'Keep important labels visible on the page. A tooltip is only extra help and can’t hold buttons or links.',
    keyboard: 'Focusing the trigger reveals the hint; Escape dismisses it without moving focus.',
    relatedImports: ['Button'],
    code: '<Tooltip><Tooltip.Trigger asChild><Button variant="outline">Read-only preview</Button></Tooltip.Trigger><Tooltip.Content>Changes are kept in this local example.</Tooltip.Content></Tooltip>',
  }),
  entry({
    name: 'AlertDialog',
    group: 'Overlays',
    aliases: ['Confirmation', 'Confirm dialog', 'Destructive action'],
    description: 'A confirmation dialog that stays open until your app confirms the action worked.',
    states: ['Default', 'Pending', 'Error'],
    contract:
      'Root: open · onOpenChange · busy? · Content: error? · Action: onAction · Title/Description/Cancel',
    responsibility:
      'A click only asks. Keep the dialog open while your server handles the request, and close it once it confirms. The example here only changes sample data.',
    keyboard:
      'Opening focuses Cancel. Tab remains inside; Escape or Cancel dismisses. Busy prevents repeated action requests while cancellation remains available.',
    relatedImports: ['Button'],
    code: '<AlertDialog open={open} onOpenChange={setOpen} busy={pending}><AlertDialog.Trigger asChild><Button variant="outline">Archive project</Button></AlertDialog.Trigger><AlertDialog.Content error={error}><AlertDialog.Title>Archive project?</AlertDialog.Title><AlertDialog.Description>You can restore it from the archive.</AlertDialog.Description><AlertDialog.Actions><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onAction={requestArchive}>Archive project</AlertDialog.Action></AlertDialog.Actions></AlertDialog.Content></AlertDialog>',
  }),
  entry({
    name: 'DropdownMenu',
    group: 'Navigation',
    aliases: ['Action menu', 'Menu button'],
    description: 'A menu of actions behind a button, with checkable and disabled items.',
    states: ['Default', 'Selection', 'Disabled item'],
    contract:
      'Root/Trigger/Content/Item · Item: onSelect · CheckboxItem: checked/onCheckedChange · RadioGroup: value/onValueChange',
    responsibility:
      'Use menu items for actions and links for going somewhere. Picking an item asks your app to act; it doesn’t mean it worked.',
    keyboard:
      'Enter, Space or ArrowDown opens the menu. Arrow keys and typeahead move between items; Enter selects, Escape returns focus.',
    code: '<DropdownMenu.Root><DropdownMenu.Trigger>Project actions</DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Item onSelect={requestRename}>Rename project</DropdownMenu.Item><DropdownMenu.Item onSelect={requestArchive}>Archive project</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>',
  }),
  entry({
    name: 'ContextMenu',
    group: 'Navigation',
    aliases: ['Right-click menu', 'Context actions'],
    description: 'Actions for an item, opened by right-click or the menu key.',
    states: ['Default', 'Disabled item'],
    contract: 'Root: onOpenChange? · Trigger · Content · Item: onSelect/disabled?',
    responsibility:
      'Tell people the menu is there, and make important actions reachable without it too.',
    keyboard:
      'Focus the trigger and press Shift+F10 or the Context Menu key. Arrow keys navigate; Escape returns to the trigger.',
    code: '<ContextMenu.Root><ContextMenu.Trigger>Project preview. Right-click or press Shift+F10</ContextMenu.Trigger><ContextMenu.Content><ContextMenu.Item onSelect={requestRename}>Rename project</ContextMenu.Item></ContextMenu.Content></ContextMenu.Root>',
  }),
  entry({
    name: 'NavigationMenu',
    group: 'Navigation',
    aliases: ['Website navigation', 'Navigation dropdown'],
    description: 'Website navigation with links and dropdown groups.',
    states: ['Default', 'Disabled trigger'],
    contract: 'Root: value?/onValueChange? · List/Item/Trigger/Content/Link · Link: href/active?',
    responsibility:
      'Pass real links and a label for the navigation. The example here links to pages on this site.',
    keyboard:
      'Tab visits links and triggers. Arrow keys move within the navigation; Escape dismisses open destination content.',
    code: '<NavigationMenu.Root aria-label="Components"><NavigationMenu.List><NavigationMenu.Item><NavigationMenu.Link href="/?component=Button">Foundations</NavigationMenu.Link></NavigationMenu.Item><NavigationMenu.Item><NavigationMenu.Trigger>Forms</NavigationMenu.Trigger><NavigationMenu.Content><NavigationMenu.Link href="/?component=Input">Input</NavigationMenu.Link></NavigationMenu.Content></NavigationMenu.Item></NavigationMenu.List></NavigationMenu.Root>',
  }),
  entry({
    name: 'Alert',
    group: 'Feedback',
    aliases: ['Banner', 'Notice', 'Inline feedback'],
    description:
      'A message that stays on the page, with a tone, optional actions and a choice of how urgently screen readers hear it.',
    states: ['Default', 'Success', 'Warning', 'Error', 'With action'],
    contract:
      'tone?: neutral | info | success | warning | danger · icon? · native div props · Title/Description/Actions',
    responsibility:
      'The color only supports what the words say. A message already on the page isn’t announced; use status or alert only for messages that appear later.',
    keyboard: 'The message is read in document order. Only nested actions enter the tab sequence.',
    relatedImports: ['AlertTitle', 'AlertDescription'],
    code: '<Alert tone="info"><AlertTitle>Preview environment</AlertTitle><AlertDescription>Changes here affect the local example only.</AlertDescription></Alert>',
  }),
  entry({
    name: 'EmptyState',
    group: 'Feedback',
    aliases: ['No results', 'Empty content', 'Recovery'],
    description: 'Explains why there’s nothing here and what to do next.',
    states: ['Default', 'No results', 'With action'],
    contract:
      'align?: start | center · native div props · EmptyStateTitle/Description/Actions/Icon',
    responsibility:
      'Say whether there’s no content yet, no results for a filter, or no access, and offer the action that fixes that reason.',
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
        'Progress as a bar or a ring, for work you can measure or with an honestly unknown total.',
      states: ['Default', 'Indeterminate', 'Complete', 'Hidden label'],
      contract:
        'label: string · value?: number | null · max?: number · valueText? · labelVisibility?: visible | hidden · showReading? · variant?: bar | ring · size?: sm | default | lg',
      responsibility:
        'Show a number only when you know both how much is done and the total. The example counts sample steps; it isn’t real upload or AI progress.',
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
      'A short-lived notification people can dismiss, with its action also available elsewhere.',
    states: ['Default', 'With action', 'Error'],
    contract:
      'ToastProvider · Toast: open/onOpenChange/tone/type/duration · ToastAction: altText · ToastClose · ToastViewport',
    responsibility:
      'Keep each notification in your app. Show important results somewhere that lasts, and offer the action another way once the toast is gone. Use one provider and viewport per notification area.',
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
    description: 'The path to the current page, with links back up.',
    states: ['Default', 'Long labels', 'Single item'],
    contract: 'items: {id,label,href?,onClick?}[] · currentId? · label? · separator?',
    responsibility:
      'Use real links for the pages above. The last item is the current page and isn’t a link.',
    keyboard:
      'Tab visits ancestor links. The current page is readable text with aria-current="page".',
    code: '<Breadcrumb items={[{id: "components", label: "Components", href: "/"}, {id: "button", label: "Button"}]} />',
  }),
  entry({
    name: 'Pagination',
    group: 'Navigation',
    aliases: ['Pages', 'Page controls', 'Previous next'],
    description: 'Move between pages of results, even when the total isn’t known.',
    states: ['Default', 'Unknown total', 'Empty', 'Disabled'],
    contract:
      'page: number (1-based) · pageCount OR hasNextPage · onPageChange OR getPageHref · disabled?',
    responsibility:
      'Keep the page and the results in step. When the total isn’t known, enable Next only with hasNextPage, and never make up a total.',
    keyboard:
      'Native buttons or links follow Tab order. Unavailable boundaries are disabled. Current page is identified with aria-current.',
    code: '<Pagination page={page} pageCount={12} onPageChange={setPage} />',
  }),
  entry({
    name: 'Sidebar',
    group: 'Navigation',
    aliases: ['Side navigation', 'Navigation rail'],
    description: 'App navigation in groups, marking the current page.',
    states: ['Default', 'Disabled link', 'Long labels'],
    contract: 'Sidebar: label?/as? · Group: label? · Link: href/current?/disabled?/icon?/badge?',
    responsibility:
      'Keep the labels visible. Put Sidebar inside a Sidecar for a mobile drawer; Sidebar itself doesn’t open or close.',
    keyboard:
      'Tab visits available links in document order. Current links use aria-current; disabled destinations are removed from the tab sequence.',
    code: '<Sidebar label="Component navigation"><Sidebar.Group label="Library"><Sidebar.Link href="/?component=Button">Foundations</Sidebar.Link><Sidebar.Link href="/?component=Sidebar" current>Navigation</Sidebar.Link></Sidebar.Group></Sidebar>',
  }),
  entry({
    name: 'Card',
    group: 'Data Display',
    aliases: ['Content card', 'Surface', 'Panel', 'Link card', 'Resource card', 'Section header'],
    description:
      'A box with a header (title, description and actions), a body and a footer, or a card that is one big link.',
    states: [
      'Default',
      'Header actions',
      'With icon',
      'Sections',
      'With action',
      'Link',
      'External link',
      'Long content',
    ],
    contract:
      'Native section props · href? · external? · Card.Header icon? actions? actionsLabel? · Card.Title as?: h2–h6 · Card.Description/Content/Section/Footer',
    responsibility:
      'Pick a heading level that fits the page. Add aria-labelledby only when the card should be a named region. With href the whole card is one link, so keep buttons and other links out of it.',
    keyboard:
      'The card itself isn’t a tab stop; links and actions inside it follow the normal page order.',
    code: '<Card><Card.Header><Card.Title>Component library</Card.Title><Card.Description>Reusable website and AI controls.</Card.Description></Card.Header><Card.Content>Explore the available components.</Card.Content></Card>',
  }),
  entry({
    name: 'Table',
    group: 'Data Display',
    aliases: ['Native table', 'HTML table', 'Simple table'],
    description: 'A plain table in a labeled area you can scroll with the keyboard.',
    states: ['Default', 'Empty', 'Wide content'],
    contract:
      'label: string · scrollLabel? · native table props/ref · Caption/Header/Body/Footer/Row/Head/Cell',
    responsibility:
      'Give it a caption and clear headers. Sorting, loading and selection are up to you; use DataTable when it fits your data.',
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
        'Your app owns the selection and the counts. One choice works like radio buttons and several like toggle buttons. Links mode uses real links for views kept in the URL, so it works before scripts load.',
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
      'A tag is only a label; it doesn’t mean a status. Use StatusBadge for run and approval status.',
    keyboard: 'Inert content; it adds no tab stop.',
    relatedImports: ['StatusBadge'],
    code: '<Tag tone="accent">Advanced</Tag>',
  }),
  entry({
    name: 'DiffStat',
    group: 'Data Display',
    aliases: ['Lines changed', 'Diff summary', 'Additions and deletions'],
    description: 'Lines added and removed for a change, with optional file count and blocks.',
    states: ['Default', 'With files', 'Blocks', 'No changes'],
    contract: 'added · removed · files? · blocks? · native span props',
    responsibility:
      'Pass the counts your diff or code server reports. The signs are in the text, so it reads without color, and screen readers hear the counts in words.',
    keyboard: 'Inert content; it adds no tab stop.',
    relatedImports: ['CodeDiff'],
    code: '<DiffStat added={15} removed={1} files={2} />',
  }),
  entry({
    name: 'ElapsedTime',
    group: 'Data Display',
    aliases: ['Duration', 'Timer', 'Worked for'],
    description: 'Time spent on a run or turn, ticking while it runs and fixed once it ends.',
    states: ['Running', 'Finished', 'Measured by server'],
    contract: 'startedAt · endedAt? · durationMs? · native time props',
    responsibility:
      'Pass endedAt or durationMs when the work stops. Prefer durationMs from the server when the browser clock should not decide the figure.',
    keyboard: 'Inert content. It is not a live region, so it never interrupts a screen reader.',
    relatedImports: ['StatusBadge'],
    code: '<ElapsedTime startedAt={turn.startedAt} endedAt={turn.endedAt} />',
  }),
  entry({
    name: 'Numeric',
    group: 'Data Display',
    aliases: ['Figure', 'Number with unit', 'Delta', 'Tabular number'],
    description:
      'A figure in the numeric face with its qualifier in words, so numbers line up across a screen.',
    states: ['Headline', 'Row', 'Meta', 'Trend'],
    contract: 'value · qualifier? · size?: lg | md | sm · tone?: neutral | up | down | primary',
    responsibility:
      'Format the figure and its sign in the application. Tone only backs up a sign that is already in the text. Stat, ElapsedTime and ToolCall durations use the same face, set with --ai-font-numeric.',
    keyboard: 'Inert content; it adds no tab stop.',
    relatedImports: ['Stat', 'ElapsedTime'],
    code: '<Numeric size="lg" value="11.4 h" qualifier="vs September" />',
  }),
  entry({
    name: 'Kbd',
    group: 'Data Display',
    aliases: ['Key cap', 'Keyboard shortcut', 'Shortcut hint'],
    description: 'One key cap, for shortcut hints beside actions and in menus.',
    states: ['Default', 'Combination', 'Small'],
    contract: 'size?: default | sm · native kbd props',
    responsibility:
      'Put each key in its own Kbd and the "+" as text between them, so the keys are read as words. Keep the real shortcut in your app; the cap is a hint.',
    keyboard: 'Inert content.',
    relatedImports: ['CommandPalette', 'PromptInput'],
    code: '<Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>',
  }),
  entry({
    name: 'DotRing',
    group: 'Data Display',
    aliases: ['Clock ring', 'Radial histogram', 'Hours of the day'],
    description:
      'A ring of dotted spokes, one per hour or step, denser where the value is higher, with a figure in the centre.',
    states: ['Default', 'Sparse', 'Empty'],
    contract:
      'label · data: { label, value }[] · max? · depth? · value? · caption? · ticks? · unit?',
    responsibility:
      'Pass measured counts in order, clockwise from the top. The centre figure is formatted by your app. The same values are in a hidden table, so nothing is said by dots alone.',
    keyboard: 'Inert content; the hidden table is read in order.',
    relatedImports: ['Numeric', 'Card'],
    code: '<DotRing label="Runs by hour" data={hours} value="32 s" caption="per run" ticks={[{ at: 0, label: "00" }, { at: 12, label: "12" }]} />',
  }),
  entry({
    name: 'DotBars',
    group: 'Data Display',
    aliases: ['Dot histogram', 'Range on chart', 'Daily counts'],
    description:
      'A histogram built from dots, one column per day or step, with a highlighted range and an accent outlier.',
    states: ['Default', 'Range', 'Outlier', 'Empty'],
    contract:
      'label · data: { label, value }[] · max? · rows? · range?: { start, end } · rangeLabel? · outliers?: number[] · axis?: [start, end] · unit?',
    responsibility:
      'The range only highlights; your app picks it and sums its figures for rangeLabel. Pass the axis labels as text. Every value is in a hidden table.',
    keyboard: 'Inert content; the hidden table is read in order.',
    relatedImports: ['Numeric', 'Chart'],
    code: '<DotBars label="Runs in October" data={days} range={{ start: 6, end: 19 }} rangeLabel="Oct 7 – 20 · 642 runs" axis={["Oct 1", "Oct 31"]} />',
  }),
  entry({
    name: 'WeekStrip',
    group: 'Data Display',
    aliases: ['Week bars', 'Stacked days', 'Weekly goal'],
    description:
      'Seven columns with the series stacked inside each and the current day in bold, for a week at a glance.',
    states: ['Default', 'Single series', 'Goal'],
    contract:
      'label · days: { label, values: Record<seriesId, number> }[] · series: { id, label, swatch? }[] · max? · current? · unit? · legend?',
    responsibility:
      'Pass counts by series id per day. max sets the column that reads full; use it for a goal so the empty part of each column shows what is left. Every count is in a hidden table.',
    keyboard: 'Inert content; the hidden table is read in order.',
    relatedImports: ['Stat', 'Progress'],
    code: '<WeekStrip label="This week" days={week} series={[{ id: "summarize", label: "Summarize" }, { id: "rewrite", label: "Rewrite", swatch: "var(--ai-secondary)" }]} current={4} />',
  }),
  entry({
    name: 'HeatKeys',
    group: 'Data Display',
    aliases: ['Keyboard heat map', 'Grid heat map', 'Shortcut usage'],
    description:
      'A grid of cells shaded in four steps by their value, laid out like a keyboard or any grid, with the label kept on every cell.',
    states: ['Default', 'Grid', 'Empty'],
    contract:
      'label · rows: { keys: { id, label, value, span? }[], offset? }[] · max? · scale?: [low, high] · unit?',
    responsibility:
      'Lay the rows out yourself with offsets in cell units. Shading backs up the printed label; every count is in a hidden table. For counts across two named axes, use Matrix.',
    keyboard: 'Inert content; the hidden table is read in order.',
    relatedImports: ['Matrix'],
    code: '<HeatKeys label="Keys you reach for" rows={keyboard} scale={["Fewer", "More"]} />',
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
        'label · value · delta? · trend?: up | down | neutral · note? · variant?: card | plain | inset · StatGroup: native div props',
      responsibility:
        'Format numbers, units and signs in the application. Trend color only backs up text that already shows the sign. Renders on the server.',
      keyboard: 'Inert content; it adds no tab stop.',
      relatedImports: ['StatGroup'],
      code: '<StatGroup aria-label="Usage">\n  <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />\n</StatGroup>',
    }),
    presentations: ['card', 'plain', 'inset'],
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
      'Chips only ask; your app applies the filter. Link chips render the LinkProvider link when one is set. Active fills use --ai-chip-active-background and --ai-chip-active-color so labels keep their contrast.',
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
      'Pass the current step from your route or app state. Planned steps have no destination; the reading prints "Step 2 of 9" from the current step.',
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
      'Every cell shows its number. The fill only backs it up, and the text switches color where the theme needs it to for contrast. Pass the counts and links from your app.',
    keyboard:
      'A real table with scoped headers inside a focusable, labeled scroll region; header and cell links are ordinary links.',
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
      'The outcome is announced in a polite live region and shown by the icon; the accessible name never changes mid-press. A failed copy says to copy by hand. Snippet uses it, so the library has one copy behavior.',
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
    description: 'Lets people choose light, dark or the system setting.',
    states: ['Default', 'Switch', 'Subtle', 'Segmented', 'Stored'],
    contract:
      'value · onValueChange · variant?: cycle | segmented | switch | subtle · labels? · label? · size? · useStoredAppearance({ storageKey }) · useResolvedAppearance(value) · appearanceInitScript({ storageKey })',
    responsibility:
      'Pass the value to AITheme. useStoredAppearance keeps it in this browser and follows other tabs; appearanceInitScript applies it before paint through a root attribute your stylesheet reads. Until the page’s scripts load, the cycle button shows a neutral mark.',
    keyboard:
      'The cycle button names the current mode and what a press switches to. Switch and segmented are radiogroups (arrow keys move and select); subtle is one "Dark mode" button with a pressed state.',
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
      'Static items filter locally by every word; async results are debounced, canceled through the signal and never shown for an older query. With a LinkProvider, items with an href are that router link. Excerpts are plain text; markMatches marks them safely.',
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
    states: ['Default', 'Track', 'Ticks', 'Collapsible', 'Plain'],
    contract:
      'items: { id, title, items? }[] · variant?: list | track | ticks · label? · numbered? · showReading? · collapsible?: narrow | never | always · readingLine? · minItems? · activeId? · onActiveChange? · useActiveHeading(ids)',
    responsibility:
      'Links are plain in-page anchors; nothing hijacks scrolling. The active heading is the last one past the reading line, tracked with an IntersectionObserver and a passive scroll listener. Track lists every level on a line that steps in per level and darkens for the sections on screen. Ticks is a slim rail for long reads that opens into the titles. Below minItems it renders nothing.',
    keyboard:
      'Ordinary links in a navigation landmark; the active one carries aria-current="location". The ticks rail is a button with aria-expanded; focus inside opens the titles and Escape closes them.',
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
    keyboard: 'Buttons and links in a labeled group, or a menu with arrow keys.',
    relatedImports: ['CopyButton'],
    code: "<ShareMenu url={pageUrl} title={pageTitle} targets={['copy', 'native', 'linkedin', 'x']} />",
  }),
];

export const websiteNames = new Set<string>(websiteCatalog.map((item) => item.name));
