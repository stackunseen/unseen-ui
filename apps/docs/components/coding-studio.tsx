'use client';
import { useRef, useState } from 'react';
import {
  AccessModeSelector,
  Button,
  CodeDiff,
  FileExplorer,
  IconButton,
  MentionPicker,
  Modal,
  PromptInput,
  ReasoningControl,
  SlashCommandMenu,
  Tabs,
  TerminalOutput,
  TestResults,
  VoiceControl,
} from '@ai-interaction/react';
import type { ReferenceOption, VoiceState } from '@ai-interaction/react';
import {
  accessModes,
  after,
  before,
  commands,
  efforts,
  files,
  references,
} from '../lib/coding-fixtures';

export function CodingStudio() {
  const [draft, setDraft] = useState('Review the search change and suggest tests.');
  const [picker, setPicker] = useState<'commands' | 'references' | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReferenceOption[]>([]);
  const [file, setFile] = useState('search');
  const [folders, setFolders] = useState(['/src', '/tests']);
  const [tab, setTab] = useState('diff');
  const [mode, setMode] = useState('read');
  const [effort, setEffort] = useState('medium');
  const [voice, setVoice] = useState<VoiceState>('idle');
  const [feedback, setFeedback] = useState('');
  const input = useRef<HTMLFormElement>(null);
  const caret = useRef(0);
  const insertion = useRef<{ start: number; end: number } | undefined>(undefined);
  function openPicker(next: 'commands' | 'references') {
    insertion.current = undefined;
    setQuery('');
    setPicker(next);
  }
  function insert(text: string) {
    const range = insertion.current;
    setDraft((value) =>
      range
        ? `${value.slice(0, range.start)}${text} ${value.slice(range.end)}`
        : `${value}${value && !value.endsWith(' ') ? ' ' : ''}${text} `,
    );
    setPicker(null);
    setQuery('');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => input.current?.querySelector('textarea')?.focus()),
    );
  }
  return (
    <div className="coding-studio">
      <div className="page-heading">
        <span className="eyebrow">CODING AGENT PATTERNS</span>
        <h1>A workspace for agent work.</h1>
        <p>
          Try / commands, @ references, versioned changes and process output together. All host
          actions and voice capture here are simulated.
        </p>
      </div>
      <div className="coding-studio-grid">
        <section className="coding-studio-main" aria-label="Coding session">
          <Tabs
            value={tab}
            onValueChange={setTab}
            label="Workspace views"
            items={[
              {
                value: 'diff',
                label: 'Changes',
                content: (
                  <CodeDiff
                    path="src/search.ts"
                    before={before}
                    after={after}
                    baseVersion="a1"
                    nextVersion="b2"
                  />
                ),
              },
              {
                value: 'terminal',
                label: 'Terminal',
                content: (
                  <TerminalOutput
                    command="pnpm test"
                    state="complete"
                    exitCode={0}
                    output={
                      '✓ normalizes whitespace\n✓ handles empty queries\n\n2 tests passed\nSynthetic output; no process was executed.'
                    }
                  />
                ),
              },
              {
                value: 'tests',
                label: 'Tests',
                content: (
                  <TestResults
                    results={[
                      { id: 't1', name: 'normalizes whitespace', state: 'passed', durationMs: 4 },
                      { id: 't2', name: 'handles empty queries', state: 'passed', durationMs: 7 },
                    ]}
                  />
                ),
              },
            ]}
          />
          <PromptInput
            ref={input}
            value={draft}
            onInputCapture={(event) => {
              if (event.target instanceof HTMLTextAreaElement)
                caret.current = event.target.selectionStart;
            }}
            onValueChange={(value) => {
              setDraft(value);
              const prefix = value.slice(0, caret.current);
              const match = /(?:^|\s)([/@])$/.exec(prefix);
              if (match) {
                insertion.current = { start: prefix.length - 1, end: caret.current };
                setQuery('');
                setPicker(match[1] === '/' ? 'commands' : 'references');
              }
            }}
            onSubmit={() =>
              setFeedback(
                `Synthetic request received with ${selected.length} explicit references, ${effort} effort and ${mode} access. No model was called.`,
              )
            }
            placeholder="Describe a change, type / for commands or @ for references…"
            attachments={
              selected.length ? (
                <div className="coding-reference-list">
                  {selected.map((reference) => (
                    <span key={reference.id} className="coding-reference-chip">
                      <span>@{reference.label}</span>
                      <IconButton
                        icon="close"
                        label={`Remove reference ${reference.label}`}
                        onClick={() =>
                          setSelected(selected.filter((item) => item.id !== reference.id))
                        }
                      />
                    </span>
                  ))}
                </div>
              ) : undefined
            }
            toolbar={
              <div className="coding-reference-list">
                <Modal
                  open={picker === 'commands'}
                  onOpenChange={(open) => {
                    if (!open) setPicker(null);
                  }}
                  title="Slash commands"
                  description="Choose a command supplied by the workspace."
                  trigger={
                    <Button size="sm" variant="ghost" onClick={() => openPicker('commands')}>
                      / Commands
                    </Button>
                  }
                >
                  <SlashCommandMenu
                    items={commands}
                    query={query}
                    onQueryChange={setQuery}
                    onSelect={(command) => insert(`/${command.label}`)}
                  />
                </Modal>
                <Modal
                  open={picker === 'references'}
                  onOpenChange={(open) => {
                    if (!open) setPicker(null);
                  }}
                  title="Add a reference"
                  description="Select a versioned resource to include with the draft."
                  trigger={
                    <Button size="sm" variant="ghost" onClick={() => openPicker('references')}>
                      @ Reference
                    </Button>
                  }
                >
                  <MentionPicker
                    items={references}
                    query={query}
                    onQueryChange={setQuery}
                    onSelect={(reference) => {
                      setSelected((current) => [
                        ...current.filter((item) => item.id !== reference.id),
                        reference,
                      ]);
                      insert(`@${reference.label}`);
                    }}
                  />
                </Modal>
              </div>
            }
          />
          <VoiceControl
            variant="bar"
            state={voice}
            onStart={() => setVoice('listening')}
            onStop={() => {
              setVoice('idle');
              setDraft((value) => `${value} Review keyboard accessibility.`);
              setFeedback('Inserted a synthetic transcript. No microphone was used.');
            }}
            onCancel={() => setVoice('idle')}
            transcript={
              voice === 'listening'
                ? { text: 'Review keyboard accessibility…', final: false }
                : undefined
            }
          />
          {feedback && (
            <p role="status" className="specimen-feedback">
              {feedback}
            </p>
          )}
        </section>
        <aside aria-label="Coding workspace controls">
          <h2 className="sr-only">Workspace controls</h2>
          <FileExplorer
            files={files}
            selectedId={file}
            onSelect={(value) => {
              setFile(value.id);
              setFeedback(
                `Selected ${value.path}. The comparison below is a fixed synthetic example.`,
              );
            }}
            expandedPaths={folders}
            onExpandedPathsChange={setFolders}
          />
          <ReasoningControl value={effort} options={efforts} onValueChange={setEffort} />
          <AccessModeSelector
            modes={accessModes}
            value={mode}
            scope="Synthetic workspace"
            version="policy-4"
            status="ready"
            onRequest={(request) => {
              setMode(request.modeId);
              setFeedback(
                'Synthetic access change acknowledged. No real permissions were changed.',
              );
            }}
          />
        </aside>
      </div>
    </div>
  );
}
