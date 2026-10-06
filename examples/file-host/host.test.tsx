import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { Buffer } from 'node:buffer';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileExplorer } from '@stackunseen/ui';
import type { FileOpenRequest, WorkspaceFile } from '@stackunseen/ui';
import { createFileHost } from './host.mjs';
import type { ReadOnlyFileHost } from './host.mjs';

const base = resolve('output/file-host-fixtures');
let directory: string, host: ReadOnlyFileHost;
async function removeFixture(path: string, prefix = 'run-') {
  const target = resolve(path);
  if (!target.startsWith(base + sep) || !target.slice(base.length + 1).startsWith(prefix))
    throw new Error('Fixture cleanup target outside its owned output directory.');
  await rm(target, { recursive: true, force: true });
}
beforeEach(async () => {
  await mkdir(base, { recursive: true });
  directory = await mkdtemp(join(base, 'run-'));
  await mkdir(join(directory, 'src'));
  await writeFile(join(directory, 'src/a.ts'), 'const value = 1;\r\n');
  await writeFile(join(directory, 'README.md'), '<img src="bad" onerror="bad()">\n');
  await writeFile(join(directory, 'private.txt'), Buffer.alloc(70000, 255));
  host = await createFileHost(directory, ['README.md', 'src/a.ts']);
});
afterEach(async () => {
  await removeFixture(directory);
});
function request(
  window: Awaited<ReturnType<ReadOnlyFileHost['window']>>,
  file: WorkspaceFile,
): FileOpenRequest {
  return {
    workspaceId: window.context.workspaceId,
    snapshotVersion: window.context.version,
    fileId: file.id,
    path: file.path,
    fileVersion: file.version,
  };
}
describe('actual read-only filesystem host', () => {
  it('reports actual byte/content versions and pages while withholding denied content/metadata', async () => {
    const first = await host.window(0, 2),
      second = await host.window(1, 2);
    expect(first.pagination.totalFiles).toBe(3);
    expect(first.files).toHaveLength(2);
    expect(second.files).toHaveLength(1);
    expect(first.context).toEqual(second.context);
    const blocked = first.files.find((file) => file.path === 'private.txt')!;
    expect(blocked).toEqual({ id: blocked.id, path: 'private.txt', access: 'denied' });
    await expect(host.open(request(first, blocked))).rejects.toMatchObject({ status: 403 });
    expect(second.files[0]?.sizeBytes).toBe(Buffer.byteLength('const value = 1;\r\n'));
    const receipt = await host.open(request(second, second.files[0]!));
    expect(receipt.outcome).toBe('read');
    expect(receipt.text).toBe('const value = 1;\r\n');
  });
  it('detects real changed content and rejects obsolete read intents', async () => {
    const first = await host.window(0, 3),
      file = first.files.find((file) => file.path === 'src/a.ts')!,
      old = request(first, file);
    await writeFile(join(directory, 'src/a.ts'), 'const value = 2;\n');
    const current = await host.window(0, 3),
      next = current.files.find((file) => file.path === 'src/a.ts')!;
    expect(next.version).not.toBe(file.version);
    expect(current.context.version).not.toBe(first.context.version);
    await expect(host.open(old)).rejects.toMatchObject({ status: 409 });
    expect((await host.open(request(current, next))).text).toBe('const value = 2;\n');
  });
  it('checks host denial before I/O and invalidates pre-revocation requests after restore', async () => {
    const first = await host.window(0, 3),
      old = request(first, first.files[0]!);
    host.setAccess(false);
    await expect(host.window()).rejects.toMatchObject({ status: 403 });
    await expect(host.open(old)).rejects.toMatchObject({ status: 403 });
    host.setAccess(true);
    await expect(host.open(old)).rejects.toMatchObject({ status: 409 });
    const current = await host.window(0, 3);
    expect(current.context.version).not.toBe(first.context.version);
    expect((await host.open(request(current, current.files[0]!))).outcome).toBe('read');
  });
  it('rejects path/scope spoofing and unexpected request fields', async () => {
    const first = await host.window(0, 3),
      current = request(first, first.files[0]!);
    await expect(host.open({ ...current, path: '../outside.txt' })).rejects.toMatchObject({
      status: 409,
    });
    await expect(host.open({ ...current, workspaceId: 'outside' })).rejects.toMatchObject({
      status: 409,
    });
    await expect(host.open({ ...current, run: 'bad' } as FileOpenRequest)).rejects.toMatchObject({
      status: 400,
    });
  });
  it('keeps oversized/invalid UTF-8 files explicit without returning source', async () => {
    await writeFile(join(directory, 'large.ts'), 'x'.repeat(70000));
    await writeFile(join(directory, 'invalid.ts'), Buffer.from([255, 254]));
    const broker = await createFileHost(directory, ['large.ts', 'invalid.ts']);
    const current = await broker.window(0, 5);
    expect(
      current.files
        .filter((file) => ['large.ts', 'invalid.ts'].includes(file.path))
        .map((file) => file.access),
    ).toEqual(['unknown', 'unknown']);
    const invalid = current.files.find((file) => file.path === 'invalid.ts')!;
    await expect(broker.open(request(current, invalid))).rejects.toMatchObject({ status: 403 });
  });
  it('omits symbolic-link directories rather than walking their targets', async () => {
    const outside = await mkdtemp(join(base, 'run-outside-'));
    try {
      await writeFile(join(outside, 'outside.ts'), 'outside source');
      await symlink(outside, join(directory, 'linked'), 'junction');
      const current = await host.window(0, 4);
      expect(current.files.some((file) => file.path.includes('outside'))).toBe(false);
    } finally {
      await removeFixture(outside, 'run-outside-');
    }
  });
  it('drives controlled FileExplorer acknowledgements through actual host reads with inert source', async () => {
    const first = await host.window(0, 3);
    function Consumer() {
      const [selection, select] = useState<FileOpenRequest>(),
        [source, show] = useState<string>();
      return (
        <>
          <FileExplorer
            files={first.files}
            context={first.context}
            expandedPaths={['/src']}
            onRequestOpen={(next) => {
              void host.open(next).then((receipt) => {
                select(receipt.request);
                show(receipt.text);
              });
            }}
            selection={selection}
          />
          {source !== undefined && (
            <pre aria-label="Host read source" role="group">
              {source}
            </pre>
          )}
        </>
      );
    }
    const { container } = render(<Consumer />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open README.md' }));
    expect(await screen.findByRole('group', { name: 'Selected file details' })).toHaveTextContent(
      'README.md',
    );
    expect(screen.getByRole('group', { name: 'Host read source' }).textContent).toBe(
      '<img src="bad" onerror="bad()">\n',
    );
    expect(container.querySelector('img,script')).toBeNull();
  });
});
