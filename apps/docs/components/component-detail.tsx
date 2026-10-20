'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Tabs, Select, CopyButton } from '@stackunseen/ui';
import type { CatalogEntry } from '../lib/catalog';
import { catalogStyles } from '../lib/catalog';
import type { GalleryLocation } from '../lib/gallery-location';
import { Specimen } from './specimen';
import { markdownStates } from '../lib/markdown-fixtures';
import { partStates } from '../lib/message-parts-fixtures';
import { emulatorStates } from '../lib/terminal-fixtures';
import { componentGuidance, rendererPeers } from '../lib/component-guidance';
import { isReleaseComponent } from '../lib/first-release';
import { catalog } from '../lib/catalog';
import { navigationGroup } from '../lib/gallery-navigation';
import { componentHref } from '../lib/site-paths';
import { tasksFor } from '../lib/tasks';
import { componentImport } from '../lib/component-import';
import { guidanceFor } from '../lib/usage-guidance';
import { patternsUsing } from '../lib/pattern-usage';
import { registryCommand, registryItemsFor } from '../lib/registry-items';

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
}: {
  entry: CatalogEntry;
  location: GalleryLocation;
  onChange: (patch: Partial<GalleryLocation>) => void;
  /** Previous and next links, shown beside the title. */
  pagination?: ReactNode;
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
  const when = guidanceFor(entry.name);
  const setVariant = (state: string) => onChange({ state });
  const setPresentation = (style: string) => onChange({ style });
  const setCompare = (compare: boolean) => onChange({ compare });
  const setTab = (tab: string) => onChange({ tab: tab === 'code' ? 'code' : 'preview' });
  const rich =
    ['Message', 'StreamingResponse'].includes(entry.name) && markdownStates.includes(variant);
  const structured = entry.name === 'Message' && partStates.includes(variant);
  const highlightedCode =
    entry.name === 'MarkdownCodeBlock' && !['Default', 'Long code', 'Empty'].includes(variant);
  const advancedForm =
    entry.name === 'AIForm' &&
    !['Default', 'Validation', 'Pending', 'Complete', 'Error'].includes(variant);
  const highlightedDiff = entry.name === 'CodeDiff' && variant !== 'Default';
  const emulatedTerminal = entry.name === 'TerminalOutput' && emulatorStates.includes(variant);
  const code =
    entry.name === 'Modal' && variant === 'Custom header and footer'
      ? `<Modal layout="${presentation}" open={open} onOpenChange={setOpen}\n  title="Project details" description="Review the local sample project."\n  trigger={<Button>Open details</Button>}\n  header={<div><strong>Project details</strong><span>Local draft</span></div>}\n  footer={<Button onClick={() => setOpen(false)}>Done</Button>}\n>\n  {content}\n</Modal>`
      : emulatedTerminal
        ? `<TerminalEmulator variant="${presentation}" output={snapshot.output} state={snapshot.state} context={snapshot.context} status={snapshot.status} connection={connection} submission={submission} inputEnabled={inputEnabled} onInput={requestInput} onResize={requestResize} onRequestStop={requestStop} onRequestClear={requestClear} />`
        : advancedForm
          ? `<AIForm variant="${presentation}" fields={fields} values={values} onValueChange={setValues} arrays={arrays} arrayValues={arrayValues} onArrayChange={requestArrayChange} steps={steps} step={step} onStepChange={setStep} identity={formIdentity} onSubmit={requestSubmission} status={status} receipt={receipt} />`
          : highlightedDiff
            ? `<HighlightedCodeDiff variant="${presentation}" path={path} before={before} after={after} baseVersion={baseVersion} nextVersion={nextVersion} language={language} status={status} />`
            : highlightedCode
              ? `<HighlightedCodeBlock variant="${presentation}" code={code} language={language} streaming={streaming} />`
              : structured
                ? `import { renderMarkdownPart } from '@stackunseen/ui/markdown';\n\n<Message renderTextPart={renderMarkdownPart} variant="${presentation}" value={message}\n  sources={sources} tools={tools} attachments={attachments}\n/>`
                : rich
                  ? `import { MarkdownResponse } from '@stackunseen/ui/markdown';\n\n${entry.name === 'Message' ? `<Message variant="${presentation}" value={message}\n  renderContent={({ text, state }) => <MarkdownResponse text={text ?? ''} state={state} />}\n/>` : `<MarkdownResponse variant="${presentation}" text={text} state={state} />`}`
                  : entry.presentationProp === null
                    ? entry.code
                    : entry.code.replace(
                        `<${entry.name}`,
                        `<${entry.name} ${entry.presentationProp ?? 'variant'}="${presentation}"`,
                      );
  const module = emulatedTerminal
    ? '/terminal'
    : highlightedCode || highlightedDiff
      ? '/highlight'
      : entry.name === 'MarkdownCodeBlock'
        ? '/code'
        : entry.name === 'MarkdownResponse'
          ? '/markdown'
          : entry.name === 'MathFormula'
            ? '/math'
            : entry.name === 'MermaidDiagram'
              ? '/mermaid'
              : entry.name === 'RichMarkdownResponse'
                ? '/rich-markdown'
                : (entry.importPath ?? '');
  const mathStyles =
    module === '/math' ||
    module === '/rich-markdown' ||
    (module === '/mermaid' && ['Math labels', 'Sequence math'].includes(variant));
  const optionalStyles =
    module === '/application' ||
    module === '/marketing' ||
    module === '/navigation' ||
    module === '/conversation-flow' ||
    module === '/mcp-apps' ||
    module === '/chat'
      ? `import '@stackunseen/ui${module}.css';\n`
      : '';
  const peers = rendererPeers[rich || structured ? '/markdown' : module];
  const importLine = `import { ${emulatedTerminal ? 'TerminalEmulator' : highlightedDiff ? 'HighlightedCodeDiff' : highlightedCode ? 'HighlightedCodeBlock' : componentImport(entry).exportName} } from '@stackunseen/ui${module}';`;
  const [manager, setManager] = useState<Manager>('npm');
  useEffect(() => setManager(storedManager()), []);
  const packages = `@stackunseen/ui${peers?.length ? ` ${peers.join(' ')}` : ''}`;
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
  const usage = `${rich && entry.name === 'StreamingResponse' ? '' : `import { ${emulatedTerminal ? 'TerminalEmulator' : highlightedDiff ? 'HighlightedCodeDiff' : highlightedCode ? 'HighlightedCodeBlock' : entry.name} } from '@stackunseen/ui${module}';\n`}${entry.relatedImports?.length ? `import { ${entry.relatedImports.join(', ')} } from '@stackunseen/ui';\n` : ''}import '@stackunseen/ui/styles.css';\n${optionalStyles}${emulatedTerminal ? "import '@stackunseen/ui/terminal.css';\n" : ''}${mathStyles ? "import 'katex/dist/katex.min.css';\n" : ''}\n${code}`;
  const [copied, setCopied] = useState<{ usage: string; message: string }>();
  const copyRequest = useRef(0);
  useEffect(
    () => () => {
      copyRequest.current += 1;
    },
    [usage],
  );
  async function copyUsage() {
    const attempt = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(usage);
      if (copyRequest.current === attempt) setCopied({ usage, message: 'Copied example.' });
    } catch {
      if (copyRequest.current === attempt)
        setCopied({ usage, message: 'Clipboard unavailable. Select the code to copy.' });
    }
  }
  const pageMarkdown = [
    `# ${entry.name}`,
    '',
    entry.description,
    '',
    '## Installation',
    '',
    '```bash',
    installLine,
    ...starters.map((item) => registryCommand(item)),
    '```',
    '',
    '## Usage',
    '',
    '```tsx',
    usage,
    '```',
    ...(guidance
      ? [
          '',
          '## Props',
          '',
          ...guidance.props.map(
            (prop) => `- \`${prop.name}\` (\`${prop.type}\`): ${prop.description}`,
          ),
        ]
      : []),
    '',
    `Source: https://unseenui.com${componentHref(entry.name)}`,
  ].join('\n');
  const sections = [
    ['component-example', 'Preview'],
    ['component-install', 'Installation'],
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
              {pagination}
            </div>
          </div>
          <p>{entry.description}</p>
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
            <Button variant="ghost" onClick={() => setReset((value) => value + 1)}>
              <RotateCcw size={15} aria-hidden="true" /> Reset example
            </Button>
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
                    <div className="preview-canvas">
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
                    </div>
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
                    <pre role="group" tabIndex={0} aria-label={`${entry.name} usage example`}>
                      <code>{usage}</code>
                    </pre>
                    <Button variant="outline" onClick={() => void copyUsage()}>
                      Copy usage
                    </Button>
                    <p role="status">{copied?.usage === usage ? copied.message : ''}</p>
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
              <Button size="sm" variant="ghost" onClick={() => void copyUsage()}>
                Copy usage
              </Button>
            </div>
          </div>
        </section>
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
          <p className="explorer-note">
            These are the main props for the example. The package's TypeScript declarations include
            the full API.
          </p>
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
            {' · '}
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
      </div>
      <nav className="detail-toc" aria-label="On this page">
        <p>On this page</p>
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
