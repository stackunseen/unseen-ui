'use client';
import { useEffect, useId, useMemo, useRef } from 'react';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import { Skeleton } from '../skeleton/skeleton.js';
import { ArtifactEditorContent } from './artifact-content.js';
import { ArtifactEditorActions } from './artifact-actions.js';
import { artifactPresentation } from './presentation.js';
import { identity, maxArtifactCharacters, validArtifactDraft, validCommandState } from './model.js';
import { ArtifactReceiptStatus } from './receipt-status.js';
import type { ArtifactDraftChange, ArtifactEditorProps } from './types.js';
import s from './artifact-editor.module.css';

export function ArtifactEditor({
  document,
  draft,
  label = 'Artifact draft',
  view = 'preview',
  onViewChange,
  onDraftChange,
  access = 'available',
  loading = false,
  error,
  saveCommand,
  saveState = { status: 'idle' },
  onSave,
  exportCommand,
  exportState = { status: 'idle' },
  onExport,
  onLookupReceipt,
  receiptLookupPending = false,
  renderEditor,
  className = '',
}: ArtifactEditorProps) {
  const statusId = useId();
  const scope = useMemo(
    () => [
      document,
      draft,
      access,
      loading,
      error,
      saveCommand,
      saveState,
      exportCommand,
      exportState,
      onDraftChange,
    ],
    [
      document,
      draft,
      access,
      loading,
      error,
      saveCommand,
      saveState,
      exportCommand,
      exportState,
      onDraftChange,
    ],
  );
  const activeScope = useRef<typeof scope | undefined>(undefined);
  useEffect(() => {
    activeScope.current = scope;
    return () => {
      if (activeScope.current === scope) activeScope.current = undefined;
    };
  }, [scope]);
  const rootProps = { className: `${s.root} ${className}`, 'data-part': 'artifact-editor' };
  if (access === 'revoked')
    return (
      <div {...rootProps} data-status="revoked">
        <p role="alert">Artifact access revoked.</p>
      </div>
    );
  if (loading)
    return (
      <div {...rootProps} data-status="loading">
        <Skeleton shape="card" label="Loading artifact" lines={5} />
      </div>
    );
  if (error)
    return (
      <div {...rootProps} data-status="error">
        <p role="alert" className={s.error}>
          {error.slice(0, 1000)}
        </p>
      </div>
    );
  if (
    !validArtifactDraft(document, draft) ||
    !validCommandState(saveState) ||
    !validCommandState(exportState)
  )
    return (
      <div {...rootProps} data-status="invalid">
        <p role="alert">
          Artifact revisions or commands are invalid or exceed the 100,000-character limit.
        </p>
      </div>
    );

  const { dirty, conflict, busy, problem, locked, status, message } = artifactPresentation({
    document,
    draft,
    access,
    saveState,
    exportState,
    saveCommand,
    exportCommand,
  });
  const readOnly = locked || !onDraftChange;
  function change(next: ArtifactDraftChange) {
    if (
      activeScope.current !== scope ||
      readOnly ||
      !sameDocumentIdentity(next.target, draft) ||
      typeof next.text !== 'string' ||
      next.text.length > maxArtifactCharacters
    )
      return;
    onDraftChange?.(Object.freeze({ target: identity(draft), text: next.text }));
  }

  return (
    <div {...rootProps} data-status={status} data-dirty={dirty}>
      <p id={statusId} role={conflict || problem ? 'alert' : 'status'}>
        {message}
      </p>
      {access === 'read-only' && (
        <p className={s.metadata}>Read-only access. Saving and draft edits are unavailable.</p>
      )}
      {onSave && !saveCommand && (
        <p className={s.metadata}>Saving isn’t available for this draft yet.</p>
      )}
      {onExport && !exportCommand && (
        <p className={s.metadata}>Export isn’t available for this draft yet.</p>
      )}
      <p className={s.metadata}>
        Draft {draft.version} · Based on {draft.base.version}
      </p>
      <ArtifactEditorContent
        document={document}
        draft={draft}
        label={label}
        view={view}
        onViewChange={onViewChange}
        renderEditor={renderEditor}
        readOnly={readOnly}
        statusId={statusId}
        onChange={change}
      />
      <ArtifactReceiptStatus
        kind="save"
        state={saveState}
        onLookupReceipt={onLookupReceipt}
        lookupPending={receiptLookupPending}
      />
      <ArtifactReceiptStatus
        kind="export"
        state={exportState}
        onLookupReceipt={onLookupReceipt}
        lookupPending={receiptLookupPending}
      />
      <ArtifactEditorActions
        document={document}
        draft={draft}
        saveCommand={saveCommand}
        saveState={saveState}
        onSave={onSave}
        exportCommand={exportCommand}
        exportState={exportState}
        onExport={onExport}
        locked={locked}
        exportLocked={busy || conflict || !!problem}
        dirty={dirty}
        active={() => activeScope.current === scope}
      />
    </div>
  );
}
