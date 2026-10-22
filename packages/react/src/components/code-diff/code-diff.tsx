'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { diffLines } from 'diff';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type { DocumentIdentity } from '@stackunseen/ui-core/editing';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/coding.module.css';

export interface CodeDiffProps extends VariantProps<'CodeDiff'> {
  path: string;
  before: string;
  after: string;
  baseVersion: string;
  nextVersion: string;
  /** Paired host identities allow independent sources to share a version string. */
  sourceIdentities?: { readonly before: DocumentIdentity; readonly after: DocumentIdentity };
  status?: 'ready' | 'loading' | 'conflict' | 'denied' | 'error' | 'unavailable';
  error?: string;
  copyable?: boolean;
  /**
   * Shows "base → next" in the header. Turn it off when a page lists several diffs of the same pair
   * and states the comparison once; the versions still bind copies and feedback.
   */
  showVersions?: boolean;
  /** Trusted application rendering of an already bounded, visible source line. */
  renderLine?: (line: CodeDiffLine) => ReactNode;
  /**
   * Content under a line, such as review comments or a comment box. Return nothing for most lines.
   * It spans both columns in the split view and stays in view when long lines scroll sideways.
   */
  annotate?: (line: CodeDiffLine) => ReactNode;
}
export interface CodeDiffLine {
  readonly kind: 'context' | 'added' | 'removed';
  readonly text: string;
  readonly beforeLine?: number;
  readonly afterLine?: number;
  readonly side: 'before' | 'after';
}
interface DiffRow {
  kind: 'context' | 'added' | 'removed';
  text: string;
  old?: number;
  next?: number;
}
export function CodeDiff({
  path,
  before,
  after,
  baseVersion,
  nextVersion,
  sourceIdentities,
  status = 'ready',
  variant = 'unified',
  copyable = true,
  showVersions = true,
  renderLine,
  annotate,
  error,
}: CodeDiffProps) {
  const identityValid =
    !sourceIdentities ||
    (sameDocumentIdentity(sourceIdentities.before, sourceIdentities.before) &&
      sameDocumentIdentity(sourceIdentities.after, sourceIdentities.after) &&
      !!sourceIdentities.before.documentId.trim() &&
      !!sourceIdentities.after.documentId.trim() &&
      sourceIdentities.before.documentId.length <= 256 &&
      sourceIdentities.after.documentId.length <= 256 &&
      sourceIdentities.before.version.length <= 256 &&
      sourceIdentities.after.version.length <= 256 &&
      sourceIdentities.before.version === baseVersion &&
      sourceIdentities.after.version === nextVersion);
  const sourceKey =
    sourceIdentities && identityValid
      ? JSON.stringify([sourceIdentities.before.documentId, sourceIdentities.after.documentId])
      : undefined;
  const versionValid =
    Boolean(baseVersion.trim() && nextVersion.trim()) &&
    identityValid &&
    (sourceIdentities
      ? !sameDocumentIdentity(sourceIdentities.before, sourceIdentities.after) || before === after
      : baseVersion !== nextVersion || before === after);
  const [feedback, setFeedback] = useState<{
    path: string;
    before: string;
    after: string;
    baseVersion: string;
    nextVersion: string;
    sourceKey?: string;
    message: string;
  }>();
  const copyRequest = useRef(0);
  useEffect(
    () => () => {
      copyRequest.current += 1;
    },
    [path, before, after, baseVersion, nextVersion, sourceKey, status, copyable],
  );
  const rows = useMemo((): DiffRow[] | undefined => {
    if (status !== 'ready' || !versionValid || before.length + after.length > 60000)
      return undefined;
    const changes = diffLines(before, after, { timeout: 50, maxEditLength: 2000 });
    if (!changes) return undefined;
    const output: DiffRow[] = [];
    let old = 1,
      next = 1;
    for (const change of changes) {
      const lines = change.value.split('\n');
      if (lines.at(-1) === '') lines.pop();
      for (const text of lines) {
        if (output.length >= 1500) return undefined;
        output.push({
          kind: change.added ? 'added' : change.removed ? 'removed' : 'context',
          text,
          old: change.added ? undefined : old++,
          next: change.removed ? undefined : next++,
        });
      }
    }
    return output;
  }, [before, after, status, versionValid]);
  // Pair replacement runs by position while preserving unified order and source line numbers.
  const paired = useMemo(() => {
    const pairs: { before?: DiffRow; after?: DiffRow }[] = [];
    if (!rows) return pairs;
    for (let index = 0; index < rows.length;) {
      const row = rows[index]!;
      if (row.kind === 'context') {
        pairs.push({ before: row, after: row });
        index += 1;
        continue;
      }
      const removed: DiffRow[] = [],
        added: DiffRow[] = [];
      while (index < rows.length && rows[index]!.kind !== 'context') {
        const changed = rows[index++]!;
        (changed.kind === 'removed' ? removed : added).push(changed);
      }
      for (let offset = 0; offset < Math.max(removed.length, added.length); offset++)
        pairs.push({ before: removed[offset], after: added[offset] });
    }
    return pairs;
  }, [rows]);
  async function copy(side: 'before' | 'after') {
    if (status !== 'ready' || !rows || !copyable) return;
    const attempt = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(side === 'before' ? before : after);
      if (copyRequest.current === attempt)
        setFeedback({
          path,
          before,
          after,
          baseVersion,
          nextVersion,
          sourceKey,
          message: `${side === 'before' ? 'Before' : 'After'} version copied`,
        });
    } catch {
      if (copyRequest.current === attempt)
        setFeedback({
          path,
          before,
          after,
          baseVersion,
          nextVersion,
          sourceKey,
          message: 'Copy unavailable. Select and copy the source.',
        });
    }
  }
  const currentFeedback =
    copyable &&
    status === 'ready' &&
    feedback?.path === path &&
    feedback.before === before &&
    feedback.after === after &&
    feedback.baseVersion === baseVersion &&
    feedback.nextVersion === nextVersion &&
    feedback.sourceKey === sourceKey
      ? feedback.message
      : undefined;
  const additions = rows?.filter((row) => row.kind === 'added').length ?? 0;
  const removals = rows?.filter((row) => row.kind === 'removed').length ?? 0;
  const lineOf = (row: DiffRow, side?: 'old' | 'next'): CodeDiffLine => ({
    kind: row.kind,
    text: row.text,
    beforeLine: row.old,
    afterLine: row.next,
    side: side === 'old' || row.kind === 'removed' ? 'before' : 'after',
  });
  const note = (row: DiffRow, key: string) => {
    const content = annotate?.(lineOf(row));
    return content === undefined || content === null || content === false ? null : (
      <div key={key} className={s.diffNote} data-part="code-diff-annotation">
        {content}
      </div>
    );
  };
  // The split view as aligned blocks of rows, broken wherever a note spans both columns.
  function splitBlocks() {
    const blocks: ReactNode[] = [];
    let start = 0;
    const flush = (end: number) => {
      if (end <= start) return;
      const slice = paired.slice(start, end);
      blocks.push(
        <div key={`rows-${start}`} className={s.split}>
          <div>
            {start === 0 && <strong className={s.splitLabel}>Before</strong>}
            <div
              className={s.diff}
              data-continued={start > 0 || undefined}
              data-more={end < paired.length || undefined}
            >
              {slice.map((pair, index) => line(pair.before ?? pair.after!, start + index, 'old'))}
            </div>
          </div>
          <div>
            {start === 0 && <strong className={s.splitLabel}>After</strong>}
            <div
              className={s.diff}
              data-continued={start > 0 || undefined}
              data-more={end < paired.length || undefined}
            >
              {slice.map((pair, index) => line(pair.after ?? pair.before!, start + index, 'next'))}
            </div>
          </div>
        </div>,
      );
    };
    paired.forEach((pair, index) => {
      const notes = [
        pair.before && note(pair.before, `note-b-${index}`),
        pair.after && pair.after !== pair.before && note(pair.after, `note-a-${index}`),
      ].filter(Boolean);
      if (!notes.length) return;
      flush(index + 1);
      blocks.push(...notes);
      start = index + 1;
    });
    flush(paired.length);
    return blocks;
  }
  function line(row: DiffRow, index: number, side?: 'old' | 'next') {
    const blank =
      (side === 'old' && row.kind === 'added') || (side === 'next' && row.kind === 'removed');
    return (
      <div
        key={index}
        className={`${s.diffLine} ${!blank && row.kind !== 'context' ? s[row.kind] : ''}`}
      >
        {side ? (
          <span aria-hidden="true" className={s.number}>
            {blank ? '' : row[side]}
          </span>
        ) : (
          <>
            <span aria-hidden="true" className={s.number}>
              {row.old}
            </span>
            <span aria-hidden="true" className={s.number}>
              {row.next}
            </span>
          </>
        )}
        <span
          role={!blank && row.kind !== 'context' ? 'img' : undefined}
          aria-hidden={blank || row.kind === 'context' ? true : undefined}
          aria-label={
            blank
              ? undefined
              : row.kind === 'added'
                ? 'Added'
                : row.kind === 'removed'
                  ? 'Removed'
                  : undefined
          }
        >
          {blank ? ' ' : row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}
        </span>
        <code>{blank ? ' ' : renderLine ? renderLine(lineOf(row, side)) : row.text || ' '}</code>
      </div>
    );
  }
  return (
    <div className={`${s.root} ${s.panel}`} data-part="code-diff" data-variant={variant}>
      <div className={s.header}>
        <strong>{path}</strong>
        {rows && (
          <span className={s.muted}>
            {before === ''
              ? `New file · +${additions}`
              : after === ''
                ? `Deleted · −${removals}`
                : `+${additions} added · −${removals} removed`}
          </span>
        )}
        {showVersions && (
          <span className={s.muted}>
            {baseVersion} → {nextVersion}
          </span>
        )}
        {copyable && status === 'ready' && (
          <div className={s.row}>
            <Button
              size="sm"
              variant="ghost"
              disabled={!rows}
              onClick={() => void copy('before')}
              aria-label="Copy before version"
            >
              <AIIcon name="copy" /> Before
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!rows}
              onClick={() => void copy('after')}
              aria-label="Copy after version"
            >
              <AIIcon name="copy" /> After
            </Button>
          </div>
        )}
      </div>
      {status === 'loading' ? (
        <div className={s.body}>
          <LoadingIndicator label="Loading comparison" />
        </div>
      ) : status !== 'ready' ? (
        <p role={status === 'error' ? 'alert' : 'status'} className={s.notice}>
          {status === 'denied'
            ? 'Access to this comparison is unavailable.'
            : status === 'conflict'
              ? 'The base changed. Resolve the conflict before reviewing.'
              : status === 'error'
                ? error?.slice(0, 1000) || 'Comparison could not be loaded. Retry through the host.'
                : 'This comparison is unavailable.'}
        </p>
      ) : !versionValid ? (
        <p role="status" className={s.notice}>
          Supply nonempty immutable version identifiers. One version cannot identify two different
          sources.
        </p>
      ) : !rows ? (
        <p role="status" className={s.notice}>
          Comparison exceeds the preview limit. Open these versions in your editor.
        </p>
      ) : before === after ? (
        <p className={s.notice}>No changes between these versions.</p>
      ) : (
        <div className={s.scroll} tabIndex={0} role="group" aria-label={`Changes in ${path}`}>
          {variant === 'split' ? (
            annotate ? (
              <div className={s.splitBlocks}>{splitBlocks()}</div>
            ) : (
              <div className={s.split}>
                <div>
                  <strong className={s.splitLabel}>Before</strong>
                  <div className={s.diff}>
                    {paired.map((pair, index) => line(pair.before ?? pair.after!, index, 'old'))}
                  </div>
                </div>
                <div>
                  <strong className={s.splitLabel}>After</strong>
                  <div className={s.diff}>
                    {paired.map((pair, index) => line(pair.after ?? pair.before!, index, 'next'))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className={s.diff}>
              {rows.map((row, index) => [line(row, index), note(row, `note-${index}`)])}
            </div>
          )}
          {/* A new or deleted file has no newline change worth reporting. */}
          {before !== '' && after !== '' && before.endsWith('\n') !== after.endsWith('\n') && (
            <p className={s.notice}>
              Trailing newline {after.endsWith('\n') ? 'added' : 'removed'}.
            </p>
          )}
        </div>
      )}
      {currentFeedback && (
        <p role="status" className={s.notice}>
          {currentFeedback}
        </p>
      )}
    </div>
  );
}
