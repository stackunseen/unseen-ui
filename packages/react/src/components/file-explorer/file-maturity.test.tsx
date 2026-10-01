import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileExplorer, IconsProvider } from '@ai-interaction/react';
import type { WorkspaceFile, FileOpenRequest } from '@ai-interaction/react';
import { inspectFiles, fileRequest } from './file-model.js';
import { boundedData } from '../../shared/bounded-data.js';

const files: WorkspaceFile[] = [
  {
    id: 'search',
    path: 'src/search.ts',
    version: 'f1',
    change: 'modified',
    sizeBytes: 0,
    modifiedAt: 0,
  },
  { id: 'app', path: 'src/app.tsx', version: 'f2' },
  { id: 'readme', path: 'README.md' },
  { id: 'secret', path: 'private.env', access: 'denied' },
];
const context = { workspaceId: 'workspace-A', version: 'snapshot-1' };
const props = {
  files,
  expandedPaths: ['/src'],
  onExpandedPathsChange: vi.fn(),
  onSelect: vi.fn(),
  context,
};

describe('file projections and controlled current identities', () => {
  it.each(['folders', 'list', 'compact'] as const)(
    '%s preserves host paths, access and a distinct projection',
    (variant) => {
      const { container } = render(<FileExplorer {...props} variant={variant} />);
      expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'Open private.env' })).toBeDisabled();
      expect(
        screen.getByText('4 files in this window · Workspace: workspace-A · Snapshot: snapshot-1'),
      ).toBeVisible();
      expect(container.querySelectorAll('button[aria-expanded]').length > 0).toBe(
        variant === 'folders',
      );
      expect(screen.queryByRole('list', { name: 'File details list' }) !== null).toBe(
        variant === 'list',
      );
      expect(screen.queryByRole('list', { name: 'Files by directory' }) !== null).toBe(
        variant === 'compact',
      );
      expect(screen.queryByRole('region')).toBeNull();
      expect(screen.queryByRole('tree')).toBeNull();
    },
  );
  it.each(['folders', 'list', 'compact'] as const)(
    '%s emits scoped intent without optimistic selection',
    async (variant) => {
      const open = vi.fn(),
        legacy = vi.fn();
      const { rerender } = render(
        <FileExplorer {...props} variant={variant} onSelect={legacy} onRequestOpen={open} />,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open src/search.ts' }));
      expect(open).toHaveBeenCalledExactlyOnceWith(fileRequest(context, files[0]!));
      expect(legacy).not.toHaveBeenCalled();
      expect(screen.queryByRole('group', { name: 'Selected file details' })).toBeNull();
      rerender(
        <FileExplorer
          {...props}
          variant={variant}
          onRequestOpen={open}
          selection={open.mock.calls[0]![0] as FileOpenRequest}
        />,
      );
      expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(screen.getByRole('group', { name: 'Selected file details' })).toHaveTextContent(
        'Size: 0 bytes',
      );
      expect(screen.getByRole('group', { name: 'Selected file details' })).toHaveTextContent(
        '1 Jan 1970, 00:00 UTC',
      );
    },
  );
  it('keeps the legacy one-argument callback shape', async () => {
    const select = vi.fn();
    render(<FileExplorer {...props} onSelect={select} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open src/search.ts' }));
    expect(select).toHaveBeenCalledExactlyOnceWith(files[0]);
  });
  it.each([
    'workspace',
    'snapshot',
    'path',
    'file-version',
    'missing',
    'denied',
    'ambiguous',
  ] as const)(
    'hides %s obsolete/ambiguous inspection while preserving current public records',
    (change) => {
      const selection = fileRequest(context, files[0]!);
      const nextFiles =
        change === 'missing'
          ? files.slice(1)
          : files.map((file, i) =>
              i
                ? file
                : {
                    ...file,
                    path: change === 'path' ? 'src/renamed.ts' : file.path,
                    version: change === 'file-version' ? 'f3' : file.version,
                    access: change === 'denied' ? ('denied' as const) : file.access,
                  },
            );
      render(
        <FileExplorer
          {...props}
          files={nextFiles}
          context={{
            workspaceId: change === 'workspace' ? 'workspace-B' : context.workspaceId,
            version: change === 'snapshot' ? 'snapshot-2' : context.version,
          }}
          selection={selection}
          selectedId={change === 'ambiguous' ? 'search' : undefined}
        />,
      );
      expect(screen.queryByRole('group', { name: 'Selected file details' })).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Selected file is unavailable');
      expect(screen.getByRole('button', { name: 'Open src/app.tsx' })).toBeVisible();
      expect(screen.queryByRole('button', { current: true })).toBeNull();
    },
  );
  it('requires a scoped snapshot for scoped handlers and disables missing handlers', () => {
    const { rerender } = render(
      <FileExplorer {...props} context={undefined} onRequestOpen={() => {}} />,
    );
    expect(screen.getByText(/Scoped file opening requires/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toBeDisabled();
    rerender(<FileExplorer {...props} onSelect={undefined} />);
    expect(screen.getByText(/no host handler supplied/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toBeDisabled();
  });
  it.each(['stale', 'refreshing'] as const)(
    '%s retains explicit history but disables opens/pages',
    (status) => {
      render(
        <FileExplorer
          {...props}
          status={status}
          pagination={{ pageIndex: 0, pageSize: 4, hasNextPage: true }}
          onPageChange={() => {}}
          onRefresh={() => {}}
        />,
      );
      expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next file page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Refresh file window' })).toHaveProperty(
        'disabled',
        status === 'refreshing',
      );
    },
  );
  it.each(['loading', 'denied', 'unavailable', 'error', 'unknown'] as const)(
    '%s hides metadata before reading file accessors',
    (status) => {
      const getter = vi.fn(() => 'secret.ts'),
        file = {
          id: 'hidden',
          get path() {
            return getter();
          },
        };
      const { container } = render(
        <FileExplorer
          {...props}
          files={[file]}
          status={status}
          selection={fileRequest(context, files[0]!)}
        />,
      );
      expect(getter).not.toHaveBeenCalled();
      expect(container.querySelector('[data-file-id]')).toBeNull();
      expect(screen.queryByText(/workspace-A|snapshot-1/)).toBeNull();
      expect(screen.queryByRole('group', { name: 'Selected file details' })).toBeNull();
    },
  );
  it('keeps controlled disclosure requests nonoptimistic and restores focus after focused file removal', async () => {
    const expand = vi.fn(),
      { rerender } = render(
        <FileExplorer {...props} expandedPaths={[]} onExpandedPathsChange={expand} />,
      );
    await userEvent.setup().click(screen.getByRole('button', { name: 'src 2 files' }));
    expect(expand).toHaveBeenCalledWith(['/src']);
    expect(screen.queryByRole('button', { name: 'Open src/search.ts' })).toBeNull();
    rerender(<FileExplorer {...props} onExpandedPathsChange={expand} />);
    screen.getByRole('button', { name: 'Open src/search.ts' }).focus();
    rerender(<FileExplorer {...props} files={files.slice(1)} onExpandedPathsChange={expand} />);
    expect(screen.getByRole('group', { name: 'Workspace files' })).toHaveFocus();
  });
  it('filters only the current window without dropping current selected-file identity', async () => {
    const query = vi.fn(),
      { rerender } = render(
        <FileExplorer {...props} variant="list" selectedId="search" onQueryChange={query} />,
      );
    await userEvent
      .setup()
      .type(screen.getByRole('searchbox', { name: 'Filter this file window' }), 'R');
    expect(query).toHaveBeenCalledWith('R');
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(4);
    rerender(
      <FileExplorer
        {...props}
        variant="list"
        query="README"
        selectedId="search"
        onQueryChange={query}
      />,
    );
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(1);
    expect(screen.getByText('Selected file is outside this window filter.')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Selected file details' })).toHaveTextContent(
      'src/search.ts',
    );
  });
  it('keeps real Workspace root directory distinct from virtual root grouping', () => {
    render(
      <FileExplorer
        {...props}
        files={[
          { id: 'a', path: 'a.ts' },
          { id: 'b', path: 'Workspace root/b.ts' },
        ]}
        variant="compact"
      />,
    );
    expect(screen.getAllByRole('heading', { name: 'Workspace root · 1' })).toHaveLength(2);
    expect(
      within(screen.getByRole('list', { name: 'Files by directory' })).getAllByRole('listitem'),
    ).toHaveLength(4);
  });
  it('preserves original Windows separator callbacks and validates normalized conflicts', async () => {
    const select = vi.fn(),
      file = { id: 'backslash', path: 'src\\search.ts' };
    render(<FileExplorer {...props} files={[file]} onSelect={select} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open src\\search.ts' }));
    expect(select).toHaveBeenCalledWith(file);
    expect(inspectFiles([file, { id: 'another', path: '/src/search.ts' }], [])).toBeUndefined();
  });
  it('reuses configurable document icons and renders HTML-like names inertly', () => {
    const { container } = render(
      <IconsProvider icons={{ document: null }}>
        <FileExplorer
          {...props}
          files={[{ id: 'html', path: '<img onerror=bad>.ts' }]}
          variant="list"
        />
      </IconsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Open <img onerror=bad>.ts' })).toBeVisible();
    expect(container.querySelector('img,script,[data-ai-icon="document"]')).toBeNull();
  });
});

describe('bounded file windows and pages', () => {
  it('requests current page replacement with scope and no optimistic file changes', async () => {
    const page = vi.fn();
    render(
      <FileExplorer
        {...props}
        pagination={{ pageIndex: 0, pageSize: 4, totalFiles: 6 }}
        onPageChange={page}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next file page' }));
    expect(page).toHaveBeenCalledExactlyOnceWith(1, context);
    expect(screen.getByText(/Page 1 · Total: 6/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toBeVisible();
  });
  it('keeps unknown totals explicit and next disabled unless declared', () => {
    const { rerender } = render(
      <FileExplorer
        {...props}
        pagination={{ pageIndex: 0, pageSize: 4 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/Total: Unknown/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next file page' })).toBeDisabled();
    rerender(
      <FileExplorer
        {...props}
        pagination={{ pageIndex: 0, pageSize: 4, hasNextPage: true }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Next file page' })).toBeEnabled();
  });
  it('retains all 500 files and rejects 501 rather than truncating', () => {
    const window = Array.from({ length: 500 }, (_, i) => ({
      id: String(i),
      path: `src/file-${i}.ts`,
    }));
    expect(inspectFiles(window, ['/src'])?.filtered).toHaveLength(500);
    expect(inspectFiles([...window, { id: 'extra', path: 'extra.ts' }], [])).toBeUndefined();
    expect(boundedData(window)).toBe(false); // Other callers retain the original 200-array bound.
  });
  it.each([
    [
      'duplicate ID',
      [
        { id: 'a', path: 'a.ts' },
        { id: 'a', path: 'b.ts' },
      ],
    ],
    ['path traversal', [{ id: 'a', path: 'src/../secret.ts' }]],
    ['absolute drive', [{ id: 'a', path: 'C:\\secret.ts' }]],
    ['empty segment', [{ id: 'a', path: 'src//a.ts' }]],
    ['control character', [{ id: 'a', path: 'src/\nfile.ts' }]],
    ['too deep', [{ id: 'a', path: 'x/'.repeat(13) + 'a.ts' }]],
    [
      'file/directory conflict',
      [
        { id: 'a', path: 'src' },
        { id: 'b', path: 'src/a.ts' },
      ],
    ],
    ['unknown access', [{ id: 'a', path: 'a.ts', access: 'approved' }]],
    ['invalid size', [{ id: 'a', path: 'a.ts', sizeBytes: -1 }]],
    ['invalid modification', [{ id: 'a', path: 'a.ts', modifiedAt: Infinity }]],
    ['unknown executable field', [{ id: 'a', path: 'a.ts', run: () => {} }]],
  ])('rejects %s snapshots', (_, data) => {
    render(<FileExplorer {...props} files={data as WorkspaceFile[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('preview limits are invalid');
    expect(screen.queryByRole('button', { name: /^Open / })).toBeNull();
  });
  it.each([
    { pageIndex: -1, pageSize: 4 },
    { pageIndex: 0, pageSize: 501 },
    { pageIndex: 0, pageSize: 3 },
    { pageIndex: 1, pageSize: 4, totalFiles: 4 },
    { pageIndex: 0, pageSize: 5, totalFiles: 6 },
    { pageIndex: 0, pageSize: 4, totalFiles: 4, hasNextPage: true },
    { pageIndex: Number.MAX_SAFE_INTEGER, pageSize: 4 },
  ])('rejects inconsistent page metadata %j', (pagination) => {
    expect(inspectFiles(files, [], context, pagination)).toBeUndefined();
  });
  it('does not read visible malformed accessors and rejects overbound folder graphs', () => {
    const getter = vi.fn(() => 'secret.ts');
    expect(
      inspectFiles(
        [
          {
            id: 'a',
            get path() {
              return getter();
            },
          },
        ],
        [],
      ),
    ).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    const excessiveFolders = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      path: `${i}/a/b/c/d/e/f.ts`,
    }));
    expect(inspectFiles(excessiveFolders, [])).toBeUndefined();
  });
  it('preserves twelve folder levels and explicit obsolete expansion paths', () => {
    const path = Array.from({ length: 12 }, (_, i) => `folder-${i}`).join('/') + '/a.ts';
    const model = inspectFiles([{ id: 'deep', path }], ['/obsolete']);
    expect(model?.allFolders.size).toBe(12);
    expect(model?.obsoleteExpansion).toEqual(['/obsolete']);
    expect(model?.files[0]?.path).toBe(path);
  });
  it('treats malformed selection as unavailable while keeping current records', () => {
    render(
      <FileExplorer {...props} selection={{ ...fileRequest(context, files[0]!), fileId: '' }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Selected file is unavailable');
    expect(screen.getByRole('button', { name: 'Open src/search.ts' })).toBeVisible();
  });
});
