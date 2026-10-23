'use client';
import { useState } from 'react';
import type { Dispatch } from 'react';
import { AlertDialog, Button, Input, Tabs } from '@stackunseen/ui';
import { ArtifactEditor } from '@stackunseen/ui/artifact-editor';
import type { ArtifactEditorView } from '@stackunseen/ui/artifact-editor';
import { CodeEditor } from '@stackunseen/ui/editor';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import { projectInstructionCommand, searchWorkspaceReferences } from './project-workspace-model';
import type {
  ProjectInstructionAction,
  ProjectInstructionState,
  WorkspaceReference,
  WorkspaceSearchHit,
} from './project-workspace-model';
import s from './project-workspace.module.css';

export interface WorkspaceSessionSummary {
  readonly id: string;
  readonly label: string;
  readonly environment: 'in-memory' | 'local' | 'remote' | 'unavailable';
  readonly status: 'idle' | 'running' | 'approval-needed' | 'paused' | 'disconnected' | 'unknown';
  readonly canEdit: boolean;
  readonly canExecute: boolean;
  readonly provider: string;
}

/** Application composition of existing controls, not a project service or new library family. */
export function ProjectWorkspace({
  resources,
  instructions,
  dispatchInstructions,
  sessions,
  onOpenHit,
}: {
  resources: readonly WorkspaceReference[];
  instructions: ProjectInstructionState;
  dispatchInstructions: Dispatch<ProjectInstructionAction>;
  sessions: readonly WorkspaceSessionSummary[];
  onOpenHit: (hit: WorkspaceSearchHit) => void;
}) {
  const [view, setView] = useState('references');
  const [query, setQuery] = useState('');
  const [instructionView, setInstructionView] = useState<ArtifactEditorView>('edit');
  const [confirmReload, setConfirmReload] = useState(false);
  const hits = searchWorkspaceReferences(query, resources);
  const locked = instructions.state.status === 'pending' || instructions.state.status === 'unknown';
  const conflict = !sameDocumentIdentity(instructions.draft.base, instructions.document);
  const command = projectInstructionCommand(instructions);
  return (
    <section className={s.root} aria-label="Project workspace">
      <p className={s.note}>
        Search Web project · references, instructions and session capabilities supplied by the
        in-memory server.
      </p>
      <Tabs
        label="Project workspace views"
        value={view}
        onValueChange={setView}
        items={[
          {
            value: 'references',
            label: 'References',
            content: (
              <div className={s.section}>
                <label htmlFor="workspace-reference-search">Search file names and content</label>
                <Input
                  id="workspace-reference-search"
                  type="search"
                  value={query}
                  maxLength={200}
                  placeholder="Search the sample project…"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <p className={s.note}>
                  Literal text search across supplied snapshots. Up to 40 results; each opens an
                  exact revision and range.
                </p>
                {!query.trim() ? (
                  <p>Enter a file name or text to find a reference.</p>
                ) : !hits.length ? (
                  <p role="status">No accessible references match.</p>
                ) : (
                  <ul className={s.results}>
                    {hits.map((hit) => (
                      <li key={hit.id}>
                        <Button variant="ghost" onClick={() => onOpenHit(hit)}>
                          {hit.path}
                        </Button>
                        <small>
                          {hit.target.version}
                          {hit.target.range
                            ? ` · characters ${hit.target.range.from}–${hit.target.range.to}`
                            : ''}
                        </small>
                        <pre>{hit.snippet}</pre>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            value: 'instructions',
            label: 'Instructions',
            content: (
              <div className={s.section}>
                <ArtifactEditor
                  document={instructions.document}
                  draft={instructions.draft}
                  label="Project instructions"
                  view={instructionView}
                  onViewChange={setInstructionView}
                  saveCommand={command}
                  saveState={instructions.state}
                  onDraftChange={(change) => {
                    if (sameDocumentIdentity(change.target, instructions.draft))
                      dispatchInstructions({ type: 'edit', text: change.text });
                  }}
                  onSave={(request) =>
                    dispatchInstructions({
                      type: 'save',
                      command: request,
                      base: request.base,
                      text: request.text,
                    })
                  }
                  onLookupReceipt={(request) =>
                    dispatchInstructions({ type: 'lookup', command: request })
                  }
                  renderEditor={(input) => (
                    <CodeEditor
                      document={{ ...input.document, language: undefined }}
                      readOnly={input.readOnly}
                      label={input.label}
                      onChange={input.onDocumentChange}
                    />
                  )}
                />
                {conflict && (
                  <AlertDialog open={confirmReload} onOpenChange={setConfirmReload}>
                    <AlertDialog.Trigger asChild>
                      <Button variant="outline">Reload current instructions</Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Title>Discard instructions draft?</AlertDialog.Title>
                      <AlertDialog.Description>
                        Load the current saved instructions. This discards only the unsaved
                        instructions draft.
                      </AlertDialog.Description>
                      <AlertDialog.Actions>
                        <AlertDialog.Cancel>Keep draft</AlertDialog.Cancel>
                        <AlertDialog.Action
                          onAction={() => {
                            dispatchInstructions({ type: 'reload' });
                            setConfirmReload(false);
                          }}
                        >
                          Reload instructions
                        </AlertDialog.Action>
                      </AlertDialog.Actions>
                    </AlertDialog.Content>
                  </AlertDialog>
                )}
                <fieldset className={s.scenarios} disabled={locked}>
                  <legend>Local save scenarios</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={instructions.failNext}
                      onChange={(event) =>
                        dispatchInstructions({
                          type: 'configure',
                          failNext: event.target.checked,
                          loseAcknowledgement: instructions.loseAcknowledgement,
                        })
                      }
                    />{' '}
                    Reject next save
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={instructions.loseAcknowledgement}
                      onChange={(event) =>
                        dispatchInstructions({
                          type: 'configure',
                          failNext: instructions.failNext,
                          loseAcknowledgement: event.target.checked,
                        })
                      }
                    />{' '}
                    Lose next acknowledgement
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatchInstructions({ type: 'external-change' })}
                  >
                    Simulate changed instructions
                  </Button>
                </fieldset>
              </div>
            ),
          },
          {
            value: 'sessions',
            label: 'Sessions',
            content: (
              <div className={s.section}>
                {!sessions.length ? (
                  <p>No sessions supplied by the server.</p>
                ) : (
                  <ul className={s.results}>
                    {sessions.slice(0, 50).map((session) => (
                      <li key={session.id}>
                        <strong>{session.label}</strong>
                        <span role="status">{session.status}</span>
                        <small>
                          {session.environment} · {session.provider}
                        </small>
                        <p>
                          {session.canEdit ? 'Draft editing available.' : 'Read-only.'}{' '}
                          {session.canExecute
                            ? 'Running commands is available.'
                            : 'No process execution connected.'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={s.note}>
                  Environment and capability labels come from the server. This sample has no
                  filesystem, Git, cloud worker or model connection.
                </p>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
