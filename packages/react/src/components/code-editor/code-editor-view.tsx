'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Compartment, EditorState, EditorSelection } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
  Decoration,
  WidgetType,
} from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  HighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { validTextRange, applyTextEdits } from '@stackunseen/ui-core/editing';
import {
  editorText,
  editorOffset,
  hostOffset,
  insertedText,
  lineBoundary,
} from './text-offsets.js';
import type { TextEdit } from '@stackunseen/ui-core/editing';
import type {
  CodeEditorChange,
  CodeEditorProps,
  CodeEditorProposalIntent,
} from './code-editor-types.js';
import {
  EDITOR_LIMIT,
  currentDiagnostics,
  editorWritable,
  validSelection,
  proposalIssue,
} from './code-editor-model.js';

class CompletionPreview extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: CompletionPreview) {
    return other.text === this.text;
  }
  toDOM(view: EditorView) {
    const span = view.dom.ownerDocument.createElement('span');
    span.className = 'cm-completion-preview';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = editorText(this.text);
    return span;
  }
}

function configuration(props: CodeEditorProps, descriptionId: string): Extension[] {
  const writable = editorWritable(props);
  const language = props.document.language?.toLowerCase();
  return [
    EditorView.decorations.of(
      Decoration.set(
        props.proposal?.kind === 'completion' &&
          !proposalIssue(props.document, props.proposal) &&
          props.commandState?.status !== 'pending' &&
          props.commandState?.status !== 'unknown'
          ? props.proposal.edits
              .filter(
                (edit) =>
                  edit.range.from === edit.range.to &&
                  lineBoundary(props.document.text, edit.range.from),
              )
              .map((edit) =>
                Decoration.widget({ widget: new CompletionPreview(edit.insert), side: 1 }).range(
                  editorOffset(props.document.text, edit.range.from),
                ),
              )
          : [],
        true,
      ),
    ),
    EditorState.readOnly.of(!writable),
    EditorView.editable.of(writable),
    EditorView.contentAttributes.of({
      role: 'textbox',
      'aria-label': props.label ?? props.document.path ?? 'Code editor',
      'aria-describedby': descriptionId,
      'aria-multiline': 'true',
      'aria-readonly': String(!writable),
      tabindex: '0',
      spellcheck: 'false',
    }),
    ...(['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(language ?? '')
      ? [
          javascript({
            typescript: ['typescript', 'ts', 'tsx'].includes(language!),
            jsx: ['jsx', 'tsx'].includes(language!),
          }),
        ]
      : []),
  ];
}
// The editor, not the scroller, carries the minimum height: the scroller then has a definite
// height to fill, so the gutter runs the full height of the box instead of stopping at the
// last line. Code and line numbers share the theme's mono family and one line height.
const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--ai-text, #0f172a)',
    backgroundColor: 'var(--ai-surface, #fff)',
    fontSize: 'var(--ai-font-size, 14px)',
    minHeight: 'var(--ai-code-editor-min-height, 180px)',
  },
  '.cm-scroller': {
    flex: '1 1 auto',
    overflow: 'auto',
    maxHeight: 'var(--ai-code-editor-max-height, 480px)',
    fontFamily: 'var(--ai-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace)',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '10px 0',
    caretColor: 'var(--ai-primary-text, #1d4ed8)',
  },
  '.cm-line': { padding: '0 12px 0 8px' },
  // CodeMirror sizes the gutter to the content (an inline min-height); stretching it as a flex
  // item fills the editor's minimum height instead, so short files still get a full-height gutter.
  '.cm-gutters': {
    height: 'auto',
    alignSelf: 'stretch',
    color: 'var(--ai-muted, #475569)',
    backgroundColor: 'var(--ai-surface-subtle, #f1f5f9)',
    borderRight: '1px solid var(--ai-border, #cbd5e1)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px' },
  '.cm-cursor': { borderLeftColor: 'var(--ai-primary-text, #1d4ed8)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--ai-primary-soft, #dbeafe)',
  },
  '.cm-tooltip': {
    color: 'var(--ai-text, #0f172a)',
    backgroundColor: 'var(--ai-surface, #fff)',
    borderColor: 'var(--ai-border, #cbd5e1)',
  },
  '.cm-completion-preview': {
    color: 'var(--ai-muted, #475569)',
    opacity: '0.8',
    whiteSpace: 'pre-wrap',
  },
});

// Preserve CodeMirror's tag groups and emphasis while replacing its fixed light palette.
const syntaxStyle = HighlightStyle.define(
  defaultHighlightStyle.specs.map((spec) => ({
    ...spec,
    color: !spec.color
      ? undefined
      : ['#940', '#404740'].includes(spec.color)
        ? 'var(--ai-muted, #475569)'
        : spec.color === '#f00'
          ? 'var(--ai-danger, #991b1b)'
          : ['#164', '#a11', '#e40', '#30a', '#085', '#167', '#256'].includes(spec.color)
            ? 'var(--ai-secondary-text, #6d28d9)'
            : 'var(--ai-primary-text, #1d4ed8)',
  })),
);

/** CodeMirror's document changes remain requests until the controlled host updates props. */
export function CodeEditorView({
  props,
  descriptionId,
  request,
}: {
  props: CodeEditorProps;
  descriptionId: string;
  request: (type: CodeEditorProposalIntent['type'], indices?: readonly number[]) => boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | undefined>(undefined);
  const compartment = useRef(new Compartment());
  const latest = useRef({ props, descriptionId, request });
  const requestedSelection = useRef<
    Pick<CodeEditorChange, 'target' | 'text' | 'selection'> | undefined
  >(undefined);
  latest.current = { props, descriptionId, request };
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    const initial = latest.current;
    let disposed = false;
    let instance: EditorView | undefined;
    try {
      instance = new EditorView({
        parent: node.current,
        state: EditorState.create({
          doc: editorText(initial.props.document.text),
          selection:
            initial.props.selection &&
            validSelection(initial.props.selection, initial.props.document.text)
              ? EditorSelection.single(
                  editorOffset(initial.props.document.text, initial.props.selection.anchor),
                  editorOffset(initial.props.document.text, initial.props.selection.head),
                )
              : undefined,
          extensions: [
            compartment.current.of(configuration(initial.props, initial.descriptionId)),
            lineNumbers(),
            drawSelection(),
            bracketMatching(),
            syntaxHighlighting(syntaxStyle),
            lintGutter(),
            editorTheme,
            EditorView.lineWrapping,
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  if (!latest.current.props.proposal) return false;
                  latest.current.request('accept');
                  return true;
                },
              },
              {
                key: 'Alt-ArrowRight',
                run: () => {
                  if (
                    !latest.current.props.proposal ||
                    !latest.current.props.proposal.edits?.length
                  )
                    return false;
                  latest.current.request('partial-accept', [0]);
                  return true;
                },
              },
              {
                key: 'Escape',
                run: () => {
                  if (!latest.current.props.proposal) return false;
                  latest.current.request('dismiss');
                  return true;
                },
              },
              ...defaultKeymap,
            ]),
          ],
        }),
        dispatchTransactions(transactions, current) {
          if (disposed) return;
          const p = latest.current.props;
          if (transactions.some((transaction) => transaction.docChanged)) {
            // Reconcile native DOM mutations back to the controlled snapshot.
            current.update([current.state.update({})]);
            if (!editorWritable(p) || current.state.doc.toString() !== editorText(p.document.text))
              return;
            const last = transactions.at(-1)!;
            const edits: TextEdit[] = [];
            // CodeMirror dispatches sequential transactions; reject ambiguous mixed batches.
            if (transactions.length !== 1) return;
            last.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
              edits.push({
                range: {
                  from: hostOffset(p.document.text, from),
                  to: hostOffset(p.document.text, to),
                },
                insert: insertedText(inserted.toString(), p.document.text),
              }),
            );
            if (edits.some((edit) => !validTextRange(edit.range, p.document.text))) return;
            const result = applyTextEdits(p.document, p.document, edits, EDITOR_LIMIT);
            if (!result.ok) return;
            const text = result.text;
            const anchor = hostOffset(text, last.newSelection.main.anchor),
              head = hostOffset(text, last.newSelection.main.head);
            if (!validSelection({ anchor, head }, text)) return;
            requestedSelection.current = {
              target: { documentId: p.document.documentId, version: p.document.version },
              text,
              selection: { anchor, head },
            };
            p.onChange?.({
              target: { documentId: p.document.documentId, version: p.document.version },
              text,
              edits,
              selection: { anchor, head },
            });
            return;
          }
          const last = transactions.at(-1);
          if (last?.selection) {
            const anchor = hostOffset(p.document.text, last.newSelection.main.anchor),
              head = hostOffset(p.document.text, last.newSelection.main.head);
            if (!validSelection({ anchor, head }, p.document.text)) return;
            p.onSelectionChange?.({
              target: { documentId: p.document.documentId, version: p.document.version },
              selection: { anchor, head },
            });
            if (p.selection) {
              current.update([current.state.update({ selection: current.state.selection })]);
              return;
            }
          }
          current.update(transactions);
        },
      });
      view.current = instance;
      // Initial diagnostics are set here because mount happens after layout effects.
      const diagnostics = currentDiagnostics(initial.props.document, initial.props.diagnostics);
      instance.update([
        instance.state.update(
          setDiagnostics(
            instance.state,
            diagnostics.map((d) => ({
              from: editorOffset(initial.props.document.text, d.range.from),
              to: editorOffset(initial.props.document.text, d.range.to),
              severity: d.severity,
              message: d.message.slice(0, 2000),
              source: d.source?.slice(0, 200),
            })),
          ),
        ),
      ]);
      return () => {
        disposed = true;
        view.current = undefined;
        instance?.destroy();
      };
    } catch {
      disposed = true;
      instance?.destroy();
      view.current = undefined;
      setFailure(true);
    }
  }, []);
  useLayoutEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const diagnostics = currentDiagnostics(props.document, props.diagnostics);
    const textChanged = instance.state.doc.toString() !== editorText(props.document.text);
    const requested = requestedSelection.current;
    const selected =
      props.selection && validSelection(props.selection, props.document.text)
        ? props.selection
        : !props.selection &&
            requested?.target.documentId === props.document.documentId &&
            requested.text === props.document.text &&
            requested.target.version !== props.document.version &&
            validSelection(requested.selection, props.document.text)
          ? requested.selection
          : undefined;
    const changes = textChanged
      ? { from: 0, to: instance.state.doc.length, insert: editorText(props.document.text) }
      : undefined;
    instance.update([
      instance.state.update({
        changes,
        selection: selected
          ? EditorSelection.single(
              editorOffset(props.document.text, selected.anchor),
              editorOffset(props.document.text, selected.head),
            )
          : undefined,
        effects: compartment.current.reconfigure(configuration(props, descriptionId)),
      }),
    ]);
    if (
      requested &&
      (props.document.version !== requested.target.version ||
        props.document.documentId !== requested.target.documentId)
    )
      requestedSelection.current = undefined;
    instance.update([
      instance.state.update(
        setDiagnostics(
          instance.state,
          diagnostics.map((d) => ({
            from: editorOffset(props.document.text, d.range.from),
            to: editorOffset(props.document.text, d.range.to),
            severity: d.severity,
            message: d.message.slice(0, 2000),
            source: d.source?.slice(0, 200),
          })),
        ),
      ),
    ]);
  }, [props, descriptionId]);
  return (
    <>
      {failure ? <p role="alert">The editor could not be initialized.</p> : null}
      <div ref={node} data-part="editor-surface" />
    </>
  );
}
