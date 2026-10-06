'use client';
import { useState } from 'react';
import { Button, FileExplorer, IconsProvider, resolveVariant } from '@stackunseen/ui';
import type { WorkspaceFile, FileOpenRequest, FileExplorerProps } from '@stackunseen/ui';
import { files as fixtureFiles, before } from '../lib/coding-fixtures';
import styles from './form-specimen.module.css';

export function FileSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [revision, setRevision] = useState(1),
    [revoked, setRevoked] = useState(false),
    [pageIndex, setPageIndex] = useState(0),
    [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(
    state === 'Deep folders'
      ? Array.from(
          { length: 12 },
          (_, i) => '/' + Array.from({ length: i + 1 }, (_, j) => `folder-${j + 1}`).join('/'),
        )
      : ['/src', '/tests'],
  );
  const [selection, setSelection] = useState<FileOpenRequest | undefined>(
    [
      'Selected file',
      'Obsolete selection',
      'File version changed',
      'Missing selection',
      'Workspace changed',
      'Access revoked',
    ].includes(state)
      ? {
          workspaceId: 'demo-workspace',
          snapshotVersion: 'v1-0',
          fileId: state === 'Missing selection' ? 'absent' : 'search',
          path: 'src/search.ts',
          fileVersion: 'file-search-1',
        }
      : undefined,
  );
  const [request, setRequest] = useState<FileOpenRequest>();
  const context = {
    workspaceId: state === 'Workspace changed' ? 'replaced-workspace' : 'demo-workspace',
    version: state === 'Obsolete selection' ? 'obsolete-replaced' : `v${revision}-${pageIndex}`,
  };
  let files: WorkspaceFile[] = fixtureFiles.map((file) => ({
    ...file,
    version: `file-${file.id}-${revision}`,
    sizeBytes: file.id === 'search' ? new TextEncoder().encode(before).length : undefined,
    modifiedAt: file.id === 'search' ? 1790676000000 : undefined,
  }));
  if (state === 'Long paths')
    files.push({
      id: 'long',
      path: 'src/features/enterprise-search/components/AccessibleSearchSuggestionsWithLongFileName.tsx',
      version: 'long-1',
      change: 'modified',
    });
  if (state === 'Deep folders')
    files = [
      {
        id: 'deep',
        path:
          Array.from({ length: 12 }, (_, i) => `folder-${i + 1}`).join('/') +
          '/CompleteCustomerDeploymentAccessReview.ts',
        version: 'deep-1',
      },
    ];
  if (state === 'Root directory collision')
    files = [
      { id: 'root', path: 'README.md' },
      { id: 'nested', path: 'Workspace root/README.md' },
    ];
  if (state === 'File version changed') files[0] = { ...files[0]!, version: 'changed-content' };
  if (state === 'Access revoked') files[0] = { ...files[0]!, access: 'denied' };
  if (state === 'Unknown file access') files[0] = { ...files[0]!, access: 'unknown' };
  if (state === 'Invalid paths') files = [{ id: 'invalid', path: 'src/../protected.ts' }];
  if (state === 'Duplicate IDs') files = [files[0]!, { ...files[1]!, id: 'search' }];
  if (['Window limit', 'Bounds'].includes(state))
    files = Array.from({ length: state === 'Bounds' ? 501 : 500 }, (_, i) => ({
      id: String(i),
      path: `src/module-${i}.ts`,
      version: 'window-1',
    }));
  if (state === 'Empty') files = [];
  const paged = ['Known pages', 'Unknown total', 'Unknown next', 'Invalid page'].includes(state);
  if (paged) files = pageIndex === 0 ? files.slice(0, 3) : files.slice(3);
  const pagination = paged
    ? {
        pageIndex,
        pageSize: state === 'Invalid page' ? 1 : 3,
        totalFiles: state === 'Known pages' ? 5 : undefined,
        hasNextPage: state === 'Unknown next' ? undefined : pageIndex === 0,
      }
    : undefined;
  const status: FileExplorerProps['status'] = revoked
    ? 'denied'
    : state === 'Loading'
      ? 'loading'
      : state === 'Denied'
        ? 'denied'
        : state === 'Unavailable'
          ? 'unavailable'
          : state === 'Error'
            ? 'error'
            : state === 'Unknown'
              ? 'unknown'
              : state === 'Stale'
                ? 'stale'
                : state === 'Refreshing'
                  ? 'refreshing'
                  : 'ready';
  const current =
    request &&
    status === 'ready' &&
    request.workspaceId === context.workspaceId &&
    request.snapshotVersion === context.version &&
    files.some(
      (file) =>
        file.id === request.fileId &&
        file.path === request.path &&
        file.version === request.fileVersion &&
        (!file.access || file.access === 'available'),
    );
  return (
    <div className={styles.root}>
      <IconsProvider icons={state === 'Icon overrides' ? { document: null } : undefined}>
        <FileExplorer
          variant={resolveVariant('FileExplorer', presentation)}
          files={files}
          context={state === 'Missing scope' ? undefined : context}
          selection={selection}
          expandedPaths={expanded}
          onExpandedPathsChange={setExpanded}
          query={
            state === 'Filtered' ? 'search' : state === 'No matches' ? 'not-in-this-window' : query
          }
          onQueryChange={setQuery}
          status={status}
          error="File window could not be loaded."
          pagination={pagination}
          onPageChange={(index) => {
            setPageIndex(index);
            onEvent('Synthetic host replaced the file page.');
          }}
          onRefresh={() => {
            setRevision((value) => value + 1);
            onEvent('Synthetic host refreshed the file snapshot.');
          }}
          onRequestOpen={
            state === 'Read-only'
              ? undefined
              : (next) => {
                  if (state === 'Selection pending') setRequest(next);
                  else setSelection(next);
                  onEvent('Host received file opening intent. No filesystem read occurred.');
                }
          }
        />
      </IconsProvider>
      {request && (
        <div className={styles.controls}>
          <p>
            {current
              ? 'Opening request awaiting synthetic host acknowledgement.'
              : 'Opening request is obsolete; request the current file snapshot.'}
          </p>
          <Button
            disabled={!current}
            onClick={() => {
              if (current) {
                setSelection(request);
                setRequest(undefined);
                onEvent('Synthetic host acknowledged file inspection.');
              }
            }}
          >
            Acknowledge file selection
          </Button>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          variant="outline"
          onClick={() => {
            setRevision((value) => value + 1);
            onEvent('Synthetic file versions replaced.');
          }}
        >
          Replace file snapshot
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setRevoked((value) => !value);
            setRequest(undefined);
          }}
        >
          {revoked ? 'Restore file access' : 'Revoke file access'}
        </Button>
      </div>
      <p>Synthetic file metadata and acknowledgements. This fixture does not read a filesystem.</p>
    </div>
  );
}
