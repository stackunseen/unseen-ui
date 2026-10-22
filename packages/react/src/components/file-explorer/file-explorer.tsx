'use client';
import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Accordion } from '../accordion/accordion.js';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { fileRequest, inspectFiles, inspectFileSelection, pathParts } from './file-model.js';
import type {
  FileFolder,
  WorkspaceFile,
  WorkspaceFileSnapshot,
  FileOpenRequest,
  WorkspaceFileSelection,
  FilePage,
} from './file-model.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/coding.module.css';
import css from './file-explorer.module.css';
import { DiffStat } from '../diff-stat/diff-stat.js';
import { stateLabel } from '../../shared/labels.js';
export type {
  WorkspaceFile,
  WorkspaceFileSnapshot,
  FileOpenRequest,
  WorkspaceFileSelection,
  FilePage,
} from './file-model.js';
export interface FileExplorerProps extends VariantProps<'FileExplorer'> {
  files: readonly WorkspaceFile[];
  expandedPaths: readonly string[];
  onExpandedPathsChange?: (paths: string[]) => void;
  selectedId?: string;
  selection?: WorkspaceFileSelection;
  /** Legacy unscoped callback; onRequestOpen takes precedence when supplied. */
  onSelect?: (file: WorkspaceFile) => void;
  onRequestOpen?: (request: FileOpenRequest) => void;
  context?: WorkspaceFileSnapshot;
  query?: string;
  onQueryChange?: (query: string) => void;
  pagination?: FilePage;
  onPageChange?: (index: number, context?: WorkspaceFileSnapshot) => void;
  onRefresh?: (context?: WorkspaceFileSnapshot) => void;
  status?:
    'ready' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown' | 'stale' | 'refreshing';
  error?: string;
  title?: string;
}
const changeTone = { added: 'success', modified: 'warning', deleted: 'danger' } as const;

export function FileExplorer({
  files,
  expandedPaths,
  onExpandedPathsChange,
  selectedId,
  selection,
  onSelect,
  onRequestOpen,
  context,
  query = '',
  onQueryChange,
  pagination,
  onPageChange,
  onRefresh,
  status = 'ready',
  error,
  title = 'Workspace files',
  variant = 'folders',
}: FileExplorerProps) {
  const prefix = `files-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`,
    root = useRef<HTMLDivElement>(null),
    focused = useRef<HTMLElement | null>(null);
  const visible = ['ready', 'stale', 'refreshing'].includes(status);
  const model = useMemo(
    () => (visible ? inspectFiles(files, expandedPaths, context, pagination, query) : undefined),
    [files, expandedPaths, context, pagination, query, visible],
  );
  useLayoutEffect(() => {
    if (
      focused.current &&
      (!focused.current.isConnected || focused.current.matches(':disabled')) &&
      document.activeElement === document.body
    )
      root.current?.focus({ preventScroll: true });
  });
  const heading =
    typeof title === 'string' && title.trim() ? title.slice(0, 200) : 'Workspace files';
  const frame = (children: ReactNode) => (
    <div
      ref={root}
      className={`${s.root} ${s.panel} ${css.root}`}
      role="group"
      aria-label={heading}
      tabIndex={-1}
      data-part="file-explorer"
      data-variant={variant}
      data-state={status}
      onFocusCapture={(event) => {
        focused.current = event.target as HTMLElement;
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          focused.current = null;
      }}
    >
      <div className={s.header}>
        <strong>{heading}</strong>
        {onRefresh && model && (
          <IconButton
            icon="retry"
            label="Refresh file window"
            disabled={status === 'refreshing'}
            onClick={() => onRefresh(model.context)}
          />
        )}
      </div>
      <div className={`${s.body} ${css.body}`}>{children}</div>
    </div>
  );
  if (!visible)
    return frame(
      status === 'loading' ? (
        <LoadingIndicator label="Loading files" />
      ) : (
        <p role="status" className={s.muted}>
          {status === 'denied'
            ? 'Workspace file access denied.'
            : status === 'unavailable'
              ? 'Workspace files unavailable.'
              : status === 'error'
                ? typeof error === 'string' && error.trim()
                  ? error.slice(0, 1000)
                  : 'Files are unavailable.'
                : 'Workspace file availability is unknown.'}
        </p>
      ),
    );
  if (!model)
    return frame(
      <p role="alert" className={s.error}>
        File paths, identities, page metadata or preview limits are invalid. Supply a current
        bounded window.
      </p>,
    );
  const scoped = selection === undefined ? undefined : inspectFileSelection(selection);
  const candidate = model.byId.get(scoped?.fileId ?? selectedId ?? '');
  const valid =
    candidate &&
    (!candidate.access || candidate.access === 'available') &&
    !(selection && selectedId) &&
    (selection === undefined ||
      (scoped &&
        model.context &&
        scoped.workspaceId === model.context.workspaceId &&
        scoped.snapshotVersion === model.context.version &&
        scoped.path === candidate.path &&
        scoped.fileVersion === candidate.version));
  const selected = valid ? candidate : undefined;
  const selectionMissing = Boolean(selection || selectedId) && !selected;
  const interactive = status === 'ready';
  const canOpen = interactive && (onRequestOpen ? !!model.context : !!onSelect);
  function open(file: WorkspaceFile) {
    if (!canOpen || (file.access && file.access !== 'available')) return;
    if (onRequestOpen && model!.context) onRequestOpen(fileRequest(model!.context, file));
    else onSelect?.(file);
  }
  function fileButton(file: WorkspaceFile, full = false) {
    const denied = file.access && file.access !== 'available';
    return (
      <button
        type="button"
        className={css.file}
        data-file-id={file.id}
        aria-current={selected?.id === file.id ? 'true' : undefined}
        aria-label={`Open ${file.path}`}
        disabled={!canOpen || !!denied}
        onClick={() => open(file)}
      >
        <AIIcon name="document" />
        <span data-part="file-name">{full ? file.path : pathParts(file.path)!.at(-1)}</span>
        {(denied || file.change) && (
          <span className={s.badge} data-tone={denied ? 'danger' : changeTone[file.change!]}>
            {denied ? stateLabel(`${file.access} access`) : stateLabel(file.change!)}
          </span>
        )}
        {file.lines && !denied && (
          <DiffStat added={file.lines.added} removed={file.lines.removed} />
        )}
      </button>
    );
  }
  // Only what the host supplied: three "unknown"s on every row is noise, not information.
  function metadata(file: WorkspaceFile) {
    const parts = [
      file.version !== undefined && `Version: ${file.version}`,
      file.sizeBytes !== undefined && `Size: ${file.sizeBytes.toLocaleString('en-US')} bytes`,
      file.modifiedAt !== undefined &&
        `Modified: ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(file.modifiedAt)} UTC`,
    ].filter(Boolean);
    return parts.length ? <p className={s.muted}>{parts.join(' · ')}</p> : null;
  }
  function folderView(folder: FileFolder, depth = 0): ReactNode {
    return (
      <div className={css.folder} data-folder-depth={depth}>
        {!!folder.folders.size && (
          <Accordion
            className={css.tree}
            type="multiple"
            region={false}
            headingLevel={Math.min(3 + depth, 6) as 3 | 4 | 5 | 6}
            value={model!.expandedPaths.filter((path) =>
              [...folder.folders.values()].some((f) => f.path === path),
            )}
            onValueChange={(values) => {
              const own = new Set([...folder.folders.values()].map((f) => f.path));
              onExpandedPathsChange?.([
                ...model!.expandedPaths.filter((path) => !own.has(path)),
                ...values,
              ]);
            }}
            items={[...folder.folders.values()].map((child) => ({
              value: child.path,
              title: (
                <span className={css.folderTitle}>
                  <span>{child.name}</span>
                  <span className={s.muted}>
                    {child.count} {child.count === 1 ? 'file' : 'files'}
                  </span>
                </span>
              ),
              disabled: !onExpandedPathsChange,
              content: folderView(child, depth + 1),
            }))}
          />
        )}
        {!!folder.files.length && (
          <ul
            className={css.files}
            aria-label={folder.path ? `${folder.path} files` : 'Root files'}
          >
            {folder.files.map((file) => (
              <li key={file.id}>{fileButton(file)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const total = model.pagination?.totalFiles;
  const page = model.pagination;
  const hasNext =
    page &&
    (total === undefined
      ? page.hasNextPage === true
      : (page.pageIndex + 1) * page.pageSize < total);
  return frame(
    <>
      {/* The window only needs describing when it is a page of more, or a snapshot. */}
      {(page || model.context) && (
        <p className={s.muted}>
          {model.files.length} files in this window
          {page
            ? ` · Page ${page.pageIndex + 1} · Total: ${total === undefined ? 'Unknown' : total}`
            : ''}
          {model.context
            ? ` · Workspace: ${model.context.workspaceId} · Snapshot: ${model.context.version}`
            : ''}
        </p>
      )}
      {status !== 'ready' && (
        <p role="status" className={s.muted}>
          {status === 'stale'
            ? 'Historical file window. Refresh before opening a file.'
            : 'Refreshing file window. File opening is paused.'}
        </p>
      )}
      {selectionMissing && (
        <p role="status" className={s.muted}>
          Selected file is unavailable, ambiguous or outside this snapshot. Request a current
          selection.
        </p>
      )}
      {model.obsoleteExpansion.length > 0 && (
        <p className={s.muted}>
          {model.obsoleteExpansion.length} expanded folder paths are outside this window.
        </p>
      )}
      {!canOpen && interactive && (
        <p className={s.muted}>
          {onRequestOpen && !model.context
            ? 'Scoped file opening requires current workspace/snapshot identity.'
            : 'File opening unavailable: no host handler supplied.'}
        </p>
      )}
      {onQueryChange && (
        <label className={css.search}>
          <span>Filter this file window</span>
          <input
            type="search"
            value={model.query}
            maxLength={200}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      )}
      {model.query && (
        <p className={s.muted}>
          {model.filtered.length} matching files in this window. Other host pages are not searched.
        </p>
      )}
      {selected && !model.filtered.some((file) => file.id === selected.id) && (
        <p className={s.muted}>Selected file is outside this window filter.</p>
      )}
      {!model.filtered.length ? (
        <p className={s.muted}>
          {model.files.length
            ? 'No files match this window filter.'
            : 'No files in this workspace window.'}
        </p>
      ) : variant === 'folders' ? (
        folderView(model.root)
      ) : variant === 'list' ? (
        <ul className={`${css.files} ${css.rows}`} aria-label="File details list">
          {model.filtered.map((file) => (
            <li className={css.row} key={file.id}>
              {fileButton(file, true)}
              {metadata(file)}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={css.groups} aria-label="Files by directory">
          {[...model.groups].map(([directory, group], i) => (
            <li key={directory}>
              <h3 id={`${prefix}-directory-${i}`} className={css.directory}>
                {directory || 'Workspace root'} · {group.length}
              </h3>
              <ul className={css.files} aria-labelledby={`${prefix}-directory-${i}`}>
                {group.map((file) => (
                  <li key={file.id}>{fileButton(file)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div
          role="group"
          aria-label="Selected file details"
          className={css.inspector}
          data-part="file-inspector"
        >
          <strong>{selected.path}</strong>
          {metadata(selected)}
          <p className={s.muted}>
            File ID: {selected.id}. Opening intent does not confirm a read, permission or execution
            outcome.
          </p>
        </div>
      )}
      {page && (
        <div className={css.actions} role="group" aria-label="File window pagination">
          <Button
            size="sm"
            variant="outline"
            aria-label="Previous file page"
            disabled={!interactive || !onPageChange || page.pageIndex === 0}
            onClick={() => onPageChange?.(page.pageIndex - 1, model.context)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Next file page"
            disabled={!interactive || !onPageChange || !hasNext}
            onClick={() => onPageChange?.(page.pageIndex + 1, model.context)}
          >
            Next
          </Button>
        </div>
      )}
    </>,
  );
}
