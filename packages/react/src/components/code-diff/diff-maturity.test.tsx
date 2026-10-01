import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { CodeDiff } from '@ai-interaction/react';
import { HighlightedCodeDiff } from '@ai-interaction/react/highlight';
const base = {
  path: 'test.ts',
  baseVersion: 'a',
  nextVersion: 'b',
  before: 'const value = "old";\r\n',
  after: 'const value = "new";\r\n',
};
afterEach(() => vi.unstubAllGlobals());
describe('versioned diff maturity', () => {
  it('aligns replacements and unequal added/removed runs in the split view', () => {
    const { container } = render(
      <CodeDiff
        {...base}
        variant="split"
        before={'same\nold1\nold2\nend\n'}
        after={'same\nnew1\nnew2\nnew3\nend\n'}
      />,
    );
    const columns = container.querySelector('[data-part="code-diff"]')!.querySelectorAll('strong');
    const before = screen.getByText('Before', { selector: 'strong' }).nextElementSibling!;
    const after = screen.getByText('After', { selector: 'strong' }).nextElementSibling!;
    expect([...before.querySelectorAll('code')].map((n) => n.textContent)).toEqual([
      'same',
      'old1',
      'old2',
      ' ',
      'end',
    ]);
    expect([...after.querySelectorAll('code')].map((n) => n.textContent)).toEqual([
      'same',
      'new1',
      'new2',
      'new3',
      'end',
    ]);
    expect(columns.length).toBeGreaterThan(1);
    expect(within(before as HTMLElement).getAllByRole('img', { name: 'Removed' })).toHaveLength(2);
    expect(within(after as HTMLElement).getAllByRole('img', { name: 'Added' })).toHaveLength(3);
  });
  it.each(['unified', 'split', 'compact'] as const)(
    'copies original version strings including CRLF in %s',
    async (variant) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      const { container } = render(
        <HighlightedCodeDiff {...base} variant={variant} language="ts" />,
      );
      await waitFor(() =>
        expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Copy before version' }));
      await screen.findByText('Before version copied');
      fireEvent.click(screen.getByRole('button', { name: 'Copy after version' }));
      await screen.findByText('After version copied');
      expect(writeText.mock.calls).toEqual([[base.before], [base.after]]);
      expect(screen.getAllByRole('img', { name: 'Added' })).toHaveLength(1);
      expect(screen.getAllByRole('img', { name: 'Removed' })).toHaveLength(1);
    },
  );
  it('uses complete-document grammar state for multiline context', async () => {
    const { container } = render(
      <HighlightedCodeDiff
        {...base}
        language="ts"
        before={'/* old\nshared\n*/\n'}
        after={'/* new\nshared\n*/\n'}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    expect(screen.getByText('shared')).toHaveAttribute('data-code-token', 'comment');
  });
  it('renders untrusted source as inert tokens', async () => {
    const { container } = render(
      <HighlightedCodeDiff
        {...base}
        language="html"
        before={'<img src="old" onerror="alert(1)">'}
        after={'<script>alert(1)</script>'}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    expect(container.querySelector('script,img,[onerror]')).toBeNull();
    expect(container.querySelectorAll('[data-code-token]').length).toBeGreaterThan(0);
  });
  it.each(['denied', 'loading', 'conflict', 'error', 'unavailable'] as const)(
    'hides source and copying while %s',
    (status) => {
      render(
        <HighlightedCodeDiff
          {...base}
          before="secret before"
          after="secret after"
          status={status}
          language="ts"
        />,
      );
      expect(screen.queryByText(/secret/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Copy before version' })).toBeNull();
    },
  );
  it.each([
    { baseVersion: '', nextVersion: 'b' },
    { baseVersion: 'same', nextVersion: 'same' },
  ])('rejects ambiguous immutable identities $baseVersion/$nextVersion', (versions) => {
    const { container } = render(<HighlightedCodeDiff {...base} {...versions} language="ts" />);
    expect(screen.getByRole('status')).toHaveTextContent('immutable version');
    expect(container.querySelector('code')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy before version' })).toBeDisabled();
  });
  it('reports Clipboard absence and invalidates a pending copy after version replacement', async () => {
    vi.stubGlobal('navigator', {});
    const { rerender } = render(<CodeDiff {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy after version' }));
    await screen.findByText('Copy unavailable. Select and copy the source.');
    let finish: () => void = () => {};
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy after version' }));
    rerender(<CodeDiff {...base} nextVersion="c" after="next source" />);
    await act(async () => finish());
    expect(screen.queryByText('After version copied')).toBeNull();
    expect(screen.queryByText('Copy unavailable. Select and copy the source.')).toBeNull();
  });
  it('keeps excessive, unsupported and no-change previews explicit', async () => {
    const { container, rerender } = render(<HighlightedCodeDiff {...base} language="unknown" />);
    expect(screen.getByText(/not available for this language/)).toBeVisible();
    rerender(<HighlightedCodeDiff {...base} after={'x\n'.repeat(310)} language="ts" />);
    expect(screen.getByText(/syntax highlighting limit/)).toBeVisible();
    rerender(<HighlightedCodeDiff {...base} after={'x'.repeat(60001)} language="ts" />);
    expect(screen.getByText(/Comparison exceeds/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy after version' })).toBeDisabled();
    rerender(<HighlightedCodeDiff {...base} before="same" after="same" language="ts" />);
    expect(screen.getByText('No changes between these versions.')).toBeVisible();
    expect(container.querySelector('[data-code-token]')).toBeNull();
  });
});
