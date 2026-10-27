'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FileTextIcon, MoonIcon, ResetIcon, SunIcon } from '@radix-ui/react-icons';
import { AITheme, Button, Tabs, Select, CopyButton } from '@stackunseen/ui';
import { TableOfContents } from '@stackunseen/ui/navigation';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';
import '@stackunseen/ui/navigation.css';
import type { CatalogEntry } from '../lib/catalog';
import { catalogStyles } from '../lib/catalog';
import type { GalleryLocation } from '../lib/gallery-location';
import { Specimen } from './specimen';
import { componentGuidance } from '../lib/component-guidance';
import { isReleaseComponent } from '../lib/first-release';
import { catalog } from '../lib/catalog';
import { navigationGroup } from '../lib/gallery-navigation';
import { componentHref, componentSlug } from '../lib/site-paths';
import { PropsTable } from './props-table';
import { ComponentAnatomy } from './component-anatomy';
import { InlineCode } from './inline-code';
import { componentAnatomy } from '../lib/component-anatomy';
import { componentMarkdown } from '../lib/component-markdown';
import { componentUsage } from '../lib/component-usage';
import { tasksFor } from '../lib/tasks';
import { guidanceFor } from '../lib/usage-guidance';
import { patternsUsing } from '../lib/pattern-usage';
import { registryCommand, registryItemsFor, registryOrigin } from '../lib/registry-items';
import { behaviourNotes } from '../lib/behaviour-notes';

const managers = [
  ['pnpm', 'pnpm add'],
  ['npm', 'npm install'],
  ['yarn', 'yarn add'],
  ['bun', 'bun add'],
] as const;
type Manager = (typeof managers)[number][0];
function storedManager(): Manager {
  try {
    const value = localStorage.getItem('unseen-ui-package-manager');
    return managers.some(([name]) => name === value) ? (value as Manager) : 'npm';
  } catch {
    return 'npm';
  }
}

/**
 * Small components read best centred on the stage. A fixed list, not a measurement: measuring
 * drawn content misjudged lazy-loading previews and collapsed full-width ones.
 */
const centredPreviews = new Set([
  'Button',
  'IconButton',
  'CopyButton',
  'StatusBadge',
  'Tag',
  'Chip',
  'Avatar',
  'Switch',
  'Checkbox',
  'ToggleGroup',
  'AppearanceToggle',
  'Tooltip',
  'Popover',
  'DropdownMenu',
  'Modal',
  'AlertDialog',
  'Toast',
  'ShareMenu',
  'LoadingIndicator',
  'Persona',
  'Stepper',
  'ModelSelector',
  'MessageActions',
  'ProvenanceBadge',
  'BackgroundStatus',
  'ArtifactPanel',
  'RadioGroup',
  'NavigationMenu',
  'Breadcrumb',
  'CommandPalette',
  'Matrix',
  'Pagination',
  'InputGroup',
  'Image',
  'BranchSwitcher',
  'Sidecar',
  'UsageMeter',
  'Kbd',
  'TonePad',
  'FollowUps',
]);

// Rows and disclosures that grow when opened: a centred column keeps them from jumping sideways.
const columnPreviews = new Set([
  'ToolCall',
  'ToolGroup',
  'Sources',
  'ChainOfThought',
  'SubagentTree',
  'TableOfContents',
  'Citation',
]);

export function ComponentDetail({
  entry,
  location,
  onChange,
  pagination,
  pager,
}: {
  entry: CatalogEntry;
  location: GalleryLocation;
  onChange: (patch: Partial<GalleryLocation>) => void;
  /** Previous and next links, shown beside the title. */
  pagination?: ReactNode;
  /** The same links with names, at the end of the page. */
  pager?: ReactNode;
}) {
  const styles = catalogStyles(entry);
  const guidance = componentGuidance(entry.name);
  const integrationNote =
    entry.name === 'Button'
      ? '' // Pending state and activation are already covered in the prop descriptions.
      : entry.name === 'Input'
        ? 'Validate submitted values on the server.'
        : entry.name === 'Modal'
          ? 'Choose dialog, sheet or fullscreen with the layout prop.'
          : entry.responsibility;
  const { state: variant, style: presentation, compare, tab } = location;
  const [reset, setReset] = useState(0);
  const [allStates, setAllStates] = useState(false);
  // The preview's own light or dark, apart from the page; undefined follows the page.
  const [previewMode, setPreviewMode] = useState<'light' | 'dark' | undefined>();
  const when = guidanceFor(entry.name);
  const setVariant = (state: string) => onChange({ state });
  const setPresentation = (style: string) => onChange({ style });
  const setCompare = (compare: boolean) => onChange({ compare });
  const setTab = (tab: string) => onChange({ tab: tab === 'code' ? 'code' : 'preview' });
  const { module, optionalStyles, peers, importLine, usage, packages } = componentUsage(
    entry,
    variant,
    presentation,
  );
  const [manager, setManager] = useState<Manager>('npm');
  useEffect(() => setManager(storedManager()), []);
  const installLine = `${managers.find(([name]) => name === manager)![1]} ${packages}`;
  const usedIn = patternsUsing(entry.name);
  const starters = registryItemsFor[entry.name] ?? [];
  const tasks = tasksFor(entry.name);
  const siblings = catalog
    .filter(
      (item) =>
        item.name !== entry.name &&
        isReleaseComponent(item) &&
        navigationGroup(item) === navigationGroup(entry),
    )
    .slice(0, 8);
  const anatomy = componentAnatomy[entry.name];
  const pageMarkdown = componentMarkdown({ entry, installLine, usage, origin: registryOrigin });
  const sections = [
    ['component-example', 'Preview'],
    ['component-install', 'Installation'],
    ...(anatomy ? [['component-parts', 'Parts']] : []),
    ['component-props', 'Usage and props'],
    ['component-customization', 'Keyboard and customization'],
    ...(tasks.length > 0 || siblings.length > 0 ? [['component-related', 'Works with']] : []),
  ];
  return (
    <div className="detail-page detail-layout">
      <div className="detail-main">
        <div className="detail-heading">
          <div className="detail-title-row">
            <h1>{entry.name}</h1>
            <div className="detail-title-actions">
              <CopyButton size="sm" variant="outline" value={pageMarkdown} label="Copy page" />
              {/* The same page as a Markdown file, with every prop, for coding agents. */}
              <Button
                size="sm"
                variant="outline"
                href={`/llms/${componentSlug(entry.name)}.md`}
                className="detail-markdown-link"
              >
                <FileTextIcon width={15} height={15} aria-hidden="true" />
                Markdown
              </Button>
              {pagination}
            </div>
          </div>
          <p>{entry.description}</p>
          {behaviourNotes[entry.name] && (
            <div className="detail-notes">
              <h2>Good to know</h2>
              <ul>
                {behaviourNotes[entry.name]!.map((note) => (
                  <li key={note}>
                    <InlineCode text={note} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {usedIn.length > 0 && (
            <p className="detail-used-in">
              Used in{' '}
              {usedIn.slice(0, 3).map((pattern, index, shown) => (
                <span key={pattern.href}>
                  {index > 0 && (index === shown.length - 1 && usedIn.length <= 3 ? ' and ' : ', ')}
                  <Link prefetch={false} href={pattern.href}>
                    {pattern.label}
                  </Link>
                </span>
              ))}
              {usedIn.length > 3 && (
                <>
                  {' and '}
                  <Link prefetch={false} href="/patterns/">
                    {usedIn.length - 3} more patterns
                  </Link>
                </>
              )}
              .
            </p>
          )}
          {when && (
            <dl className="detail-when" aria-label="When to use it">
              <div>
                <dt>Use it for</dt>
                <dd>{when.use}</dd>
              </div>
              <div>
                <dt>Not for</dt>
                <dd>
                  {when.avoid}
                  {when.instead.length > 0 && (
                    <>
                      {' '}
                      Try{' '}
                      {when.instead.map((name, index) => (
                        <span key={name}>
                          {index > 0 && (index === when.instead.length - 1 ? ' or ' : ', ')}
                          <Link prefetch={false} href={componentHref(name)}>
                            {name}
                          </Link>
                        </span>
                      ))}
                      .
                    </>
                  )}
                </dd>
              </div>
            </dl>
          )}
          {!isReleaseComponent(entry) && (
            <p className="explorer-note">
              This example combines existing controls into an application or website section. It is
              kept here for existing links and is separate from the first-release component catalog.
            </p>
          )}
        </div>
        <div id="component-example" className="component-anchor detail-frame">
          <div className="detail-toolbar">
            <label>
              Style
              <Select
                value={presentation}
                disabled={styles.length === 1}
                onValueChange={setPresentation}
                aria-label="Presentation style"
                options={styles.map((value) => ({
                  value,
                  label: value.charAt(0).toUpperCase() + value.slice(1),
                }))}
              />
            </label>
            <label>
              State
              <Select
                value={variant}
                onValueChange={setVariant}
                aria-label="Fixture state"
                options={entry.states.map((state) => ({ value: state, label: state }))}
              />
            </label>
            {styles.length > 1 && (
              <Button
                variant="outline"
                aria-pressed={compare}
                onClick={() => {
                  setAllStates(false);
                  setCompare(!compare);
                }}
              >
                {compare ? 'Show selected style' : `Compare ${styles.length} styles`}
              </Button>
            )}
            {entry.states.length > 1 && (
              <Button
                variant="outline"
                aria-pressed={allStates}
                onClick={() => {
                  if (!allStates && compare) setCompare(false);
                  setAllStates(!allStates);
                }}
              >
                {allStates ? 'Show selected state' : `All ${entry.states.length} states`}
              </Button>
            )}
          </div>
          <Tabs
            label="Component example"
            value={tab}
            onValueChange={setTab}
            items={[
              {
                value: 'preview',
                label: 'Preview',
                content: (
                  <>
                    <AITheme
                      appearance={previewMode}
                      className="preview-canvas"
                      data-preview-mode={previewMode}
                    >
                      <div className="preview-rail" role="group" aria-label="Preview options">
                        <button
                          type="button"
                          className="preview-rail-button"
                          aria-label="Preview in light mode"
                          aria-pressed={previewMode === 'light'}
                          onClick={() =>
                            setPreviewMode((mode) => (mode === 'light' ? undefined : 'light'))
                          }
                        >
                          <SunIcon width={15} height={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="preview-rail-button"
                          aria-label="Preview in dark mode"
                          aria-pressed={previewMode === 'dark'}
                          onClick={() =>
                            setPreviewMode((mode) => (mode === 'dark' ? undefined : 'dark'))
                          }
                        >
                          <MoonIcon width={15} height={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="preview-rail-button"
                          aria-label="Reset example"
                          onClick={() => setReset((value) => value + 1)}
                        >
                          <ResetIcon width={15} height={15} aria-hidden="true" />
                        </button>
                      </div>
                      <div
                        data-fit={
                          compare || allStates
                            ? undefined
                            : centredPreviews.has(entry.name)
                              ? 'content'
                              : columnPreviews.has(entry.name)
                                ? 'column'
                                : undefined
                        }
                        className={compare || allStates ? 'variant-comparison' : 'detail-specimen'}
                      >
                        {!compare && !allStates && (
                          <h2 className="sr-only">{entry.name} preview</h2>
                        )}
                        {allStates && !compare ? (
                          entry.states.map((state) => (
                            <section className="variant-example" key={state}>
                              <h2>{state}</h2>
                              <Specimen
                                key={`${state}:${presentation}:${reset}`}
                                name={entry.name}
                                variant={state}
                                presentation={presentation}
                              />
                            </section>
                          ))
                        ) : compare ? (
                          styles.map((style) => (
                            <section className="variant-example" key={style}>
                              <h2>{style.charAt(0).toUpperCase() + style.slice(1)}</h2>
                              <Specimen
                                key={`${variant}:${reset}`}
                                name={entry.name}
                                variant={variant}
                                presentation={style}
                              />
                            </section>
                          ))
                        ) : (
                          <Specimen
                            key={`${variant}:${presentation}:${reset}`}
                            name={entry.name}
                            variant={variant}
                            presentation={presentation}
                          />
                        )}
                      </div>
                    </AITheme>
                    {(compare || allStates) && (
                      <p className="preview-caption">
                        {compare
                          ? 'Styles start with the same data; interactions are independent.'
                          : 'Every documented state with the same style; interactions are independent.'}
                      </p>
                    )}
                  </>
                ),
              },
              {
                value: 'code',
                label: 'Code',
                content: (
                  <div className="code-example">
                    <HighlightedCodeBlock code={usage} language="tsx" />
                    <small>
                      Supply values and callbacks from your app. For runnable examples, see{' '}
                      <code>examples/consumer</code> and <code>apps/docs/components</code>.
                    </small>
                    {peers && (
                      <p className="renderer-dependencies">
                        Optional peers for this example: <code>{peers.join(', ')}</code>.{' '}
                        <Link href="/getting-started/#optional-renderers">
                          Installation and stylesheet guide
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
        <section
          id="component-install"
          className="api-section component-anchor detail-install-section"
          aria-labelledby="component-install-title"
        >
          <h2 id="component-install-title">Installation</h2>
          <div className="detail-install" aria-label="Install and import">
            <div className="detail-install-managers" role="group" aria-label="Package manager">
              {managers.map(([name]) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={manager === name}
                  onClick={() => {
                    setManager(name);
                    try {
                      localStorage.setItem('unseen-ui-package-manager', name);
                    } catch {
                      // Storage can be unavailable; the choice still applies to this page.
                    }
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="detail-install-row">
              <code>{installLine}</code>
              <CopyButton
                size="sm"
                variant="ghost"
                value={installLine}
                label="Copy install command"
                iconOnly
              />
            </div>
            {starters.map((item) => (
              <div className="detail-install-row" key={item}>
                <code>{registryCommand(item)}</code>
                <CopyButton
                  size="sm"
                  variant="ghost"
                  value={registryCommand(item)}
                  label={`Copy shadcn command for ${item}`}
                  iconOnly
                />
              </div>
            ))}
            <div className="detail-install-row">
              <code>{importLine}</code>
              <CopyButton
                size="sm"
                variant="ghost"
                value={importLine}
                label="Copy import"
                iconOnly
              />
            </div>
            <div className="detail-install-row">
              <span>
                Styles: <code>@stackunseen/ui/styles.css</code>
                {optionalStyles ? (
                  <>
                    {' and '}
                    <code>{`@stackunseen/ui${module}.css`}</code>
                  </>
                ) : null}
              </span>
              <CopyButton size="sm" variant="ghost" value={usage} label="Copy usage" />
            </div>
          </div>
        </section>
        {anatomy && (
          <section
            id="component-parts"
            className="api-section component-anchor"
            aria-labelledby="component-parts-title"
          >
            <h2 id="component-parts-title">Parts</h2>
            <ComponentAnatomy name={entry.name} anatomy={anatomy} />
          </section>
        )}
        <section
          id="component-props"
          className="api-section component-anchor"
          aria-labelledby="component-props-title"
        >
          <h2 id="component-props-title">Usage and props</h2>
          {optionalStyles && (
            <p>
              Import this component from <code>{`@stackunseen/ui${module}`}</code>. Load{' '}
              <code>@stackunseen/ui/styles.css</code> first, then{' '}
              <code>{`@stackunseen/ui${module}.css`}</code>.
            </p>
          )}
          <p className="component-guidance">
            {guidance?.use}
            {guidance && integrationNote ? ' ' : ''}
            {integrationNote}
          </p>
          {guidance ? (
            <dl className="component-prop-list">
              {guidance.props.map((prop) => (
                <div key={prop.name}>
                  <dt>
                    <code>{prop.name}</code>
                    <span>
                      <code>{prop.type}</code>
                    </span>
                  </dt>
                  <dd>{prop.description}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="component-signature">
              <h3>Supported inputs</h3>
              <p>
                This is the public signature used by this example. Open Code to see how the values
                and callbacks fit together.
              </p>
              <pre tabIndex={0} role="group" aria-label={`${entry.name} supported inputs`}>
                <code>{entry.contract}</code>
              </pre>
            </div>
          )}
          <div className="props-guide-actions">
            <Button
              variant="outline"
              onClick={() => {
                setTab('code');
                document.getElementById('component-example')?.scrollIntoView();
              }}
            >
              See the code example
            </Button>
            <Link href="/docs/integration/">How state and callbacks work</Link>
            {['Modal', 'AlertDialog', 'Card'].includes(entry.name) && (
              <Link href="/docs/customization/#custom-headers-and-footers">
                Custom headers and footers
              </Link>
            )}
          </div>
          <PropsTable slug={componentSlug(entry.name)} />
        </section>
        <section
          id="component-customization"
          className="api-section component-anchor"
          aria-labelledby="component-customization-title"
        >
          <h2 id="component-customization-title">Keyboard and customization</h2>
          <h3>Keyboard</h3>
          <p className="component-guidance">
            {entry.keyboard ??
              guidance?.keyboard ??
              'Tab reaches controls; Enter or Space activates buttons. Accordions use arrow keys, Home and End. Select menus support arrows and typeahead; Escape closes menus and dialogs and restores focus.'}
          </p>
          <h3>Customization</h3>
          <p className="component-guidance">
            Change shared colors, spacing, corners and icons with the theme. Use the component's
            supported props to adapt its content and layout.{' '}
            <Link href="/docs/customization/">Customization guide</Link>
            {' and '}
            <Link href="/customize/">Theme Studio</Link>
          </p>
        </section>
        {(tasks.length > 0 || siblings.length > 0) && (
          <section
            id="component-related"
            className="api-section component-anchor detail-related"
            aria-labelledby="component-related-title"
          >
            <h2 id="component-related-title">Works with</h2>
            {tasks.map((task) => (
              <div className="detail-related-group" key={task.id}>
                <h3>{task.label}</h3>
                <p className="component-guidance">{task.description}</p>
                <ul className="detail-related-links">
                  {task.components
                    .filter((name) => name !== entry.name)
                    .map((name) => (
                      <li key={name}>
                        <Link prefetch={false} href={componentHref(name)}>
                          {name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {siblings.length > 0 && (
              <div className="detail-related-group">
                <h3>Same group: {navigationGroup(entry)}</h3>
                <ul className="detail-related-links">
                  {siblings.map((item) => (
                    <li key={item.name}>
                      <Link prefetch={false} href={componentHref(item.name)}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
        {pager}
      </div>
      <TableOfContents
        variant="track"
        className="detail-toc"
        collapsible="never"
        headingLevel={2}
        items={sections.map(([id, label]) => ({ id: id!, title: label }))}
      />
    </div>
  );
}
