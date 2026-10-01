import type { CatalogEntry } from './catalog';
import { websiteCatalog } from './website-catalog';

export const genericCatalog: CatalogEntry[] = [
  ...websiteCatalog,
  {
    name: 'Button',
    group: 'Foundations',
    category: 'Actions',
    description: 'A labelled action with consistent emphasis, size and keyboard behavior.',
    aliases: ['Action', 'Submit button', 'Primary button'],
    presentations: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    states: ['Default', 'Disabled', 'Busy', 'Small', 'Long label'],
    contract:
      'variant?: primary | secondary | outline | ghost | danger · size?: default | sm · native button props',
    responsibility:
      'Provide an explicit action label and choose emphasis by importance. Busy and disabled states come from your application.',
    keyboard:
      'Tab focuses an available button; Enter or Space activates it. Native disabled buttons are not focusable. This component defaults to type="button"; opt into type="submit" for forms.',
    code: '<Button onClick={saveChanges}>Save changes</Button>',
  },
  {
    name: 'IconButton',
    group: 'Foundations',
    category: 'Actions',
    description:
      'A compact icon action with a required accessible label and keyboard-visible hint.',
    aliases: ['Icon action', 'Toolbar button', 'Icon tooltip'],
    presentations: ['ghost', 'outline', 'primary', 'secondary', 'danger'],
    states: ['Default', 'Disabled', 'Toggle', 'Long label'],
    contract: 'label: string · icon: IconName · Button props except children, aria-label and size',
    responsibility:
      'Use familiar icons for secondary actions. Supply a meaningful label and keep consequential actions understandable in context.',
    keyboard:
      'Tab reveals the label hint. Enter or Space activates the button; Escape dismisses the hint. A toggle should expose aria-pressed.',
    code: '<IconButton icon="retry" label="Refresh records" onClick={refreshRecords} />',
  },
  {
    name: 'Modal',
    group: 'Overlays',
    category: 'Dialogs',
    relatedImports: ['Button'],
    description: 'A controlled modal dialog, side sheet or fullscreen task surface.',
    aliases: ['Dialog', 'Drawer', 'Sheet', 'Fullscreen dialog'],
    presentations: ['dialog', 'sheet', 'fullscreen'],
    presentationProp: 'layout',
    states: ['Default', 'Form', 'Long content'],
    contract: 'open · onOpenChange · title · description · trigger · children · layout?',
    responsibility:
      'Keep visibility and draft values controlled. Sheet and fullscreen are Modal layouts, not separate exported components.',
    keyboard:
      'Opening moves focus into the dialog. Tab remains inside; Escape closes it and returns focus to the trigger. The title and description name the task.',
    code: '<Modal open={open} onOpenChange={setOpen} title="Project details" description="Review the selected project." trigger={<Button>Open details</Button>}>{content}</Modal>',
  },
  {
    name: 'Panel',
    group: 'Layout',
    category: 'Surfaces',
    description: 'A reusable section surface for related content and actions.',
    aliases: ['Section', 'Container', 'Surface'],
    presentations: ['default'],
    presentationProp: null,
    states: ['Default', 'With actions', 'Long content'],
    contract: 'Native section props · children · className?',
    responsibility:
      'Supply the heading and accessible name when the section needs a landmark. Panel does not introduce a new state or variant API.',
    keyboard:
      'The section is not an extra tab stop. Its nested links and controls follow normal document order.',
    code: '<Panel aria-labelledby="project-title"><h2 id="project-title">Project overview</h2><p>{summary}</p></Panel>',
  },
  {
    name: 'PanelHeader',
    group: 'Layout',
    category: 'Panel composition',
    relatedImports: ['Button'],
    description: 'A heading, supporting context and adjacent actions for a panel.',
    aliases: ['Section header', 'Panel title', 'Action header'],
    presentations: ['default'],
    presentationProp: null,
    importPath: '/workspace',
    states: ['Default', 'With actions', 'With status', 'Long title'],
    contract:
      'title · description? · leading? · status? · actions? · actionsLabel? · headingLevel?',
    responsibility:
      'Choose the heading level for the surrounding document. Keep actions relevant to this panel.',
    keyboard:
      'Actions use native Tab order; the action group does not claim toolbar arrow-key behavior.',
    code: '<PanelHeader title="Project overview" description="Current project information" headingLevel={2} actions={<Button variant="outline">Edit project</Button>} />',
  },
  {
    name: 'Sidecar',
    group: 'Layout',
    category: 'Inspectors',
    relatedImports: ['Button'],
    description: 'A controlled inspector that can dock, float or become a modal drawer.',
    aliases: ['Inspector', 'Drawer', 'Sheet', 'Sidebar', 'Docked panel'],
    presentations: ['docked', 'drawer', 'overlay'],
    presentationProp: 'presentation',
    importPath: '/sidecar',
    states: ['Default', 'Start side', 'Long content'],
    contract:
      'open · onOpenChange · title · children · trigger? · presentation? · side? · mobileBreakpoint?',
    responsibility:
      'Own visibility and drafts. Docked/overlay panels become drawers at the configured viewport breakpoint; moving between parents can remount content.',
    keyboard:
      'The trigger opens the inspector. Modal drawers contain focus and Escape returns it to the opener. Non-modal panels allow working elsewhere.',
    code: '<Sidecar open={open} onOpenChange={setOpen} title="Document details" trigger={<Button>Inspect document</Button>}>{details}</Sidecar>',
  },
  {
    name: 'SplitPane',
    group: 'Layout',
    category: 'Resizable layouts',
    description: 'Two controlled panes with keyboard resizing and a responsive stacked layout.',
    aliases: ['Resizable panels', 'Splitter', 'Split view'],
    presentations: ['responsive', 'split', 'stacked'],
    presentationProp: 'presentation',
    importPath: '/layout',
    states: ['Default', 'Read-only', 'Collapsed secondary', 'Long content'],
    contract:
      'label · primary · secondary · sizes: readonly [number, number] · onSizesChange? · presentation? · orientation? · disabled?',
    responsibility:
      'Keep sizes in application state and supply bounded container space. Collapsing a pane unmounts its content; persist drafts above it.',
    keyboard:
      'Tab reaches the named separator. Arrow keys resize along its orientation; keyboard resizing requests controlled sizes just like pointer resizing.',
    code: '<SplitPane label="Document workspace" primary={documentPane} secondary={detailsPane} sizes={sizes} onSizesChange={setSizes} />',
  },
  {
    name: 'WorkspaceShell',
    group: 'Layout',
    category: 'Application layouts',
    description:
      'Named header, navigation, content, inspector and footer slots in one responsive workspace.',
    aliases: ['App shell', 'Application shell', 'Dashboard layout'],
    presentations: ['workspace', 'contained', 'compact'],
    importPath: '/workspace',
    states: ['Default', 'With inspector', 'Minimal', 'Long content'],
    contract:
      'main · header? · navigation? · inspector? · footer? · mainAs? · scrollMode? · variant?',
    responsibility:
      'Supply real navigation and control visibility. Use mainAs="section" when embedding inside another main landmark.',
    keyboard:
      'Slot controls retain document Tab order. Flow mode shares page scrolling; panes mode requires a bounded height and named reading regions.',
    code: '<WorkspaceShell label="Project workspace" mainAs="section" header={header} navigation={navigation} main={content} inspector={inspector} />',
  },
];
export const genericNames = new Set<string>(genericCatalog.map((entry) => entry.name));
