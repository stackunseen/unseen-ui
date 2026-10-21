import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FileExplorer } from './file-explorer.js';
import { inspectFiles } from './file-model.js';
import type { WorkspaceFile } from './file-model.js';

const changed: WorkspaceFile[] = [
  { id: '1', path: 'src/search.ts', change: 'modified', lines: { added: 2, removed: 1 } },
  { id: '2', path: 'src/search.test.ts', change: 'added', lines: { added: 14, removed: 0 } },
];

describe('FileExplorer as a changed-files list', () => {
  it('shows each file change with its line counts', () => {
    render(
      <FileExplorer
        variant="list"
        title="Changed files"
        files={changed}
        expandedPaths={[]}
        onSelect={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: 'Open src/search.test.ts' });
    expect(button).toHaveTextContent('added');
    expect(button).toHaveTextContent('+14');
    expect(screen.getByText('14 lines added, 0 removed')).toBeInTheDocument();
  });

  it('rejects negative or fractional line counts', () => {
    expect(
      inspectFiles([{ id: 'x', path: 'a.ts', lines: { added: -1, removed: 0 } }], []),
    ).toBeUndefined();
    expect(
      inspectFiles([{ id: 'x', path: 'a.ts', lines: { added: 1.5, removed: 0 } }], []),
    ).toBeUndefined();
    expect(
      inspectFiles([{ id: 'x', path: 'a.ts', lines: { added: 1, removed: 2 } }], []),
    ).toBeDefined();
  });
});
