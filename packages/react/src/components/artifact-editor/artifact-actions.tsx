import { useRef } from 'react';
import { Button } from '../button/button.js';
import { canSubmit, identity, snapshot } from './model.js';
import type { ArtifactEditorProps } from './types.js';
import s from './artifact-editor.module.css';

export function ArtifactEditorActions({
  document,
  draft,
  saveCommand,
  saveState,
  onSave,
  exportCommand,
  exportState,
  onExport,
  locked,
  exportLocked,
  dirty,
  active,
}: Required<Pick<ArtifactEditorProps, 'document' | 'draft' | 'saveState' | 'exportState'>> &
  Pick<ArtifactEditorProps, 'saveCommand' | 'onSave' | 'exportCommand' | 'onExport'> & {
    locked: boolean;
    exportLocked: boolean;
    dirty: boolean;
    active: () => boolean;
  }) {
  // Suppress repeated intent events only; never infer execution or acknowledgement.
  const emitted = useRef<{ save?: string; export?: string }>({});
  return (
    <div className={s.actions} data-part="artifact-editor-actions">
      {onExport && (
        <Button
          variant="outline"
          disabled={exportLocked || !canSubmit(exportCommand, exportState, draft)}
          onClick={() => {
            if (
              !active() ||
              !exportCommand ||
              emitted.current.export === exportCommand.commandId ||
              exportLocked ||
              !canSubmit(exportCommand, exportState, draft)
            )
              return;
            emitted.current.export = exportCommand.commandId;
            onExport(
              Object.freeze({
                kind: 'export',
                commandId: exportCommand.commandId,
                target: identity(draft),
                document: snapshot(draft),
              }),
            );
          }}
        >
          Export draft
        </Button>
      )}
      {onSave && (
        <Button
          disabled={locked || !dirty || !canSubmit(saveCommand, saveState, draft)}
          onClick={() => {
            if (
              !active() ||
              !saveCommand ||
              emitted.current.save === saveCommand.commandId ||
              locked ||
              !dirty ||
              !canSubmit(saveCommand, saveState, draft)
            )
              return;
            emitted.current.save = saveCommand.commandId;
            onSave(
              Object.freeze({
                kind: 'save',
                commandId: saveCommand.commandId,
                target: identity(draft),
                base: identity(document),
                text: draft.text,
              }),
            );
          }}
        >
          Save draft
        </Button>
      )}
    </div>
  );
}
