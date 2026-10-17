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
    description: 'A native table with controlled sorting, paging, selection and column visibility.',
    aliases: ['Data grid', 'Customer table'],
    states: ['Default', 'Loading', 'Empty', 'Error'],
    contract:
      'caption · captionVisibility? · columns · rows · getRowId · sort? · pagination? · selectedRowIds?',
    responsibility:
      'Filter, sort and page rows in your host before passing the current window. Selection never grants permission to act on a record.',
    keyboard:
      'Tab reaches sort buttons, selection, column controls and paging. Wide tables scroll within their labelled region.',
    code: '<DataGrid caption="Customers" columns={columns} rows={pageRows} getRowId={row => row.id}\n  sort={sort} onSortChange={setSort} pagination={pagination} onPageChange={setPage}\n  selectedRowIds={selectedIds} onSelectionChange={setSelectedIds} />',
  }),
  application({
    name: 'Combobox',
    group: 'Forms',
    category: 'Searchable choices',
    description:
      'Search a list and choose one value, or several with type="multiple", with labelled loading and error states.',
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
    description: 'Choose a date or range with explicit month, locale and availability rules.',
    states: ['Default', 'Range', 'Disabled', 'Loading', 'Error'],
    contract: 'value · onValueChange? · month · onMonthChange · locale · mode?',
    responsibility:
      'Supply YYYY-MM-DD dates, the displayed month and today from your app. Locale formats dates; labels translate interface text.',
    keyboard:
      'Arrow keys move by day or week, Home/End by week and Page Up/Down by month. Enter or Space selects an available day.',
    code: '<Calendar value={date} onValueChange={setDate} month={month} onMonthChange={setMonth}\n  locale="en-GB" min="2026-10-01" max="2026-12-31" />',
  }),
  application({
    name: 'DateRangePicker',
    group: 'Forms',
    category: 'Date selection',
    description: 'A controlled date range field with a keyboard-accessible calendar popup.',
    states: ['Default', 'Disabled', 'Loading', 'Error'],
    contract: 'value · onValueChange? · month · onMonthChange · open · onOpenChange · locale',
    responsibility:
      'Own the range and popup state. A range cannot include disabled dates; validate date rules again on submission.',
    keyboard:
      'Opening focuses the calendar. Escape closes and returns to the trigger; Clear and Done are labelled actions.',
    code: '<DateRangePicker label="Report period" value={range} onValueChange={setRange}\n  month={month} onMonthChange={setMonth} open={open} onOpenChange={setOpen} locale="en-GB" />',
  }),
  application({
    name: 'PageHeader',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A page title with breadcrumbs, supporting text and adjacent actions.',
    states: ['Default'],
    contract: 'title · description? · headingLevel? · breadcrumb? · actions?',
    responsibility:
      'Choose headingLevel to fit the page outline. Supply actual links and actions as React content.',
    code: '<PageHeader title="Customers" description="Manage your customer records."\n  headingLevel={2} actions={<Button onClick={openCreate}>Add customer</Button>} />',
    relatedImports: ['Button'],
  }),
  application({
    name: 'OrgSwitcher',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'A labelled organization selector that requests a change of scope.',
    states: ['Default', 'Disabled'],
    contract: 'value · organizations · onValueChange · label? · disabled?',
    responsibility:
      'Check access and unsaved drafts before changing the organization. The callback is a request to your app.',
    code: '<OrgSwitcher value={organizationId} organizations={organizations} onValueChange={requestOrganization} />',
  }),
  application({
    name: 'ListToolbar',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'Search, filters and list actions with a readable result summary.',
    states: ['Default', 'Disabled'],
    contract: 'searchLabel · search · onSearchChange · filters? · actions? · summary?',
    responsibility: 'Apply search and filters in your app, then supply an accurate result summary.',
    code: '<ListToolbar searchLabel="Find customers" search={query} onSearchChange={setQuery}\n  filters={filters} actions={actions} summary={`${total} customers`} />',
  }),
  application({
    name: 'FilterBar',
    group: 'Application patterns',
    category: 'Application patterns',
    description:
      'Search, an order switch, a chip row for the main facet and selects for the rest, driven by host or URL state.',
    states: ['Default', 'URL links', 'Popover', 'Disabled'],
    contract:
      'searchLabel · searchLabelVisibility? · searchIcon? · search · onSearchChange · onSearchSubmit? · order? · facet? · selects? · onClear? · summary? · disabled? · presentation?: open | popover · filtersLabel? · facet options: removeHref?',
    responsibility:
      'Keep every value in the host, usually the URL. Link mode on order and facet renders anchors; a LinkProvider makes them router links. The bar never filters data itself.',
    keyboard:
      'Enter in the search box submits. Button-mode order is a radiogroup with arrow keys; chips, links and selects are ordinary controls.',
    code: '<FilterBar searchLabel="Search the journal" search={q} onSearchChange={setQ} onSearchSubmit={apply}\n  order={{ label: "Order", value: view, options: views, mode: "links" }}\n  facet={{ label: "Discipline", options: disciplines, selected, onToggle }}\n  selects={[{ name: "kind", label: "Kind", value: kind, options: kinds, onValueChange: setKind }]}\n  onClear={clear} summary={`${shown} of ${total} entries`} />',
    relatedImports: ['ToggleGroup', 'Chip', 'Select'],
  }),
  application({
    name: 'Checklist',
    group: 'Application patterns',
    category: 'Application patterns',
    description:
      'A tick-off list whose state the host owns, with progress, groups, reset and Markdown export.',
    states: ['Default', 'Row toggle', 'Stored in this browser'],
    contract:
      'items: { id, title, detail?, eyebrow?, group? }[] · label · value · onValueChange · ordered? · rowToggle? · showProgress? · actions?: { copyMarkdown?, reset? } · useStoredChecklist(storageKey) · checklistToMarkdown(label, items, checked)',
    responsibility:
      'The host owns the checked ids; useStoredChecklist is the opt-in way to keep them in this browser. Reset offers Undo and both are announced. Copy as Markdown appears only when every title is plain text.',
    keyboard:
      'Each row is a labelled checkbox. With rowToggle a click anywhere on the row ticks it, except on links, buttons, labels and the box.',
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
      'Control activePane and provide a Back action in the detail. Move focus when navigation changes the visible pane.',
    code: '<MasterDetail list={list} listLabel="Customers" detail={detail}\n  detailLabel="Customer details" activePane={activePane} />',
  }),
  application({
    name: 'SettingsSaveCancel',
    group: 'Application patterns',
    category: 'Application patterns',
    description: 'Save and cancel actions that distinguish pending, rejected and unknown outcomes.',
    states: ['Default', 'Pending', 'Rejected', 'Unknown'],
    contract: 'dirty · state · onCancel · onSave? · form? · onReconcile?',
    responsibility:
      'Supply the host result. After an unknown outcome, look up the original receipt instead of sending the mutation again.',
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
      'Supply useful answers. Any structured data must reflect visible, truthful content and your own SEO policy.',
    code: '<MarketingFAQ title="Questions" items={questions} value={openQuestion} onValueChange={setOpenQuestion} />',
  }),
  marketing({
    name: 'MarketingContact',
    category: 'Website sections',
    description: 'A contact form layout with fields, actions and explicit submission feedback.',
    states: ['Default'],
    contract: 'title · children · actions? · feedback? · onSubmit?',
    responsibility:
      'Your app owns fields, validation, submission and the receipt. Use success feedback only after a confirmed result.',
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
      'Supply author, date and article content. Use headingLevel 1 when the article is the page. Use safe React content rather than evaluating generated HTML or MDX.',
    code: '<MarketingArticle title="Working together" meta={articleMeta}>\n  {articleBody}\n</MarketingArticle>',
  }),
];

export const applicationNames = new Set<string>(applicationCatalog.map((entry) => entry.name));
export const marketingNames = new Set<string>(marketingCatalog.map((entry) => entry.name));
