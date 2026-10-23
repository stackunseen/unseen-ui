import type { CatalogEntry } from './catalog';
import { websiteCatalog } from './website-catalog';
import { applicationCatalog, marketingCatalog } from './optional-catalog';
import { aiExtrasCatalog } from './ai-extras-catalog';

export const genericCatalog: CatalogEntry[] = [
  ...websiteCatalog,
  ...applicationCatalog,
  ...marketingCatalog,
  ...aiExtrasCatalog,
  {
    name: 'Button',
    group: 'Actions',
    category: 'Actions',
    description: 'A labeled action in a few sizes and levels of emphasis.',
    aliases: ['Action', 'Submit button', 'Primary button', 'Link button', 'Call to action'],
    presentations: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link'],
    states: ['Default', 'Disabled', 'Busy', 'Small', 'Long label', 'Link'],
    contract:
      'variant?: primary | secondary | outline | ghost | danger | link · size?: default | sm · href? target? rel? (renders a link) · native button props',
    responsibility:
      'Use a label that says what happens, and match the emphasis to how important the action is. Your app decides when it’s busy or disabled.',
    keyboard:
      'Tab focuses an available button; Enter or Space activates it. Native disabled buttons are not focusable. This component defaults to type="button"; opt into type="submit" for forms.',
    code: '<Button onClick={saveChanges}>Save changes</Button>',
  },
  {
    name: 'IconButton',
    group: 'Actions',
    category: 'Actions',
    description: 'An icon-only button with a required label, shown as a hint on hover and focus.',
    aliases: ['Icon action', 'Toolbar button', 'Icon tooltip'],
    presentations: ['ghost', 'outline', 'primary', 'secondary', 'danger'],
    states: ['Default', 'Disabled', 'Toggle', 'Long label'],
    contract: 'label: string · icon: IconName · Button props except children, aria-label and size',
    responsibility:
      'Use familiar icons for secondary actions and give each a clear label. Important actions deserve a visible word.',
    keyboard:
      'Tab reveals the label hint. Enter or Space activates the button; Escape dismisses the hint. A toggle should expose aria-pressed.',
    code: '<IconButton icon="retry" label="Refresh records" onClick={refreshRecords} />',
  },
  {
    name: 'Modal',
    group: 'Overlays',
    category: 'Dialogs',
    relatedImports: ['Button'],
    description: 'A dialog, side sheet or full-screen panel for a focused task.',
    aliases: ['Dialog', 'Drawer', 'Sheet', 'Fullscreen dialog'],
    presentations: ['dialog', 'sheet', 'fullscreen'],
    presentationProp: 'layout',
    states: ['Default', 'Form', 'Long content', 'Custom header and footer'],
    contract:
      'open · onOpenChange · title · description · trigger · children · layout? · header? · footer? · className? · style?',
    responsibility:
      'Keep whether it’s open, and any draft, in your app. Sheet and fullscreen are layouts of Modal, not separate components.',
    keyboard:
      'Opening moves focus into the dialog. Tab remains inside; Escape closes it and returns focus to the trigger. The title and description name the task.',
    code: '<Modal open={open} onOpenChange={setOpen} title="Project details" description="Review the selected project." trigger={<Button>Open details</Button>} footer={<Button onClick={() => setOpen(false)}>Done</Button>}>{content}</Modal>',
  },
  {
    name: 'Sidecar',
    group: 'Layout',
    category: 'Inspectors',
    relatedImports: ['Button'],
    description:
      'A drawer, sheet or inspector panel: docked beside content, floating over it, and a modal drawer or bottom sheet on small screens.',
    aliases: ['Inspector', 'Drawer', 'Sheet', 'Sidebar', 'Docked panel'],
    presentations: ['docked', 'drawer', 'overlay'],
    presentationProp: 'presentation',
    importPath: '/sidecar',
    states: ['Default', 'Start side', 'Long content', 'Beside a canvas'],
    contract:
      'open · onOpenChange · title · children · trigger? · presentation? · side? · mobileBreakpoint? · initialFocusRef? · returnFocusRef? · closeOnEscape? · inset?',
    responsibility:
      'Keep whether it’s open, and any drafts, in your app. Docked and floating panels turn into drawers on small screens, which can reset what’s inside, so keep drafts above it.',
    keyboard:
      'The trigger opens the inspector. Modal drawers contain focus and Escape returns it to the opener. An overlay inspector takes focus when it opens and closes on Escape from anywhere; docked panels allow working elsewhere.',
    code: '<Sidecar open={open} onOpenChange={setOpen} title="Document details" trigger={<Button>Inspect document</Button>}>{details}</Sidecar>',
  },
  {
    name: 'SplitPane',
    group: 'Layout',
    category: 'Resizable layouts',
    description:
      'Two panes side by side that you can resize, also from the keyboard, stacking on small screens.',
    aliases: ['Resizable panels', 'Splitter', 'Split view'],
    presentations: ['responsive', 'split', 'stacked'],
    presentationProp: 'presentation',
    importPath: '/layout',
    states: ['Default', 'Read-only', 'Collapsed secondary', 'Long content'],
    contract:
      'label · primary · secondary · sizes: readonly [number, number] · onSizesChange? · presentation? · orientation? · disabled?',
    responsibility:
      'Keep the sizes in your app and give it a container with a set height. Collapsing a pane removes its content, so keep drafts above it.',
    keyboard:
      'Tab reaches the named separator. Arrow keys resize along its orientation; keyboard resizing requests controlled sizes just like pointer resizing.',
    code: '<SplitPane label="Document workspace" primary={documentPane} secondary={detailsPane} sizes={sizes} onSizesChange={setSizes} />',
  },
  {
    name: 'WorkspaceShell',
    group: 'Layout',
    category: 'Application layouts',
    description:
      'A full app frame with header, navigation, content, inspector and footer areas that adapts to screen size.',
    aliases: ['App shell', 'Application shell', 'Dashboard layout'],
    presentations: ['workspace', 'contained', 'compact'],
    importPath: '/workspace',
    states: ['Default', 'Responsive navigation', 'With inspector', 'Minimal', 'Long content'],
    contract:
      'main · header? · navigation? · inspector? · footer? · mainAs? · scrollMode? · variant? · navigationMode?: inline | responsive · navigationOpen? · onNavigationOpenChange? · navigationBreakpoint? · headerPlacement?: span | main',
    responsibility:
      'Pass your real navigation and control which panels show. Use mainAs="section" when it sits inside another main region.',
    keyboard:
      'Slot controls retain document Tab order. Flow mode shares page scrolling; panes mode requires a bounded height and named reading regions. In responsive mode the toggle reports aria-expanded; a narrow drawer takes focus, closes on Escape, the scrim or a followed link, and returns focus to the toggle.',
    code: '<WorkspaceShell label="Project workspace" mainAs="section" header={header} navigation={navigation} main={content} inspector={inspector} />',
  },
];
export const genericNames = new Set<string>(genericCatalog.map((entry) => entry.name));
