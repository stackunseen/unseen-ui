'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  Accordion,
  BranchSwitcher,
  Button,
  Checkbox,
  MentionPicker,
  MessageQueue,
  PromptInput,
} from '@stackunseen/ui';
import type { ReferenceOption } from '@stackunseen/ui';
import type { ConversationBranch, QueuedMessage } from '@stackunseen/ui-core';
import type { DocumentSnapshot, TextRange } from '@stackunseen/ui-core/editing';
import {
  ConversationMessageActions,
  MessageEditForm,
  insertPromptText,
  sameConversationTarget,
} from '@stackunseen/ui/conversation-flow';
import type {
  ConversationActionCommand,
  ConversationActionReceipt,
  ConversationActionState,
  ConversationMessageSnapshot,
  ConversationMessageTarget,
  MessageEditCommand,
} from '@stackunseen/ui/conversation-flow';
import s from './conversation-demo.module.css';
import { queryAnswer, queryQuestion, queryReference } from './workspace-sample';

const initial: ConversationMessageSnapshot = {
  documentId: 'question-1',
  version: '1',
  workspaceId: 'demo',
  threadId: 'thread-1',
  branchId: 'main',
  branchVersion: '1',
  attemptId: 'attempt-1',
  role: 'user',
  text: 'Explain the search function.',
};
const reference: ReferenceOption = {
  id: 'search-function',
  kind: 'symbol',
  label: 'search.ts: search',
  description: 'Function name in the current source revision',
  version: '1',
  target: { documentId: 'search.ts', version: '1', range: { from: 16, to: 22 } },
  resource: {
    documentId: 'search.ts',
    version: '1',
    path: 'src/search.ts',
    text: 'export function search(query: string) {}',
  },
};

/** A bounded in-memory demonstration. No model, send transport or durable service is involved. */
function useConversationDemo(sample: boolean) {
  const seed = sample ? { ...initial, text: queryQuestion } : initial;
  const sourceReference = sample ? queryReference : reference;
  const [messages, setMessages] = useState<Record<string, ConversationMessageSnapshot>>({
    main: seed,
  });
  const [branches, setBranches] = useState<ConversationBranch[]>([
    { id: 'main', version: '1', label: 'Original' },
  ]);
  const [branch, setBranch] = useState('main');
  const [editing, setEditing] = useState<ConversationMessageTarget>();
  const [draft, setDraft] = useState<DocumentSnapshot>({
    documentId: 'edit-draft',
    version: '1',
    text: seed.text,
  });
  const [composer, setComposer] = useState<DocumentSnapshot>({
    documentId: 'composer',
    version: '1',
    text: '',
  });
  const [selection, setSelection] = useState<TextRange>({ from: 0, to: 0 });
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [references, setReferences] = useState<ReferenceOption[]>([]);
  const [state, setState] = useState<ConversationActionState>({ status: 'idle' });
  const [loseAcknowledgement, setLoseAcknowledgement] = useState(false);
  const [sequence, setSequence] = useState(1);
  const [notice, setNotice] = useState('');
  const receipts = useRef(new Map<string, ConversationActionReceipt>());
  const submitted = useRef(new Set<string>());
  const draftTarget = useRef<ConversationMessageTarget | undefined>(undefined);
  const composerRef = useRef<HTMLTextAreaElement>(null),
    editOrigin = useRef<HTMLButtonElement>(null);
  const locked = state.status === 'pending' || state.status === 'unknown';
  const current = messages[branch] ?? seed;
  const answer: ConversationMessageSnapshot = {
    ...current,
    documentId: 'answer-1',
    role: 'assistant',
    text: sample
      ? queryAnswer
      : 'The search function accepts a query. This is a fixed local demo response.',
  };
  const editCommand: MessageEditCommand | undefined = editing
    ? {
        kind: 'edit',
        commandId: `edit-${sequence}`,
        target: editing,
        draft,
        newBranchId: `branch-${sequence}`,
      }
    : undefined;
  const regeneration = {
    kind: 'regenerate' as const,
    commandId: `regenerate-${sequence}`,
    target: answer,
    newAttemptId: `attempt-${sequence + 1}`,
  };
  function request(command: ConversationActionCommand) {
    if (locked || submitted.current.has(command.commandId)) return;
    submitted.current.add(command.commandId);
    if (submitted.current.size > 100)
      submitted.current.delete(submitted.current.values().next().value!);
    setState({ status: 'pending', command });
  }
  function acknowledge() {
    if (state.status !== 'pending') return;
    const command = state.command;
    const receipt: ConversationActionReceipt = {
      command,
      result: 'applied',
      branchId: command.kind === 'edit' ? command.newBranchId : command.target.branchId,
      branchVersion: command.kind === 'edit' ? String(sequence + 1) : command.target.branchVersion,
      attemptId: command.kind === 'regenerate' ? command.newAttemptId : `attempt-${sequence + 1}`,
    };
    receipts.current.set(command.commandId, receipt);
    if (command.kind === 'edit') {
      setBranches((items) => [
        ...items,
        {
          id: command.newBranchId,
          version: receipt.branchVersion,
          parentId: command.target.branchId,
          parentVersion: command.target.branchVersion,
          label: `Edited branch ${sequence}`,
        },
      ]);
      setBranch(command.newBranchId);
      setMessages((values) => ({
        ...values,
        [command.newBranchId]: {
          ...command.target,
          text: command.draft.text,
          version: String(sequence + 1),
          branchId: command.newBranchId,
          branchVersion: receipt.branchVersion,
          attemptId: receipt.attemptId,
        },
      }));
    } else
      setMessages((values) => ({
        ...values,
        [branch]: { ...current, attemptId: receipt.attemptId },
      }));
    if (receipts.current.size > 100) receipts.current.delete(receipts.current.keys().next().value!);
    setSequence((value) => value + 1);
    setState(loseAcknowledgement ? { status: 'unknown', command } : { status: 'settled', receipt });
    if (!loseAcknowledgement) setEditing(undefined);
  }
  function reconcile(original: ConversationActionCommand) {
    const receipt = receipts.current.get(original.commandId);
    if (!receipt) {
      setNotice('Original receipt is absent; the outcome remains unknown.');
      return;
    }
    setState({ status: 'settled', receipt });
    setEditing(undefined);
    setNotice('Original local receipt found. The action was not repeated.');
  }
  function addReference(item: ReferenceOption) {
    const result = insertPromptText(
      composer,
      { documentId: composer.documentId, version: composer.version, range: selection },
      `@${item.label} `,
    );
    if (!result.ok) {
      setNotice(`Reference insertion refused: ${result.reason}.`);
      return;
    }
    setComposer({ ...composer, version: String(Number(composer.version) + 1), text: result.text });
    setSelection(result.selection);
    setReferences((items) =>
      items.some((value) => value.id === item.id) ? items : [...items, item],
    );
    composerRef.current?.focus();
  }
  return {
    branches,
    branch,
    locked,
    editing,
    draft,
    current,
    editOrigin,
    draftTarget,
    editCommand,
    state,
    answer,
    regeneration,
    loseAcknowledgement,
    composerRef,
    composer,
    selection,
    queue,
    references,
    query,
    sourceReference,
    notice,
    sequence,
    setBranch,
    setEditing,
    setDraft,
    request,
    reconcile,
    setLoseAcknowledgement,
    acknowledge,
    setState,
    setSequence,
    setComposer,
    setSelection,
    setQueue,
    setNotice,
    addReference,
    setQuery,
  };
}

export function ConversationDemo({ sample = false }: { sample?: boolean }) {
  const host = useConversationDemo(sample);
  const {
    branches,
    branch,
    locked,
    editing,
    draft,
    current,
    editOrigin,
    draftTarget,
    editCommand,
    state,
    answer,
    regeneration,
    loseAcknowledgement,
    queue,
    notice,
    setBranch,
    setEditing,
    setDraft,
    request,
    reconcile,
    setLoseAcknowledgement,
    acknowledge,
    setState,
    setSequence,
    setQueue,
  } = host;
  const wasEditing = useRef(false);
  useLayoutEffect(() => {
    if (!editing && wasEditing.current) editOrigin.current?.focus();
    wasEditing.current = Boolean(editing);
  }, [editing, editOrigin]);
  return (
    <section aria-label="Conversation actions demo" className={s.demo}>
      <div className={s.branch}>
        <BranchSwitcher
          variant="select"
          branches={branches}
          value={branch}
          disabled={locked}
          changeGuard={
            editing
              ? { version: draft.version, message: 'Keep this edit draft and switch branch?' }
              : undefined
          }
          onValueChange={(value) => {
            setBranch(value.id);
            setEditing(undefined);
          }}
        />
      </div>
      <article className={s.message} aria-label="Original user question">
        <strong>You</strong>
        {!editing && <p>{current.text}</p>}
        {!editing && (
          <Button
            ref={editOrigin}
            size="sm"
            variant="ghost"
            disabled={locked}
            onClick={() => {
              const target: ConversationMessageTarget = {
                documentId: current.documentId,
                version: current.version,
                workspaceId: current.workspaceId,
                threadId: current.threadId,
                branchId: current.branchId,
                branchVersion: current.branchVersion,
                attemptId: current.attemptId,
                role: current.role,
              };
              setEditing(target);
              if (!sameConversationTarget(draftTarget.current, target))
                setDraft((value) => ({
                  ...value,
                  version: String(Number(value.version) + 1),
                  text: current.text,
                }));
              draftTarget.current = target;
            }}
          >
            Edit message
          </Button>
        )}
        {editing && (
          <MessageEditForm
            target={editing}
            current={current}
            draft={draft}
            command={editCommand}
            state={state}
            disabledReason={branches.length >= 50 ? 'The local branch window is full.' : undefined}
            onDraftChange={(text) =>
              setDraft((value) => ({ ...value, version: String(Number(value.version) + 1), text }))
            }
            onRequest={request}
            onCancel={() => setEditing(undefined)}
            onReconcile={reconcile}
            returnFocusRef={editOrigin}
          />
        )}
      </article>
      <article className={s.message} aria-label="Assistant response">
        <strong>Assistant</strong>
        <p>{answer.text}</p>
        <ConversationMessageActions
          target={regeneration.target}
          current={answer}
          state={state}
          regenerateCommand={regeneration}
          onRegenerate={request}
          onReconcile={reconcile}
        />
      </article>
      {state.status === 'pending' && (
        <div className={s.controls}>
          <Button size="sm" onClick={acknowledge}>
            Acknowledge in local server
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setState({ status: 'unknown', command: state.command })}
          >
            Interrupt before acknowledgement
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setState({
                status: 'settled',
                receipt: {
                  command: state.command,
                  result: 'rejected',
                  reason: 'Local server rejected the request.',
                },
              });
              setSequence((value) => value + 1);
            }}
          >
            Reject in local server
          </Button>
        </div>
      )}
      <DemoComposer host={host} />
      {queue.length > 0 && (
        <MessageQueue
          items={queue}
          variant="compact"
          onEdit={(item, text) =>
            setQueue((items) =>
              items.map((value) =>
                value.id === item.id
                  ? { ...value, text, version: String(Number(value.version) + 1) }
                  : value,
              ),
            )
          }
          onCancel={(item) => setQueue((items) => items.filter((value) => value.id !== item.id))}
        />
      )}
      <Accordion
        type="single"
        collapsible
        headingLevel={3}
        items={[
          {
            value: 'scenario',
            title: 'Demo options',
            keepMounted: true,
            content: (
              <label className={s.controls}>
                <Checkbox
                  checked={loseAcknowledgement}
                  onCheckedChange={(checked) => setLoseAcknowledgement(checked === true)}
                />
                Lose local acknowledgement
              </label>
            ),
          },
        ]}
      />
      <p role="status" className={s.note}>
        {notice}
      </p>
    </section>
  );
}

function DemoComposer({ host }: { host: ReturnType<typeof useConversationDemo> }) {
  const {
    composerRef,
    composer,
    selection,
    queue,
    references,
    sourceReference,
    query,
    sequence,
    locked,
    setComposer,
    setSelection,
    setQueue,
    setSequence,
    setNotice,
    addReference,
    setQuery,
  } = host;
  return (
    <>
      <PromptInput
        textareaRef={composerRef}
        value={composer.text}
        selection={selection}
        onSelectionChange={setSelection}
        onValueChange={(text) =>
          setComposer((value) => ({ ...value, version: String(Number(value.version) + 1), text }))
        }
        submitDisabled={locked || queue.length >= 50}
        submitDisabledReason={
          locked ? 'Resolve the original action first.' : 'The local draft queue is full.'
        }
        onSubmit={(text) => {
          setQueue((items) => [
            ...items,
            { id: `queue-${sequence}`, version: '1', state: 'queued', text },
          ]);
          setSequence((value) => value + 1);
          setNotice('Draft queued locally. No message was sent.');
        }}
        attachments={
          references.length ? (
            <p>
              {references
                .map((item) => `${item.label} · revision ${item.target?.version}`)
                .join(', ')}
            </p>
          ) : undefined
        }
        toolbar={
          <Button size="sm" variant="ghost" onClick={() => addReference(sourceReference)}>
            Insert source reference
          </Button>
        }
      />
      <Accordion
        type="single"
        collapsible
        headingLevel={3}
        items={[
          {
            value: 'sources',
            title: 'Browse source context',
            keepMounted: true,
            content: (
              <MentionPicker
                items={[sourceReference]}
                query={query}
                onQueryChange={setQuery}
                onSelect={addReference}
              />
            ),
          },
        ]}
      />
    </>
  );
}
