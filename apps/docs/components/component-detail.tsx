'use client';
import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Tabs, Accordion, Select } from '@stackunseen/ui';
import type { CatalogEntry } from '../lib/catalog';
import { catalogStyles } from '../lib/catalog';
import type { GalleryLocation } from '../lib/gallery-location';
import { Specimen } from './specimen';
import { markdownStates } from '../lib/markdown-fixtures';
import { partStates } from '../lib/message-parts-fixtures';
import { emulatorStates } from '../lib/terminal-fixtures';
import { componentGuidance, rendererPeers } from '../lib/component-guidance';
import { isReleaseComponent } from '../lib/first-release';
export function ComponentDetail({
  entry,
  location,
  onChange,
}: {
  entry: CatalogEntry;
  location: GalleryLocation;
  onChange: (patch: Partial<GalleryLocation>) => void;
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
    module === '/application' || module === '/marketing'
      ? `import '@stackunseen/ui${module}.css';\n`
      : '';
  const peers = rendererPeers[rich || structured ? '/markdown' : module];
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
  return (
    <div className="detail-page">
      <div className="detail-heading">
        <div className="detail-kicker">
          <span>{isReleaseComponent(entry) ? entry.category : 'Composition example'}</span>
          <span className="alpha-chip">Experimental alpha</span>
        </div>
        <h1>{entry.name}</h1>
        <p>{entry.description}</p>
        {!isReleaseComponent(entry) && (
          <p className="explorer-note">
            This example combines existing controls into an application or website section. It is
            kept here for existing links and is separate from the first-release component catalog.
          </p>
        )}
        <nav className="detail-jump-links" aria-label="On this component page">
          <a href="#component-example">Example</a>
          <a href="#component-props">Usage and props</a>
          <a href="#component-customization">Customize</a>
        </nav>
      </div>
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
          <Button variant="outline" aria-pressed={compare} onClick={() => setCompare(!compare)}>
            {compare ? 'Show selected style' : `Compare ${styles.length} styles`}
          </Button>
        )}
        <Button variant="ghost" onClick={() => setReset((value) => value + 1)}>
          <RotateCcw size={15} aria-hidden="true" /> Reset example
        </Button>
      </div>
      <p className="explorer-note">Interactions use local sample data.</p>
      <div id="component-example" className="component-anchor">
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
                    <div className={compare ? 'variant-comparison' : 'detail-specimen'}>
                      {!compare && <h2 className="sr-only">{entry.name} preview</h2>}
                      {compare ? (
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
                  {compare && (
                    <p className="preview-caption">
                      Styles start with the same data; interactions are independent.
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
                      <a href="/getting-started/#optional-renderers">
                        Installation and stylesheet guide
                      </a>
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
              This is the public signature used by this example. Open Code to see how the values and
              callbacks fit together.
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
          <a href="/docs/integration/">How state and callbacks work</a>
          {['Modal', 'AlertDialog', 'Card'].includes(entry.name) && (
            <a href="/docs/customization/#custom-headers-and-footers">Custom headers and footers</a>
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
        <h2 id="component-customization-title">Customize and use with a keyboard</h2>
        <Accordion
          type="multiple"
          headingLevel={3}
          items={[
            {
              value: 'customization',
              title: 'Customization',
              content: (
                <p>
                  Change shared colors, spacing, corners and icons with the theme. Use the
                  component's supported props to adapt its content and layout.{' '}
                  <a href="/docs/customization/">Customization guide</a>
                  {' · '}
                  <a href="/customize/">Theme Studio</a>
                </p>
              ),
            },
            {
              value: 'keyboard',
              title: 'Keyboard',
              content:
                entry.keyboard ??
                guidance?.keyboard ??
                'Tab reaches controls; Enter or Space activates buttons. Accordions use arrow keys, Home and End. Select menus support arrows and typeahead; Escape closes menus and dialogs and restores focus.',
            },
          ]}
        />
      </section>
    </div>
  );
}
