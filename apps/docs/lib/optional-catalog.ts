import type { CatalogEntry } from './catalog';

type Entry = Omit<CatalogEntry, 'presentations' | 'presentationProp' | 'importPath'>;
const application = (entry: Entry): CatalogEntry => ({
  ...entry,
  presentations: ['default'],
  presentationProp: null,
  importPath: '/application',
});
const marketing = (entry: Entry): CatalogEntry => ({
  ...entry,
  group: 'Marketing blocks',
  presentations: ['default'],
  presentationProp: null,
  importPath: '/marketing',
});

export const applicationCatalog: CatalogEntry[] = [
  application({
    name: 'DataGrid',
    group: 'Data Display',
    category: 'Application data',
    description: 'A table with sorting, paging, row selection and column toggles.',
    aliases: ['Data grid', 'Customer table'],
    states: ['Default', 'Loading', 'Empty', 'Error'],
    contract:
      'caption · captionVisibility? · columns · rows · getRowId · sort? · pagination? · selectedRowIds?',
    responsibility: 'Selecting a row never grants permission to act on it.',
    keyboard:
      'Tab reaches sort buttons, selection, column controls and paging. Wide tables scroll within their labeled region.',
    code: '<DataGrid caption="Customers" columns={columns} rows={pageRows} getRowId={row => row.id}\n  sort={sort} onSortChange={setSort} pagination={pagination} onPageChange={setPage}\n  selectedRowIds={selectedIds} onSelectionChange={setSelectedIds} />',
  }),
  application({
    name: 'Combobox',
    group: 'Forms',
    category: 'Searchable choices',
    description:
      'Search a list and choose one value, or several with type="multiple", with clear loading and error messages.',
    aliases: ['Autocomplete', 'Multi select', 'Searchable select'],
    states: ['Default', 'Multiple', 'Disabled', 'Loading', 'Error', 'Empty'],
    contract:
      'label · options · type?: single | multiple · value · onValueChange · query · onQueryChange',
    responsibility:
      'Keep the selected value and search query in your app. Use filterOption={false} for options already filtered by your server.',
    keyboard:
      'Arrow keys move through options. Enter selects, Escape closes, and Tab leaves the field. Focus stays in the input.',
    code: '<Combobox label="Owner" options={owners} value={owner} onValueChange={setOwner}\n  query={query} onQueryChange={setQuery} />',
  }),
  application({
    name: 'Calendar',
    group: 'Forms',
    category: 'Date selection',
    description: 'Pick a date or a range, in any language, limited to the dates you allow.',
    states: ['Default', 'Range', 'Disabled', 'Loading', 'Error'],
    contract: 'value · onValueChange? · month · onMonthChange · locale · mode?',
    responsibility:
      'Pass dates as YYYY-MM-DD, plus the month to show and today’s date from your app. locale formats the dates; labels translates the rest of the text.',
    keyboard:
      'Arrow keys move by day or week, Home/End by week and Page Up/Down by month. Enter or Space selects an available day.',
    code: '<Calendar value={date} onValueChange={setDate} month={month} onMonthChange={setMonth}\n  locale="en-GB" min="2026-10-01" max="2026-12-31" />',
  }),
  application({
    name: 'DateRangePicker',
    group: 'Forms',
    category: 'Date selection',
    description: 'A date range field with a pop-up calendar that works from the keyboard.',
    states: ['Default', 'Disabled', 'Loading', 'Error'],
    contract: 'value · onValueChange? · month · onMonthChange · open · onOpenChange · locale',
    responsibility:
      'Keep the range, and whether the calendar is open, in your app. A range can’t include disabled dates; check your date rules again when the form is submitted.',
    keyboard:
      'Opening focuses the calendar. Escape closes and returns to the trigger; Clear and Done are labeled actions.',
    code: '<DateRangePicker label="Report period" value={range} onValueChange={setRange}\n  month={month} onMonthChange={setMonth} open={open} onOpenChange={setOpen} locale="en-GB" />',
  }),
  application({
    name: 'PageHeader',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A page title with breadcrumbs, supporting text and adjacent actions.',
    states: ['Default'],
    contract: 'title · description? · headingLevel? · breadcrumb? · actions?',
    responsibility: 'Set headingLevel to fit the page, and pass real links and actions.',
    code: '<PageHeader title="Customers" description="Manage your customer records."\n  headingLevel={2} actions={<Button onClick={openCreate}>Add customer</Button>} />',
    relatedImports: ['Button'],
  }),
  application({
    name: 'OrgSwitcher',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'Switch between organizations.',
    states: ['Default', 'Disabled'],
    contract: 'value · organizations · onValueChange · label? · disabled?',
    responsibility:
      'Check access and unsaved work before switching. The callback only asks; your app decides.',
    code: '<OrgSwitcher value={organizationId} organizations={organizations} onValueChange={requestOrganization} />',
  }),
  application({
    name: 'ListToolbar',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'Search, filters and list actions with a readable result summary.',
    states: ['Default', 'Disabled'],
    contract: 'searchLabel · search · onSearchChange · filters? · actions? · summary?',
    responsibility:
      'Apply search and filters in your app, then pass back an accurate result count.',
    code: '<ListToolbar searchLabel="Find customers" search={query} onSearchChange={setQuery}\n  filters={filters} actions={actions} summary={`${total} customers`} />',
  }),
  application({
    name: 'FilterBar',
    group: 'Application patterns',
    category: 'Application patterns',
    description:
      'Search, a sort switch, chips for the main filter and dropdowns for the rest, kept in your app or the URL.',
    states: ['Default', 'URL links', 'Popover', 'Disabled'],
    contract:
      'searchLabel · searchLabelVisibility? · searchIcon? · search · onSearchChange · onSearchSubmit? · order? · facet? · selects? · onClear? · summary? · disabled? · presentation?: open | popover · filtersLabel? · facet options: removeHref?',
    responsibility:
      'Keep every value in your app, usually in the URL. In link mode the sort and main-filter options are real links, and a LinkProvider makes them router links. The bar never filters data itself.',
    keyboard:
      'Enter in the search box submits. Button-mode order is a radiogroup with arrow keys; chips, links and selects are ordinary controls.',
    code: '<FilterBar searchLabel="Search the journal" search={q} onSearchChange={setQ} onSearchSubmit={apply}\n  order={{ label: "Order", value: view, options: views, mode: "links" }}\n  facet={{ label: "Discipline", options: disciplines, selected, onToggle }}\n  selects={[{ name: "kind", label: "Kind", value: kind, options: kinds, onValueChange: setKind }]}\n  onClear={clear} summary={`${shown} of ${total} entries`} />',
    relatedImports: ['ToggleGroup', 'Chip', 'Select'],
  }),
  application({
    name: 'Checklist',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A tick-off list with progress, groups, reset and copy as Markdown.',
    states: ['Default', 'Row toggle', 'Stored in this browser'],
    contract:
      'items: { id, title, detail?, eyebrow?, group? }[] · label · value · onValueChange · ordered? · rowToggle? · showProgress? · actions?: { copyMarkdown?, reset? } · useStoredChecklist(storageKey) · checklistToMarkdown(label, items, checked)',
    responsibility:
      'Your app owns which items are ticked; useStoredChecklist keeps them in this browser if you want. Reset offers Undo, and screen readers hear both. Copy as Markdown appears only when every title is plain text.',
    keyboard:
      'Each row is a labeled checkbox. With rowToggle a click anywhere on the row ticks it, except on links, buttons, labels and the box.',
    code: '<Checklist items={steps} label="Launch checklist" value={checked} onValueChange={setChecked}\n  rowToggle actions={{ copyMarkdown: true, reset: true }} />',
    relatedImports: ['Progress', 'Checkbox', 'CopyButton'],
  }),
  application({
    name: 'MasterDetail',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A list and detail layout that shows one selected pane on narrow screens.',
    states: ['Default'],
    contract: 'list · listLabel · detail · detailLabel · activePane',
    responsibility:
      'Control activePane and add a Back action to the detail. Move focus when the visible pane changes.',
    code: '<MasterDetail list={list} listLabel="Customers" detail={detail}\n  detailLabel="Customer details" activePane={activePane} />',
  }),
  application({
    name: 'SettingsSaveCancel',
    group: 'Application patterns',
    category: 'Application patterns',
    description:
      'Save and Cancel buttons that show whether saving is in progress, failed or unclear.',
    states: ['Default', 'Pending', 'Rejected', 'Unknown'],
    contract: 'dirty · state · onCancel · onSave? · form? · onReconcile?',
    responsibility:
      'Pass the result from your server. If you don’t know whether a save went through, check before saving again.',
    code: '<SettingsSaveCancel dirty={dirty} state={saveState} form="settings-form"\n  onCancel={discardDraft} onReconcile={checkOriginalReceipt} />',
  }),
  application({
    name: 'UnsavedGuard',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A confirmation dialog for leaving a local draft.',
    states: ['Default'],
    contract: 'open · onOpenChange · onKeepEditing · onDiscard · destination?',
    responsibility:
      'Control navigation and restore focus after the decision. Discard applies only to the local draft.',
    code: '<UnsavedGuard open={guardOpen} onOpenChange={setGuardOpen}\n  onKeepEditing={keepEditing} onDiscard={discardAndNavigate} destination="Billing" />',
  }),
];

export const marketingCatalog: CatalogEntry[] = [
  marketing({
    name: 'MarketingHeader',
    category: 'Site navigation',
    description: 'Brand, links and actions in a responsive website header.',
    states: ['Default'],
    contract: 'brand · links · actions? · navigationLabel? · menuLabel?',
    responsibility:
      'Supply real destinations. The mobile disclosure keeps the same navigation links available.',
    code: '<MarketingHeader brand={brand} links={navigation} actions={headerActions} />',
  }),
  marketing({
    name: 'MarketingFooter',
    category: 'Site navigation',
    description: 'A website footer with grouped links and supplied copyright text.',
    states: ['Default'],
    contract: 'brand · groups · copyright · description?',
    responsibility:
      'Supply your own link groups and copyright. The component does not assume your company, year or legal terms.',
    code: '<MarketingFooter brand={brand} groups={footerGroups} copyright="Your copyright text" />',
  }),
  marketing({
    name: 'MarketingHero',
    category: 'Website sections',
    description: 'A clear page introduction with actions and space for a real product preview.',
    states: ['Default'],
    contract: 'title · description? · eyebrow? · actions? · note? · children?',
    responsibility:
      'The title defaults to h1; set headingLevel for embedded sections. Provide a preview that reflects the actual product.',
    code: '<MarketingHero title="A shared home for your work" description={description} actions={actions}>\n  {productPreview}\n</MarketingHero>',
  }),
  marketing({
    name: 'MarketingReveal',
    category: 'Motion',
    description:
      'Fades and lifts a section into place the first time it scrolls into view; still in the HTML from the start.',
    states: ['Default'],
    contract: 'children · delayMs? · repeat?',
    responsibility:
      'Content is readable before the transition and shown at once under reduced motion or without IntersectionObserver. Stagger a row with delayMs.',
    code: '<MarketingReveal delayMs={120}>\n  <MarketingFeatures … />\n</MarketingReveal>',
  }),
  marketing({
    name: 'MarketingNumber',
    category: 'Motion',
    description:
      'A figure that counts up when it scrolls into view, with the real value in the text the whole time.',
    states: ['Default'],
    contract: 'value · format? · durationMs?',
    responsibility:
      'Your site supplies the figure; the component never computes one. Screen readers get the final value; reduced motion skips the count.',
    code: '<MarketingNumber value={1200} format={(n) => `${n.toLocaleString()} teams`} />',
  }),
  {
    ...marketing({
      name: 'MarketingIllustration',
      category: 'Illustrations',
      description:
        'Four small line scenes for landing pages, drawn in the theme’s own colours: an agent team, integrations, an approval, an empty state.',
      states: ['Default'],
      contract: 'variant: agents | integrations | approval | empty · title?',
      responsibility:
        'Decorative unless you pass a title, which becomes the accessible name. Colours follow the theme and both appearances; the slight motion stops under reduced motion.',
      code: '<MarketingIllustration variant="agents" title="An orchestrator and three agents" />',
    }),
    presentations: ['agents', 'integrations', 'approval', 'empty'],
    presentationProp: 'variant',
  },
  marketing({
    name: 'MarketingFeatures',
    category: 'Website sections',
    description: 'A concise feature list with optional icons and supporting content.',
    states: ['Default'],
    contract: 'title · items · description? · children?',
    responsibility:
      'Describe features you actually provide. Items have stable IDs and headings; icons are optional.',
    code: '<MarketingFeatures title="The workspace" items={features} />',
  }),
  marketing({
    name: 'MarketingPricing',
    category: 'Website sections',
    description: 'Plan cards with supplied prices, features and action slots.',
    states: ['Default'],
    contract: 'title · plans · description? · note?',
    responsibility:
      'Supply accurate terms and payment actions. The block displays prices; it performs no billing or subscriptions.',
    code: '<MarketingPricing title="Plans" plans={plans} note="Your plan terms" />',
  }),
  marketing({
    name: 'MarketingFAQ',
    category: 'Website sections',
    description: 'Questions and answers built on the shared Accordion.',
    states: ['Default'],
    contract: 'title · items · value? · onValueChange?',
    responsibility:
      'Write useful answers. Any structured data for search engines must match what’s visible on the page.',
    code: '<MarketingFAQ title="Questions" items={questions} value={openQuestion} onValueChange={setOpenQuestion} />',
  }),
  marketing({
    name: 'MarketingContact',
    category: 'Website sections',
    description: 'A contact form layout with fields, actions and a clear message after sending.',
    states: ['Default'],
    contract: 'title · children · actions? · feedback? · onSubmit?',
    responsibility:
      'Your app owns the fields, validation and sending. Show a success message only once sending is confirmed.',
    code: '<MarketingContact title="Contact us" onSubmit={submitContact} actions={submitButton} feedback={feedback}>\n  {contactFields}\n</MarketingContact>',
  }),
  marketing({
    name: 'MarketingArticle',
    category: 'Website sections',
    description: 'An article introduction, body and action area with supplied metadata.',
    states: ['Default', 'Page level with aside'],
    contract:
      'title · children · headingLevel?: 1 | 2 | 3 · byline? · description? · meta? · actions? · aside?',
    responsibility:
      'Supply author, date and article content. Use headingLevel 1 when the article is the page. Pass React content; never run generated HTML or MDX.',
    code: '<MarketingArticle title="Working together" meta={articleMeta}>\n  {articleBody}\n</MarketingArticle>',
  }),
];

export const applicationNames = new Set<string>(applicationCatalog.map((entry) => entry.name));
export const marketingNames = new Set<string>(marketingCatalog.map((entry) => entry.name));
