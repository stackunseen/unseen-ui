'use client';
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { CodeIcon, ResetIcon, Share1Icon, StackIcon } from '@radix-ui/react-icons';
import {
  Button,
  CodeDiff,
  FileExplorer,
  Tabs,
  TerminalOutput,
  TestResults,
  Modal,
} from '@stackunseen/ui';
import { CodeEditor } from '@stackunseen/ui/editor';
import type { CodeEditorSelection } from '@stackunseen/ui/editor';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type { DocumentIdentity } from '@stackunseen/ui-core/editing';
import { SplitPane } from '@stackunseen/ui/layout';
import type { SplitPaneSizes } from '@stackunseen/ui/layout';
import { CodingStudioAssistant } from './coding-studio-assistant';
import {
  baseVersion,
  createStudioState,
  proposalVersion,
  studioChanges,
  studioFiles,
  studioReducer,
  studioDocument,
} from './coding-studio-model';
import { ProjectWorkspace } from './workspace-upgrades/project-workspace';
import {
  createProjectInstructions,
  currentWorkspaceHit,
  projectInstructionReducer,
} from './workspace-upgrades/project-workspace-model';
import s from './coding-studio.module.css';

const subscribeNarrowLayout = (listener: () => void) => {
  const media = window.matchMedia('(max-width: 760px)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const narrowLayout = () => window.matchMedia('(max-width: 760px)').matches;

export function CodingStudio({ showIntroduction = true }: { showIntroduction?: boolean }) {
  const [state, dispatch] = useReducer(studioReducer, undefined, () => createStudioState());
  const [file, setFile] = useState('search');
  const [folders, setFolders] = useState(['/src', '/tests']);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('editor');
  const [editing, setEditing] = useState(false);
  const [mobilePane, setMobilePane] = useState<'source' | 'assistant'>('assistant');
  const sourceToggle = useRef<HTMLButtonElement>(null);
  const assistantToggle = useRef<HTMLButtonElement>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [referenceNotice, setReferenceNotice] = useState('');
  const [instructions, dispatchInstructions] = useReducer(
    projectInstructionReducer,
    undefined,
    createProjectInstructions,
  );
  const [editorSelection, setEditorSelection] = useState<{
    target: DocumentIdentity;
    selection: CodeEditorSelection;
  }>();
  const [filesPreference, setFilesPreference] = useState<boolean | null>(null);
  const narrow = useSyncExternalStore(subscribeNarrowLayout, narrowLayout, () => false);
  const showFiles = filesPreference ?? !narrow;
  const [sessionKey, setSessionKey] = useState(0);
  const [sizes, setSizes] = useState<SplitPaneSizes>([62, 38]);
  const [selection, setSelection] = useState<{ version: string; ids: string[] }>({
    version: '',
    ids: [],
  });
  const busy = !!state.operation;
  const changes = studioChanges(state);
  const proposal = proposalVersion(state);
  const selectedIds = selection.version === proposal ? selection.ids : [];
  const current = studioFiles.find((entry) => entry.id === file)!;
  const document = studioDocument(state, file)!;
  const resources = studioFiles.map((entry) => ({
    document: studioDocument(state, entry.id)!,
    access: 'available' as const,
  }));
  const reviewFile = changes.find((change) => change.id === file) ?? changes[0];
  const testStale = state.testVersion && state.testVersion !== proposal;
  const changed = changes.some((change) => change.id === file);

  useEffect(() => {
    if (!state.operation) return;
    const id = state.operation.id;
    const timer = window.setTimeout(
      () => dispatch({ type: 'finish', id }),
      state.operation.kind === 'task' ? 850 : 650,
    );
    return () => window.clearTimeout(timer);
  }, [state.operation]);
  useEffect(() => {
    if (!narrow) return;
    const pane = window.document.activeElement?.closest('[data-panel]');
    if (pane?.id.endsWith(mobilePane === 'source' ? '-assistant' : '-source'))
      (mobilePane === 'source' ? sourceToggle : assistantToggle).current?.focus();
  }, [narrow, mobilePane]);

  function selectFile(id: string) {
    setReferenceNotice('');
    setFile(id);
    setEditing(false);
    setTab('editor');
    setMobilePane('source');
    setEditorSelection(undefined);
  }
  function reset() {
    dispatch({ type: 'reset' });
    setFile('search');
    setEditing(false);
    setEditorSelection(undefined);
    setReferenceNotice('');
    setTab('editor');
    setQuery('');
    setSelection({ version: '', ids: [] });
    setSizes([62, 38]);
    setSessionKey((value) => value + 1);
  }
  const editor = (
    <div className={s.editorView}>
      <div className={s.fileBar}>
        <span>
          <CodeIcon width={15} height={15} aria-hidden="true" /> <strong>{current.path}</strong>
          <span className={s.muted}>{changed ? 'Draft · not applied' : baseVersion(state)}</span>
        </span>
        <div className={s.toolbar}>
          {changed && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || state.mode === 'read'}
              onClick={() => dispatch({ type: 'revert', id: file })}
            >
              Revert file
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || state.mode === 'read'}
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? 'Preview source' : 'Edit file'}
          </Button>
        </div>
      </div>
      {state.mode === 'read' && (
        <p className={s.inlineNotice}>
          Read-only session. Request workspace access in Session settings to edit.
        </p>
      )}
      <div className={s.editorInput}>
        <CodeEditor
          document={document}
          label={`${editing ? 'Edit' : 'View'} ${current.path}`}
          readOnly={!editing || busy || state.mode === 'read'}
          selection={
            editorSelection && sameDocumentIdentity(editorSelection.target, document)
              ? editorSelection.selection
              : undefined
          }
          onChange={(change) =>
            dispatch({ type: 'edit', id: file, text: change.text, target: change.target })
          }
          onSelectionChange={(change) => setEditorSelection(change)}
        />
        <p className={s.muted}>
          This workspace accepts up to 20,000 characters per file. Edits update the draft; review
          before applying. Code is never executed.
        </p>
        {state.error.includes('editor') && <p role="alert">{state.error}</p>}
      </div>
    </div>
  );
  const review = !changes.length ? (
    <div className={s.empty}>
      <Share1Icon width={30} height={30} aria-hidden="true" />
      <h2>No draft changes</h2>
      <p>Run the sample task or edit a file to prepare a change.</p>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || state.mode === 'read'}
        onClick={() =>
          dispatch({
            type: 'task',
            text: 'Fix query normalization and add regression tests.',
            task: 'fix',
          })
        }
      >
        Prepare sample fix
      </Button>
    </div>
  ) : (
    <div className={s.review}>
      <div className={s.reviewHeading}>
        <h2>Review draft changes</h2>
        <p>
          {baseVersion(state)} → {proposal}
        </p>
      </div>
      <ul className={s.changeList} aria-label="Files in this proposal">
        {changes.map((change) => (
          <li key={change.id}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.includes(change.id)}
                disabled={busy || state.mode === 'read'}
                onChange={(event) =>
                  setSelection({
                    version: proposal,
                    ids: event.target.checked
                      ? [...selectedIds, change.id]
                      : selectedIds.filter((id) => id !== change.id),
                  })
                }
              />
              <span className={s.srOnly}>Include {change.path} when applying</span>
            </label>
            <button
              type="button"
              aria-pressed={reviewFile?.id === change.id}
              onClick={() => setFile(change.id)}
            >
              {change.path}
            </button>
            <span className={s.muted}>Modified</span>
          </li>
        ))}
      </ul>
      {reviewFile && (
        <CodeDiff
          path={reviewFile.path}
          before={reviewFile.before}
          after={reviewFile.after}
          baseVersion={baseVersion(state)}
          nextVersion={proposal}
          variant="unified"
        />
      )}
      <div className={s.reviewFooter}>
        <p>
          {selectedIds.length} of {changes.length} files selected.{' '}
          {state.testVersion === proposal
            ? 'Sample test sample available.'
            : 'No current test sample.'}
        </p>
        <Button
          size="sm"
          disabled={busy || !selectedIds.length || state.mode !== 'workspace'}
          onClick={() =>
            dispatch({
              type: 'apply',
              decision: {
                baseVersion: baseVersion(state),
                proposalVersion: proposal,
                ids: selectedIds,
              },
            })
          }
        >
          {state.operation?.kind === 'apply' ? 'Awaiting demo server…' : 'Apply selected files'}
        </Button>
        <span className={s.muted}>Applies only to this in-memory demo.</span>
      </div>
    </div>
  );
  const tests = (
    <div className={s.results}>
      <div className={s.fileBar}>
        <p>Search regression samples</p>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => dispatch({ type: 'tests' })}
        >
          Run sample tests
        </Button>
      </div>
      <p className={s.inlineNotice}>
        {state.testVersion
          ? `${testStale ? 'Previous' : 'Current'} fixture: ${state.testVersion}. `
          : 'No test sample loaded yet. '}
        Sample results only; no tests or edited code are executed.
      </p>
      {testStale && (
        <p className={s.warning} role="status">
          The workspace or draft changed after this sample was loaded. Run sample tests again for
          the current draft.
        </p>
      )}
      <TestResults
        results={state.results}
        loading={state.operation?.kind === 'tests'}
        onOpenFile={() => selectFile('tests')}
      />
    </div>
  );
  const workspace = (
    <div className={s.workspace}>
      <Tabs
        value={tab}
        onValueChange={setTab}
        label="Coding workspace views"
        items={[
          { value: 'editor', label: 'Editor', content: editor },
          {
            value: 'changes',
            label: `Changes${changes.length ? ` (${changes.length})` : ''}`,
            content: review,
          },
          { value: 'tests', label: 'Tests', content: tests },
          {
            value: 'terminal',
            label: 'Terminal',
            content: (
              <div className={s.terminal}>
                <TerminalOutput
                  title="Sample terminal transcript"
                  command="pnpm test (simulated)"
                  output={state.terminal}
                  state={state.terminalState}
                  onStop={
                    state.operation?.kind === 'tests'
                      ? () => dispatch({ type: 'cancel' })
                      : undefined
                  }
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <article className={s.page}>
      {showIntroduction && (
        <header className="page-heading">
          <span className="eyebrow">APPLICATION TEMPLATE</span>
          <h1>Coding Studio</h1>
          <p>
            A file workspace, change review and assistant in one place. Try the complete local
            workflow with synthetic project data.
          </p>
        </header>
      )}
      <div className={s.application} data-template-preview="coding">
        <header className={s.topbar}>
          <div className={s.project}>
            <CodeIcon width={15} height={15} aria-hidden="true" />
            <div>
              <strong>search-web</strong>
              <span>
                <Share1Icon width={13} height={13} aria-hidden="true" /> fix/query-normalization
              </span>
            </div>
          </div>
          <div className={s.appActions}>
            <Modal
              open={projectOpen}
              onOpenChange={setProjectOpen}
              title="Project workspace"
              description="Inspect versioned references, project instructions and session capabilities."
              trigger={
                <Button size="sm" variant="outline">
                  Project workspace
                </Button>
              }
            >
              <ProjectWorkspace
                resources={resources}
                instructions={instructions}
                dispatchInstructions={dispatchInstructions}
                sessions={[
                  {
                    id: 'coding-studio-demo',
                    label: 'Studio session',
                    environment: 'in-memory',
                    status: busy ? 'running' : 'idle',
                    canEdit: state.mode === 'workspace',
                    canExecute: false,
                    provider: 'Fixed sample responses',
                  },
                ]}
                onOpenHit={(hit) => {
                  const match = studioFiles.find(
                    (entry) =>
                      studioDocument(state, entry.id)?.documentId === hit.target.documentId,
                  );
                  if (!match || !currentWorkspaceHit(hit, resources)) {
                    setReferenceNotice(
                      'Reference is stale or unavailable. Search the current snapshots again.',
                    );
                    return;
                  }
                  selectFile(match.id);
                  setEditing(state.mode === 'workspace');
                  if (hit.target.range)
                    setEditorSelection({
                      target: hit.target,
                      selection: { anchor: hit.target.range.from, head: hit.target.range.to },
                    });
                  setProjectOpen(false);
                  setReferenceNotice(`Opened ${hit.path} at ${hit.target.version}.`);
                }}
              />
            </Modal>
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={showFiles}
              aria-controls="coding-files"
              onClick={() => setFilesPreference(!showFiles)}
            >
              <StackIcon width={15} height={15} aria-hidden="true" /> Files
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setTab('tests');
                dispatch({ type: 'tests' });
              }}
            >
              Run sample tests
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <ResetIcon width={15} height={15} aria-hidden="true" /> Reset demo
            </Button>
          </div>
        </header>
        <div className={s.mobileViews} role="group" aria-label="Visible coding panel">
          <Button
            size="sm"
            variant={mobilePane === 'assistant' ? 'primary' : 'ghost'}
            aria-pressed={mobilePane === 'assistant'}
            ref={assistantToggle}
            onClick={() => setMobilePane('assistant')}
          >
            Assistant
          </Button>
          <Button
            size="sm"
            variant={mobilePane === 'source' ? 'primary' : 'ghost'}
            aria-pressed={mobilePane === 'source'}
            ref={sourceToggle}
            onClick={() => setMobilePane('source')}
          >
            Source workspace
          </Button>
        </div>
        <div className={s.appBody} data-files={showFiles} data-mobile-pane={mobilePane}>
          {showFiles && (
            <aside id="coding-files" className={s.explorer} aria-label="Project explorer">
              <h2 className={s.srOnly}>Project files</h2>
              <FileExplorer
                title="Project files"
                files={studioFiles.map((entry) => ({
                  id: entry.id,
                  path: entry.path,
                  version: proposal,
                  change: changes.some((change) => change.id === entry.id)
                    ? ('modified' as const)
                    : undefined,
                }))}
                expandedPaths={folders}
                onExpandedPathsChange={setFolders}
                query={query}
                onQueryChange={setQuery}
                context={{ workspaceId: 'search-web-demo', version: proposal }}
                selection={{
                  workspaceId: 'search-web-demo',
                  snapshotVersion: proposal,
                  fileId: file,
                  path: current.path,
                  fileVersion: proposal,
                }}
                onRequestOpen={(request) => {
                  if (
                    request.workspaceId === 'search-web-demo' &&
                    request.snapshotVersion === proposal &&
                    request.fileVersion === proposal &&
                    studioFiles.some(
                      (entry) => entry.id === request.fileId && entry.path === request.path,
                    )
                  )
                    selectFile(request.fileId);
                }}
              />
              <p className={s.explorerNote}>4 sample files · in memory</p>
            </aside>
          )}
          <SplitPane
            className={s.panes}
            label="Coding Studio panels"
            presentation="responsive"
            stackAt={720}
            sizes={sizes}
            onSizesChange={setSizes}
            resizeLabel="Resize source workspace and assistant"
            primary={{
              id: 'source',
              label: 'Source workspace',
              minSize: 38,
              scroll: 'auto',
              children: workspace,
            }}
            secondary={{
              id: 'assistant',
              label: 'Coding assistant',
              minSize: 30,
              scroll: 'auto',
              children: (
                <CodingStudioAssistant
                  key={sessionKey}
                  state={state}
                  dispatch={dispatch}
                  selectionReference={
                    editorSelection &&
                    sameDocumentIdentity(editorSelection.target, document) &&
                    editorSelection.selection.anchor !== editorSelection.selection.head
                      ? {
                          id: `${document.documentId}:selection`,
                          label: `${current.path} selection`,
                          description: 'Selected code in the current draft',
                          kind: 'file',
                          version: document.version,
                          resource: document,
                          access: 'available',
                          target: {
                            documentId: document.documentId,
                            version: document.version,
                            range: {
                              from: Math.min(
                                editorSelection.selection.anchor,
                                editorSelection.selection.head,
                              ),
                              to: Math.max(
                                editorSelection.selection.anchor,
                                editorSelection.selection.head,
                              ),
                            },
                          },
                        }
                      : undefined
                  }
                />
              ),
            }}
          />
        </div>
        <footer className={s.statusbar}>
          <span>
            {state.operation
              ? state.operation.kind === 'apply'
                ? 'Applying reviewed snapshot…'
                : state.operation.kind === 'tests'
                  ? 'Loading sample test sample…'
                  : 'Preparing sample response…'
              : state.mode === 'read'
                ? 'Read-only'
                : 'Workspace access'}{' '}
            · {baseVersion(state)}
          </span>
          <span>In-memory demo · no model or process connected</span>
        </footer>
      </div>
      <p role="status" className={s.feedback}>
        {state.notice} {referenceNotice}
      </p>
      <p className={s.footnote}>
        Built with CodeEditor, FileExplorer, CodeDiff, PromptInput, TestResults, TerminalOutput and
        SplitPane. Refreshing restores the sample workspace.{' '}
        <a href="/patterns/workspace-integrations/">
          Try editor, review, artifact and conversation contracts.
        </a>
      </p>
    </article>
  );
}
