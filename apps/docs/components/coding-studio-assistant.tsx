'use client';
import { useRef, useState } from 'react';
import type { Dispatch } from 'react';
import {
  AccessModeSelector,
  Accordion,
  Button,
  IconButton,
  MentionPicker,
  Modal,
  PromptInput,
  ReasoningControl,
  SlashCommandMenu,
  referenceUnavailableReason,
} from '@stackunseen/ui';
import type { ReferenceOption } from '@stackunseen/ui';
import { insertPromptText } from '@stackunseen/ui/conversation-flow';
import type {
  DocumentSnapshot,
  TextRange,
  VersionedTextTarget,
} from '@stackunseen/ui-core/editing';
import { accessModes, efforts } from '../lib/coding-fixtures';
import { studioDocument, studioFiles } from './coding-studio-model';
import type { StudioAction, StudioState, StudioTask } from './coding-studio-model';
import s from './coding-studio.module.css';

const commands = [
  { id: 'fix', label: 'fix', description: 'Prepare the fixed search-normalization sample patch.' },
  {
    id: 'review',
    label: 'review',
    description: 'Summarize the current draft without changing files.',
  },
  { id: 'plan', label: 'plan', description: 'Show the sample implementation plan.' },
  { id: 'tests', label: 'tests', description: 'Load the matching sample test fixture.' },
];

export function CodingStudioAssistant({
  state,
  dispatch,
  selectionReference,
}: {
  state: StudioState;
  dispatch: Dispatch<StudioAction>;
  selectionReference?: ReferenceOption;
}) {
  const [draft, setDraft] = useState('Fix query normalization and add regression tests.');
  const revision = useRef(1);
  const [selection, setSelection] = useState<TextRange>({ from: 0, to: 0 });
  const [referenceError, setReferenceError] = useState('');
  const [picker, setPicker] = useState<'commands' | 'references' | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReferenceOption[]>([]);
  const [effort, setEffort] = useState('medium');
  const [failNext, setFailNext] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const insertion = useRef<VersionedTextTarget | undefined>(undefined);
  const busy = !!state.operation;
  const draftSnapshot: DocumentSnapshot = {
    documentId: 'coding-composer',
    version: `draft:${revision.current}`,
    text: draft,
  };
  const references: ReferenceOption[] = studioFiles.map((file) => ({
    id: file.id,
    label: file.path,
    description: 'In-memory project file',
    kind: 'file' as const,
    version: studioDocument(state, file.id)!.version,
    target: studioDocument(state, file.id)!,
    resource: studioDocument(state, file.id)!,
    access: 'available',
  }));
  if (selectionReference) references.unshift(selectionReference);
  const currentSelected = selected.map((reference) => ({
    ...reference,
    resource: studioFiles
      .map((file) => studioDocument(state, file.id)!)
      .find((document) => document.documentId === reference.target?.documentId),
  }));

  function updateDraft(value: string) {
    revision.current += 1;
    setDraft(value);
    setReferenceError('');
  }

  function openPicker(next: 'commands' | 'references') {
    insertion.current = {
      documentId: draftSnapshot.documentId,
      version: draftSnapshot.version,
      range: selection,
    };
    setQuery('');
    setPicker(next);
  }
  function insert(text: string) {
    const result = insertPromptText(
      draftSnapshot,
      insertion.current ?? { ...draftSnapshot, range: selection },
      `${text} `,
    );
    if (!result.ok) {
      setReferenceError('The composer draft changed. Reopen the picker at the current caret.');
      return;
    }
    updateDraft(result.text);
    setSelection(result.selection);
    setPicker(null);
    setQuery('');
    requestAnimationFrame(() => input.current?.focus());
  }
  function submit(text: string) {
    if (currentSelected.some((reference) => referenceUnavailableReason(reference))) {
      setReferenceError(
        'A selected reference is stale or unavailable. Remove it and select the current revision.',
      );
      return;
    }
    const command = /(?:^|\s)\/(fix|review|plan|tests)(?=\s|$)/.exec(text)?.[1];
    if (command === 'tests') {
      dispatch({ type: 'tests' });
      updateDraft('');
      return;
    }
    const task: StudioTask = command === 'review' ? 'review' : command === 'plan' ? 'plan' : 'fix';
    const context = selected.length
      ? `\nReferences: ${selected.map((reference) => `${reference.label} (${reference.version})`).join(', ')}.`
      : '';
    dispatch({
      type: 'task',
      text: `${text}${context}\nDemo effort: ${effort}.`,
      task,
      fail: failNext,
    });
    setFailNext(false);
    // Keep the prompt available if read-only access rejects an edit request.
    if (task !== 'fix' || state.mode === 'workspace') updateDraft('');
  }
  return (
    <section className={s.assistant} aria-label="Sample coding assistant">
      <header className={s.panelHeading}>
        <div>
          <h2>Assistant</h2>
          <span className={s.muted}>Fixed sample responses</span>
        </div>
        <span className={s.status}>{state.operation?.kind === 'task' ? 'Working' : 'Demo'}</span>
      </header>
      <div className={s.conversation} aria-busy={state.operation?.kind === 'task'}>
        <ol className={s.messages}>
          {state.messages.map((message) => (
            <li
              key={message.id}
              className={message.role === 'user' ? s.userMessage : s.assistantMessage}
            >
              <strong>{message.role === 'user' ? 'You' : 'Sample assistant'}</strong>
              <p>{message.text}</p>
            </li>
          ))}
        </ol>
        {state.operation?.kind === 'task' && (
          <p className={s.activity} role="status">
            Preparing the sample response…
          </p>
        )}
        {state.error && (
          <div className={s.error} role="alert">
            <p>{state.error}</p>
            {state.lastTask && !busy && state.error.includes('simulated assistant') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch({ type: 'task', ...state.lastTask! })}
              >
                Retry sample request
              </Button>
            )}
          </div>
        )}
      </div>
      <div className={s.composerArea}>
        {!state.operation && state.messages.length === 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => submit('Fix query normalization and add regression tests.')}
          >
            Run sample task
          </Button>
        )}
        <PromptInput
          textareaRef={input}
          selection={selection}
          onSelectionChange={setSelection}
          className={s.composer}
          variant="compact"
          value={draft}
          busy={busy}
          disabled={busy && state.operation?.kind !== 'task'}
          disabledReason="Wait for the current demo operation to finish."
          onCancel={() => dispatch({ type: 'cancel' })}
          placeholder="Describe the sample change, or type /review."
          onValueChange={(value) => {
            updateDraft(value);
            const caret = input.current?.selectionStart ?? value.length;
            const prefix = value.slice(0, caret);
            const match = /(?:^|\s)([/@])$/.exec(prefix);
            if (match) {
              insertion.current = {
                documentId: draftSnapshot.documentId,
                version: `draft:${revision.current}`,
                range: { from: prefix.length - 1, to: caret },
              };
              setQuery('');
              setPicker(match[1] === '/' ? 'commands' : 'references');
            }
          }}
          onSubmit={submit}
          attachments={
            selected.length ? (
              <div className={s.references}>
                {currentSelected.map((reference) => (
                  <span key={reference.id} className={s.reference}>
                    <span>
                      @{reference.label} · {reference.version}
                      {referenceUnavailableReason(reference) && (
                        <small>{referenceUnavailableReason(reference)}</small>
                      )}
                    </span>
                    <IconButton
                      icon="close"
                      label={`Remove reference ${reference.label}`}
                      onClick={() =>
                        setSelected((current) => current.filter((item) => item.id !== reference.id))
                      }
                    />
                  </span>
                ))}
              </div>
            ) : undefined
          }
          toolbar={
            <div className={s.toolbar}>
              <Modal
                open={picker === 'commands'}
                onOpenChange={(open) => {
                  if (!open) setPicker(null);
                }}
                title="Sample commands"
                description="Commands operate on this local demo only."
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => openPicker('commands')}
                  >
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
                title="Add a file reference"
                description="References bind to the displayed in-memory workspace version."
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => openPicker('references')}
                  >
                    @ File
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
        {referenceError && <p role="alert">{referenceError}</p>}
        <p className={s.disclosure}>
          This demo follows one search task. Custom prompts use the same sample response. No AI
          service is connected.
        </p>
        <Accordion
          type="single"
          collapsible
          region={false}
          headingLevel={3}
          className={s.settings}
          items={[
            {
              value: 'session-settings',
              title: 'Session settings',
              keepMounted: true,
              content: (
                <div className={s.settingsBody}>
                  <ReasoningControl
                    variant="select"
                    value={effort}
                    options={efforts}
                    onValueChange={setEffort}
                    disabled={busy}
                    label="Demo effort setting"
                  />
                  <AccessModeSelector
                    key={state.mode}
                    variant="select"
                    modes={accessModes}
                    value={state.mode}
                    scope="In-memory search-web"
                    version="demo-policy-1"
                    status={busy ? 'pending' : 'ready'}
                    onRequest={(request) => {
                      if (
                        request.scope === 'In-memory search-web' &&
                        request.version === 'demo-policy-1' &&
                        (request.modeId === 'read' || request.modeId === 'workspace')
                      )
                        dispatch({ type: 'mode', mode: request.modeId });
                    }}
                  />
                  <label className={s.failureSetting}>
                    <input
                      type="checkbox"
                      checked={failNext}
                      disabled={busy}
                      onChange={(event) => setFailNext(event.target.checked)}
                    />{' '}
                    Fail the next assistant request
                  </label>
                  <p className={s.muted}>
                    Access and effort settings are acknowledged by the local demo. They do not
                    change real host permissions or model behavior.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
