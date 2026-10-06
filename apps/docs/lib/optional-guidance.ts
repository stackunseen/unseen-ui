import type {
  DataGridProps,
  ComboboxProps,
  MultiSelectProps,
  CalendarProps,
  DateRangePickerProps,
  PageHeaderProps,
  OrgSwitcherProps,
  ListToolbarProps,
  MasterDetailProps,
  SettingsSaveCancelProps,
  UnsavedGuardProps,
} from '@stackunseen/ui/application';
import type {
  MarketingHeaderProps,
  MarketingFooterProps,
  MarketingHeroProps,
  MarketingFeaturesProps,
  MarketingPricingProps,
  MarketingFAQProps,
  MarketingContactProps,
  MarketingArticleProps,
} from '@stackunseen/ui/marketing';
import type { Guide } from './component-guidance';

type APIs = {
  DataGrid: DataGridProps<{ id: string }>;
  Combobox: ComboboxProps;
  MultiSelect: MultiSelectProps;
  Calendar: CalendarProps;
  DateRangePicker: DateRangePickerProps;
  PageHeader: PageHeaderProps;
  OrgSwitcher: OrgSwitcherProps;
  ListToolbar: ListToolbarProps;
  MasterDetail: MasterDetailProps;
  SettingsSaveCancel: SettingsSaveCancelProps;
  UnsavedGuard: UnsavedGuardProps;
  MarketingHeader: MarketingHeaderProps;
  MarketingFooter: MarketingFooterProps;
  MarketingHero: MarketingHeroProps;
  MarketingFeatures: MarketingFeaturesProps;
  MarketingPricing: MarketingPricingProps;
  MarketingFAQ: MarketingFAQProps;
  MarketingContact: MarketingContactProps;
  MarketingArticle: MarketingArticleProps;
};

const guides = {
  DataGrid: {
    use: 'Pass the rows for the current page. The grid requests sorting, filtering, paging and selection changes; your application updates the data and controlled props.',
    keyboard:
      'Tab reaches column sorting, selection and paging. Scroll the labelled table region to read wide columns.',
    props: [
      {
        name: 'caption',
        type: 'string',
        description: 'The native table caption and scroll-region name.',
      },
      {
        name: 'columns',
        type: 'readonly DataGridColumn<Row>[]',
        description:
          'Stable column IDs, headers and trusted React cell renderers. Use rowHeader for the record name.',
      },
      {
        name: 'rows',
        type: 'readonly Row[]',
        description:
          'The host-filtered, sorted and paged window. The grid does not fetch or transform it.',
      },
      {
        name: 'getRowId',
        type: '(row: Row) => string',
        description: 'A unique, nonblank ID used for selection and focus recovery.',
      },
      {
        name: 'sort',
        type: 'DataGridSort | null (optional)',
        description:
          'Current column and direction. onSortChange cycles ascending, descending and unsorted.',
      },
      {
        name: 'pagination',
        type: 'DataGridPagination (optional)',
        description:
          'Zero-based pageIndex, pageSize and totalRows. For an unknown total, supply hasNextPage.',
      },
      {
        name: 'selectedRowIds',
        type: 'readonly string[] (optional)',
        description:
          'Selected IDs across pages. The header checkbox changes only selectable rows on the current page.',
      },
      {
        name: 'onSelectionChange',
        type: '(ids: readonly string[]) => void (optional)',
        description: 'Requests the full updated selection, preserving IDs outside this page.',
      },
      {
        name: 'columnVisibility',
        type: 'Readonly<Record<string, boolean>> (optional)',
        description: 'Visible columns by ID. onColumnVisibilityChange requests the updated map.',
      },
      {
        name: 'filter',
        type: 'DataGridFilter (optional)',
        description: 'Controlled value, accessible label and onValueChange callback for search.',
      },
    ],
  },
  Combobox: {
    use: 'Keep the search query separate from the chosen ID. The input filters the supplied options; set filterOption to false when your server already filtered them.',
    keyboard:
      'Arrow keys browse, Enter selects, Escape closes and Tab leaves. Focus stays in the input.',
    props: [
      { name: 'label', type: 'string', description: 'Visible field label and option-list name.' },
      {
        name: 'options',
        type: 'readonly ComboboxOption[]',
        description:
          'Stable value, label, optional description and disabled reason. At most 200 matches are shown with a refinement hint.',
      },
      {
        name: 'value',
        type: 'string | null',
        description: 'Selected ID. A value outside the loaded options remains explicit.',
      },
      {
        name: 'onValueChange',
        type: '(value: string | null) => void',
        description: 'Accept a requested selection or clear in your application.',
      },
      { name: 'query', type: 'string', description: 'Current search text.' },
      {
        name: 'onQueryChange',
        type: '(query: string) => void',
        description: 'Update search text and, if needed, request new host results.',
      },
      {
        name: 'status',
        type: "'ready' | 'loading' | 'error' (optional)",
        description: 'Actual option availability. Supply error for a useful failure message.',
      },
    ],
  },
  MultiSelect: {
    use: 'Store selected IDs independently of the current search results. Each choice can be removed from its labelled chip.',
    keyboard:
      'Arrow keys browse and Enter toggles a choice. Tab reaches the selected-chip remove actions.',
    props: [
      { name: 'label', type: 'string', description: 'Visible field label.' },
      {
        name: 'options',
        type: 'readonly MultiSelectOption[]',
        description: 'Stable IDs, labels, descriptions and optional disabled reasons.',
      },
      {
        name: 'value',
        type: 'readonly string[]',
        description: 'Selected IDs, including values outside the current result window.',
      },
      {
        name: 'onValueChange',
        type: '(value: readonly string[]) => void',
        description: 'Requests the complete updated selection.',
      },
      {
        name: 'query',
        type: 'string',
        description: 'Search text, separate from the selected values.',
      },
      {
        name: 'onQueryChange',
        type: '(query: string) => void',
        description: 'Update the controlled query.',
      },
      {
        name: 'filterOption',
        type: 'false | ((option, query) => boolean) (optional)',
        description:
          'Disable local filtering for server results or supply your own match function.',
      },
    ],
  },
  Calendar: {
    use: 'Use date-only YYYY-MM-DD strings. Your app owns both the selected date or range and the displayed month.',
    keyboard:
      'Arrows move by day/week, Home/End by week and Page Up/Down by month. Enter or Space chooses an available day.',
    props: [
      {
        name: 'mode',
        type: "'single' | 'range' (optional)",
        description: 'Select one date by default, or a start/end range.',
      },
      {
        name: 'value',
        type: 'DateOnly | null, or DateRange',
        description: 'Controlled selection matching mode.',
      },
      {
        name: 'onValueChange',
        type: '(selection) => void (optional)',
        description:
          'Requests a selection. An earlier range end restarts the range; a disabled interior day blocks completion.',
      },
      { name: 'month', type: 'DateOnly', description: 'Any valid date in the displayed month.' },
      {
        name: 'onMonthChange',
        type: '(month: DateOnly) => void',
        description: 'Requests the first day of the next displayed month.',
      },
      {
        name: 'locale',
        type: 'string',
        description:
          'Date and weekday formatting locale. Use labels to translate interface wording.',
      },
      {
        name: 'today',
        type: 'DateOnly (optional)',
        description: 'The host-supplied current date. No browser clock or timezone is assumed.',
      },
      {
        name: 'disabledDates',
        type: 'readonly DateOnly[] (optional)',
        description: 'Unavailable dates. min and max provide inclusive date bounds.',
      },
    ],
  },
  DateRangePicker: {
    use: 'Keep the range, displayed month and popup disclosure in your app. Selection is acknowledged when you update value.',
    keyboard:
      'Opening focuses the selected or available calendar day. Escape closes and returns focus to the field.',
    props: [
      {
        name: 'value',
        type: 'DateRange',
        description: 'Date-only start and end, each nullable while choosing a range.',
      },
      {
        name: 'onValueChange',
        type: '(range: DateRange) => void (optional)',
        description: 'Requests the chosen or cleared range.',
      },
      { name: 'open', type: 'boolean', description: 'Whether the calendar popup is visible.' },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        description: 'Accept a requested open or close.',
      },
      {
        name: 'month',
        type: 'DateOnly',
        description: 'Controlled displayed month; onMonthChange requests a change.',
      },
      {
        name: 'onMonthChange',
        type: '(month: DateOnly) => void',
        description: 'Update the displayed month.',
      },
      {
        name: 'locale',
        type: 'string',
        description: 'Formatting locale. labels and calendarLabels translate the interface text.',
      },
      {
        name: 'label',
        type: 'string (optional)',
        description: 'Visible field label. Defaults to the component label.',
      },
    ],
  },
  PageHeader: {
    use: 'Place a title, optional breadcrumb and adjacent actions at the start of an application page.',
    keyboard: 'Supplied links and actions keep their native keyboard behavior.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Page title.' },
      {
        name: 'headingLevel',
        type: '1 | 2 | 3 (optional)',
        description: 'Defaults to 1; use 2 or 3 for an embedded section.',
      },
      { name: 'description', type: 'ReactNode (optional)', description: 'Short supporting text.' },
      {
        name: 'breadcrumb',
        type: 'ReactNode (optional)',
        description: 'Your breadcrumb composition.',
      },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'Buttons or links belonging to this page.',
      },
    ],
  },
  OrgSwitcher: {
    use: 'Treat an organization change as a scope request. Check access and unsaved drafts before accepting it.',
    keyboard: 'Uses the shared Select keyboard and focus behavior.',
    props: [
      { name: 'value', type: 'string', description: 'Current organization ID.' },
      {
        name: 'organizations',
        type: 'readonly SelectOption[]',
        description: 'Available organizations and disabled choices.',
      },
      {
        name: 'onValueChange',
        type: '(id: string) => void',
        description: 'Requests a new scope; your app decides when to accept it.',
      },
      {
        name: 'disabled',
        type: 'boolean (optional)',
        description: 'Block scope changes while your host is unavailable or a command is pending.',
      },
    ],
  },
  ListToolbar: {
    use: 'Group list search, filters, actions and a result summary. Apply filtering in your app.',
    keyboard: 'Tab follows search, supplied filters and actions in document order.',
    props: [
      { name: 'searchLabel', type: 'string', description: 'Visible search label.' },
      { name: 'search', type: 'string', description: 'Controlled query.' },
      {
        name: 'onSearchChange',
        type: '(value: string) => void',
        description: 'Update the query and result window.',
      },
      { name: 'filters', type: 'ReactNode (optional)', description: 'Filter controls you supply.' },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'List-level buttons or links.',
      },
      {
        name: 'summary',
        type: 'ReactNode (optional)',
        description: 'Result summary announced as status text.',
      },
    ],
  },
  MasterDetail: {
    use: 'Desktop displays list and detail together. On narrow screens activePane selects the visible pane.',
    keyboard: 'Your navigation callbacks should focus the newly visible heading or Back action.',
    props: [
      { name: 'list', type: 'ReactNode', description: 'List content.' },
      { name: 'listLabel', type: 'string', description: 'Accessible list-region name.' },
      {
        name: 'detail',
        type: 'ReactNode',
        description: 'Selected record content and a Back action.',
      },
      { name: 'detailLabel', type: 'string', description: 'Accessible detail-region name.' },
      {
        name: 'activePane',
        type: "'list' | 'detail'",
        description: 'Which pane appears on narrow screens.',
      },
    ],
  },
  SettingsSaveCancel: {
    use: 'Keep draft and receipt state in your host. Pending and unknown outcomes block another save. Unknown offers original receipt lookup.',
    keyboard:
      'Save can submit an external form with form. Feedback is announced; buttons remain in document order.',
    props: [
      {
        name: 'dirty',
        type: 'boolean',
        description: 'Whether the local draft differs from the saved record.',
      },
      {
        name: 'state',
        type: 'SettingsSaveState',
        description:
          'idle, pending, acknowledged, rejected or unknown, with the host message where required.',
      },
      {
        name: 'form',
        type: 'string (optional)',
        description: 'ID of a containing or external form; Save becomes its submit button.',
      },
      {
        name: 'onSave',
        type: '() => void (optional)',
        description: 'Requests saving when form is absent.',
      },
      { name: 'onCancel', type: '() => void', description: 'Discard the local draft.' },
      {
        name: 'onReconcile',
        type: '() => void (optional)',
        description:
          'Look up the original command receipt after an unknown result. Do not resubmit.',
      },
      {
        name: 'canSave',
        type: 'boolean (optional)',
        description: 'Current permission and validity, supplied by your app.',
      },
    ],
  },
  UnsavedGuard: {
    use: 'Open before navigating away from an unsaved local draft. Resolve the choice and navigation in your app.',
    keyboard:
      'Focus is contained while open. Restore it to the originating control or destination after your decision.',
    props: [
      { name: 'open', type: 'boolean', description: 'Controlled visibility.' },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        description: 'Handle requested disclosure changes.',
      },
      {
        name: 'onKeepEditing',
        type: '() => void',
        description: 'Retain the draft and stay on the current screen.',
      },
      {
        name: 'onDiscard',
        type: '() => void',
        description: 'Discard only the local draft, then continue the requested navigation.',
      },
      {
        name: 'destination',
        type: 'string (optional)',
        description: 'Readable destination included in the confirmation.',
      },
      {
        name: 'returnFocusRef',
        type: 'RefObject<HTMLElement | null> (optional)',
        description:
          'The requesting control captured before opening. Use it when navigation or an embedded dialog makes focus return ambiguous.',
      },
    ],
  },
  MarketingHeader: {
    use: 'Supply your brand, real navigation destinations and an optional action area.',
    keyboard:
      'Mobile menu supports keyboard activation, Escape and focus return. Links stay in document order.',
    props: [
      { name: 'brand', type: 'ReactNode', description: 'Your brand or home link.' },
      {
        name: 'links',
        type: 'readonly MarketingLink[]',
        description: 'Stable ID, label and href for each destination.',
      },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'Your header buttons or links.',
      },
      {
        name: 'navigationLabel',
        type: 'string (optional)',
        description: 'Accessible navigation name.',
      },
      {
        name: 'menuLabel',
        type: 'string (optional)',
        description: 'Mobile disclosure button label.',
      },
    ],
  },
  MarketingFooter: {
    use: 'Group real links and provide your own copyright and supporting text.',
    keyboard: 'Links use their native Tab and Enter behavior.',
    props: [
      { name: 'brand', type: 'ReactNode', description: 'Brand or home link.' },
      {
        name: 'groups',
        type: 'readonly { id, title, links }[]',
        description: 'Labelled groups of MarketingLink destinations.',
      },
      {
        name: 'copyright',
        type: 'ReactNode',
        description: 'Your legal text; no year or company is generated.',
      },
      { name: 'description', type: 'ReactNode (optional)', description: 'Short supporting text.' },
    ],
  },
  MarketingHero: {
    use: 'Lead with a clear page title and a preview of what your product does.',
    keyboard: 'Supplied actions retain native behavior. Heading level follows the page outline.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Main introduction heading.' },
      {
        name: 'headingLevel',
        type: '1 | 2 | 3 (optional)',
        description: 'Defaults to h1. Use 2 or 3 inside an existing page.',
      },
      { name: 'description', type: 'ReactNode (optional)', description: 'Short explanation.' },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'Your primary and secondary links or buttons.',
      },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description: 'Product preview beside the introduction.',
      },
      {
        name: 'note',
        type: 'ReactNode (optional)',
        description: 'Relevant terms or context beside the actions.',
      },
    ],
  },
  MarketingFeatures: {
    use: 'Describe a small set of features you actually provide.',
    keyboard: 'Any supplied links retain native behavior.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Section h2.' },
      {
        name: 'items',
        type: 'readonly MarketingFeature[]',
        description: 'Stable ID, title, description and optional decorative icon.',
      },
      { name: 'description', type: 'ReactNode (optional)', description: 'Section introduction.' },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description: 'Additional content near the section heading.',
      },
    ],
  },
  MarketingPricing: {
    use: 'Show your actual plans and terms. Price content is display-only; your application owns checkout.',
    keyboard: 'Each supplied plan action keeps its native behavior.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Section h2.' },
      {
        name: 'plans',
        type: 'readonly MarketingPlan[]',
        description: 'IDs, titles, descriptions, display prices, feature lists and action slots.',
      },
      {
        name: 'note',
        type: 'ReactNode (optional)',
        description: 'Plan terms or important billing context.',
      },
    ],
  },
  MarketingFAQ: {
    use: 'Supply useful questions and visible answers through the shared Accordion.',
    keyboard: 'Enter/Space toggles; arrows, Home and End move between enabled questions.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Section h2.' },
      {
        name: 'items',
        type: 'readonly AccordionItem[]',
        description: 'Question titles and answer content.',
      },
      { name: 'value', type: 'string (optional)', description: 'Controlled open question.' },
      {
        name: 'onValueChange',
        type: '(value: string) => void (optional)',
        description: 'Update the controlled open question.',
      },
    ],
  },
  MarketingContact: {
    use: 'Compose labelled fields inside the form. Your app validates, submits and supplies feedback.',
    keyboard: 'Native form validation and supplied controls retain their behavior.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Form heading.' },
      { name: 'children', type: 'ReactNode (optional)', description: 'Your labelled fields.' },
      {
        name: 'onSubmit',
        type: 'FormEventHandler<HTMLFormElement> (optional)',
        description: 'Handle submission and its actual result.',
      },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'Submit or supporting actions. Use form association when needed.',
      },
      {
        name: 'feedback',
        type: '{ tone: info | error | success; message: ReactNode } (optional)',
        description:
          'Reported outcome. Local draft preparation is information, not a sent message.',
      },
      {
        name: 'aside',
        type: 'ReactNode (optional)',
        description: 'Contact context alongside the form.',
      },
    ],
  },
  MarketingArticle: {
    use: 'Supply your own article content, author/date metadata and related actions.',
    keyboard: 'Body links and actions retain their native behavior.',
    props: [
      { name: 'title', type: 'ReactNode', description: 'Article h2.' },
      {
        name: 'children',
        type: 'ReactNode (optional)',
        description: 'Safe React article content.',
      },
      {
        name: 'meta',
        type: 'ReactNode (optional)',
        description: 'Author, date or other supplied context.',
      },
      {
        name: 'actions',
        type: 'ReactNode (optional)',
        description: 'Related links or article actions.',
      },
    ],
  },
} satisfies { [Name in keyof APIs]: Guide<APIs[Name]> };

export function optionalGuidance(name: string) {
  return Object.hasOwn(guides, name) ? guides[name as keyof typeof guides] : undefined;
}
