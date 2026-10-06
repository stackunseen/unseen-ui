'use client';
import { useRef, useState } from 'react';
import { Accordion, Button, ReviewChanges, Select } from '@stackunseen/ui';
import type { ProposedChange, ReviewChangesProps } from '@stackunseen/ui';
import { applyTextEdits, sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type { DocumentIdentity, DocumentSnapshot } from '@stackunseen/ui-core/editing';
import styles from './review-demo.module.css';
import { queryDocument, queryDraftText } from './workspace-sample';

type Contract = NonNullable<ReviewChangesProps['review']>;
type Command = Parameters<Contract['onCommand']>[0];
type Receipt = Extract<Contract['submission'], { status: 'settled' }>['receipt'];
type Hunks = Contract['selectedHunks'];
type Scenario = 'acknowledged' | 'partial' | 'lost';

const queryBefore = queryDocument.text;
const queryTarget = { documentId: 'query', version: 'query-1' };
const changes: readonly ProposedChange[] = [
  {
    id: 'query',
    path: 'src/query.ts',
    before: queryBefore,
    after: queryDraftText,
    target: queryTarget,
    operation: { kind: 'modify' },
    hunks: [
      {
        id: 'limit',
        label: 'Increase result limit',
        target: { ...queryTarget, range: { from: 14, to: 16 } },
        insert: '20',
      },
      {
        id: 'order',
        label: 'Sort results ascending',
        target: { ...queryTarget, range: { from: 33, to: 37 } },
        insert: 'asc',
      },
    ],
  },
  {
    id: 'new',
    path: 'tests/query.test.ts',
    before: '',
    after: '// Cover result limit and ordering.\n',
    target: { documentId: 'new', version: 'absent-1' },
    operation: { kind: 'add' },
  },
  {
    id: 'legacy',
    path: 'src/legacy.ts',
    before: 'export const legacy = true;\n',
    after: '',
    target: { documentId: 'legacy', version: 'legacy-1' },
    operation: { kind: 'delete' },
  },
  {
    id: 'rename',
    path: 'docs/query.md',
    before: '# Query guide\n',
    after: '# Query guide\n',
    target: { documentId: 'rename', version: 'guide-1' },
    operation: { kind: 'rename', fromPath: 'docs/search.md' },
  },
];

function initialDocuments(): DocumentSnapshot[] {
  return changes.map((file) => ({
    ...file.target!,
    path: file.operation?.kind === 'rename' ? file.operation.fromPath : file.path,
    text: file.before,
  }));
}

/** An in-memory fixture host, with original receipt lookup and exact revision checks. */
function execute(
  command: Command,
  documents: readonly DocumentSnapshot[],
  scenario: Scenario,
): { receipt: Receipt; documents: DocumentSnapshot[] } {
  let next = [...documents];
  const outcomes: Receipt['files'][number][] = [];
  for (const [index, scope] of command.files.entries()) {
    const file = changes.find((item) => item.id === scope.id);
    const current = next.find((item) => sameDocumentIdentity(item, scope.target));
    if (!file || !current || (scenario === 'partial' && index === command.files.length - 1)) {
      outcomes.push({
        ...scope,
        result: 'rejected',
        reason: !current ? 'The document revision changed.' : 'The local host rejected this file.',
      });
      continue;
    }
    let text = current.text;
    if (command.action === 'undo') text = file.before;
    if (command.action === 'apply') {
      if (scope.hunkIds) {
        const edits = file
          .hunks!.filter((hunk) => scope.hunkIds!.includes(hunk.id))
          .map((hunk) => ({ range: hunk.target.range, insert: hunk.insert }));
        const result = applyTextEdits(current, scope.target, edits);
        if (!result.ok) {
          outcomes.push({ ...scope, result: 'rejected', reason: result.reason });
          continue;
        }
        text = result.text;
      } else text = file.after;
    }
    const nextVersion =
      command.action === 'discard' ? current.version : `${current.version}:${command.commandId}`;
    const path =
      command.action === 'undo' && file.operation?.kind === 'rename'
        ? file.operation.fromPath
        : command.action === 'discard'
          ? current.path
          : file.path;
    next = next.map((item) =>
      item.documentId === current.documentId ? { ...item, text, path, version: nextVersion } : item,
    );
    outcomes.push({ ...scope, result: 'applied', nextVersion });
  }
  return { receipt: { command, files: outcomes }, documents: next };
}

export function ReviewDemo({ compact = false }: { compact?: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(changes.map((file) => file.id));
  const [selectedHunks, setSelectedHunks] = useState<Hunks>([]);
  const [documents, setDocuments] = useState(initialDocuments);
  const [submission, setSubmission] = useState<Contract['submission']>({ status: 'idle' });
  const [policy, setPolicy] = useState<Contract['policy']>({ stage: 'pending' });
  const [scenario, setScenario] = useState<Scenario>('acknowledged');
  const [sequence, setSequence] = useState(1);
  const [epoch, setEpoch] = useState(1);
  const receipts = useRef(new Map<string, ReturnType<typeof execute>>());
  const proposalVersion = `review-${epoch}`;
  const files: Command['files'][number][] = changes
    .filter((file) => selectedIds.includes(file.id))
    .flatMap((file) => {
      if (policy.stage === 'saved') {
        const target = policy.targets.find((item) => item.documentId === file.target!.documentId);
        return target ? [{ id: file.id, target }] : [];
      }
      const selection = selectedHunks.find((item) => item.changeId === file.id);
      return selection
        ? selection.hunkIds.length
          ? [
              {
                id: file.id,
                target: file.target!,
                hunkIds: file
                  .hunks!.filter((hunk) => selection.hunkIds.includes(hunk.id))
                  .map((hunk) => hunk.id),
              },
            ]
          : []
        : [{ id: file.id, target: file.target! }];
    });
  const prepared = (action: Command['action']): Command => ({
    commandId: `${proposalVersion}:${action}:${sequence}`,
    target: { documentId: 'local-review', version: proposalVersion },
    baseVersion: 'project-1',
    proposalVersion,
    action,
    files,
    ...(action === 'undo' && policy.stage === 'saved' ? { undoOf: policy.commandId } : {}),
  });

  function acknowledge(result: ReturnType<typeof execute>) {
    const { receipt } = result;
    setDocuments(result.documents);
    setSubmission({ status: 'settled', command: receipt.command, receipt });
    setSequence((value) => value + 1);
    const applied = receipt.files.filter((file) => file.result === 'applied');
    if (receipt.command.action === 'apply' && applied.length) {
      const targets: DocumentIdentity[] = applied.map((file) => ({
        documentId: file.target.documentId,
        version: file.result === 'applied' ? file.nextVersion : file.target.version,
      }));
      setSelectedIds(applied.map((file) => file.id));
      setPolicy({
        stage: 'saved',
        commandId: receipt.command.commandId,
        targets,
        undo: 'available',
      });
    } else if (receipt.command.action === 'undo' && policy.stage === 'saved') {
      setPolicy({
        ...policy,
        undo: 'unavailable',
        reason: 'Undo acknowledged. Start a new proposal to make further changes.',
      });
    }
  }

  function finish() {
    if (submission.status !== 'pending') return;
    const existing = receipts.current.get(submission.command.commandId);
    const result = existing ?? execute(submission.command, documents, scenario);
    receipts.current.set(submission.command.commandId, result);
    if (scenario === 'lost') setSubmission({ status: 'unknown', command: submission.command });
    else acknowledge(result);
  }

  function reset() {
    setDocuments(initialDocuments());
    setPolicy({ stage: 'pending' });
    setSubmission({ status: 'idle' });
    setSelectedIds(changes.map((file) => file.id));
    setSelectedHunks([]);
    setSequence(1);
    setEpoch((value) => value + 1);
    receipts.current.clear();
  }

  const review: Contract = {
    proposal: { documentId: 'local-review', version: proposalVersion },
    currentTargets: documents,
    policy,
    access: 'allowed',
    submission,
    selectedHunks,
    onHunkSelectionChange: (selection) => {
      setSelectedHunks(selection);
      setSequence((value) => value + 1);
    },
    commands:
      policy.stage === 'pending'
        ? { apply: prepared('apply'), discard: prepared('discard') }
        : { undo: prepared('undo') },
    onCommand: (command) => setSubmission({ status: 'pending', command }),
    completedCommandIds: [...receipts.current.keys()],
    lookup: {
      requestId: `${proposalVersion}:lookup:${sequence}`,
      status: 'ready',
      onRequest: (original) => {
        const result = receipts.current.get(original.commandId);
        if (result) acknowledge(result);
      },
    },
  };
  const controls = (
    <div className={styles.controls} role="group" aria-label="Local review host controls">
      <Select
        aria-label="Acknowledgement scenario"
        value={scenario}
        onValueChange={(value) => setScenario(value as Scenario)}
        options={[
          { value: 'acknowledged', label: 'Acknowledged' },
          { value: 'partial', label: 'One file rejected' },
          { value: 'lost', label: 'Acknowledgement lost' },
        ]}
      />
      <Button
        variant="outline"
        onClick={reset}
        disabled={submission.status === 'pending' || submission.status === 'unknown'}
      >
        New local proposal
      </Button>
    </div>
  );
  const preview = (
    <output className={styles.preview} aria-label="Acknowledged source preview">
      <pre>{documents.find((document) => document.documentId === 'query')?.text}</pre>
    </output>
  );
  return (
    <div className={styles.demo}>
      {compact && (
        <p className={styles.selection}>
          {files.length} selected files · Open a file to inspect its changes.
        </p>
      )}
      {!compact && controls}
      {submission.status === 'pending' && (
        <Button onClick={finish}>Deliver local host outcome</Button>
      )}
      <ReviewChanges
        changes={changes}
        baseVersion="project-1"
        proposalVersion={proposalVersion}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelectedIds(ids);
          setSequence((value) => value + 1);
        }}
        state={
          submission.status === 'settled' && submission.command.action === 'discard'
            ? 'rejected'
            : 'ready'
        }
        onDecision={() => {}}
        variant={compact ? 'accordion' : 'stack'}
        review={review}
      />
      {compact ? (
        <Accordion
          type="single"
          collapsible
          headingLevel={3}
          items={[
            { value: 'host', title: 'Demo options', keepMounted: true, content: controls },
            { value: 'source', title: 'Acknowledged source', keepMounted: true, content: preview },
          ]}
        />
      ) : (
        preview
      )}
    </div>
  );
}
