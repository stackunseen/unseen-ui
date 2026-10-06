import { CodeDiff } from '../code-diff/code-diff.js';
import { Tabs } from '../tabs/tabs.js';
import { Textarea } from '../textarea/textarea.js';
import { identity, maxArtifactCharacters, snapshot } from './model.js';
import type { ArtifactDraftChange, ArtifactEditorProps } from './types.js';
import s from './artifact-editor.module.css';

export function ArtifactEditorContent({
  document,
  draft,
  label,
  view,
  onViewChange,
  renderEditor,
  readOnly,
  statusId,
  onChange,
}: Pick<ArtifactEditorProps, 'document' | 'draft' | 'onViewChange' | 'renderEditor'> & {
  label: string;
  view: 'preview' | 'edit' | 'diff';
  readOnly: boolean;
  statusId: string;
  onChange: (change: ArtifactDraftChange) => void;
}) {
  const preview = (
    <>
      <pre className={s.source} tabIndex={0} role="region" aria-label={`${label} preview`}>
        {draft.text.slice(0, 20_000)}
      </pre>
      {draft.text.length > 20_000 && (
        <p className={s.metadata}>
          Preview truncated at 20,000 characters. Edit or compare the bounded draft to inspect more.
        </p>
      )}
    </>
  );
  const editor =
    view === 'edit' ? (
      renderEditor ? (
        renderEditor({
          document: snapshot(draft),
          label,
          readOnly,
          onDocumentChange: onChange,
        })
      ) : (
        <Textarea
          aria-label={label}
          aria-describedby={statusId}
          className={s.draft}
          value={draft.text}
          readOnly={readOnly}
          maxLength={maxArtifactCharacters}
          onChange={(event) =>
            onChange({ target: identity(draft), text: event.currentTarget.value })
          }
        />
      )
    ) : null;
  const diff =
    view === 'diff' ? (
      <CodeDiff
        path={draft.path ?? label}
        before={document.text}
        after={draft.text}
        baseVersion={document.version}
        nextVersion={draft.version}
        copyable={false}
      />
    ) : null;
  return onViewChange ? (
    <Tabs
      label={`${label} views`}
      value={view}
      onValueChange={(value) => {
        if (value === 'preview' || value === 'edit' || value === 'diff') onViewChange(value);
      }}
      items={[
        { value: 'preview', label: 'Preview', content: view === 'preview' ? preview : null },
        { value: 'edit', label: 'Edit', content: editor },
        { value: 'diff', label: 'Changes', content: diff },
      ]}
    />
  ) : view === 'edit' ? (
    editor
  ) : view === 'diff' ? (
    diff
  ) : (
    preview
  );
}
