import type { CatalogEntry } from './catalog';
import { componentImport } from './component-import';
import { rendererPeers } from './component-guidance';
import { markdownStates } from './markdown-fixtures';
import { partStates } from './message-parts-fixtures';
import { emulatorStates } from './terminal-fixtures';

/**
 * The code a component page shows for one state and style: which entry to import from, the
 * stylesheets it needs, optional peer packages and the example itself. Shared by the page and the
 * Markdown file for coding agents, so both always show the same code.
 */
export function componentUsage(entry: CatalogEntry, variant: string, presentation: string) {
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
  const shown = emulatedTerminal
    ? 'TerminalEmulator'
    : highlightedDiff
      ? 'HighlightedCodeDiff'
      : highlightedCode
        ? 'HighlightedCodeBlock'
        : undefined;
  const importLine = `import { ${shown ?? componentImport(entry).exportName} } from '@stackunseen/ui${module}';`;
  const usage = `${rich && entry.name === 'StreamingResponse' ? '' : `import { ${shown ?? entry.name} } from '@stackunseen/ui${module}';\n`}${entry.relatedImports?.length ? `import { ${entry.relatedImports.join(', ')} } from '@stackunseen/ui';\n` : ''}import '@stackunseen/ui/styles.css';\n${optionalStyles}${emulatedTerminal ? "import '@stackunseen/ui/terminal.css';\n" : ''}${mathStyles ? "import 'katex/dist/katex.min.css';\n" : ''}\n${code}`;
  const packages = `@stackunseen/ui${peers?.length ? ` ${peers.join(' ')}` : ''}`;
  return {
    rich,
    structured,
    module,
    optionalStyles,
    peers,
    importLine,
    usage,
    packages,
  };
}
