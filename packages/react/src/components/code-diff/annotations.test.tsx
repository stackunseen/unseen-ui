import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeDiff, type CodeDiffLine } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const before = 'one\ntwo\nthree\nfour\n';
const after = 'one\nTWO\nthree\nfour\nfive\n';
// A review comment on the changed second line, and one on the added last line.
const annotate = (line: CodeDiffLine) =>
  line.side === 'after' && line.afterLine === 2 ? (
    <p>Comment on line 2</p>
  ) : line.side === 'after' && line.afterLine === 5 ? (
    <p>Comment on line 5</p>
  ) : null;

describe('CodeDiff annotations', () => {
  it('puts a note directly under its line in the unified view', () => {
    const { container } = render(
      <CodeDiff path="a.txt" before={before} after={after} baseVersion="a" nextVersion="b" annotate={annotate} />,
    );
    const notes = container.querySelectorAll('[data-part="code-diff-annotation"]');
    expect(notes).toHaveLength(2);
    expect(notes[0]!.previousElementSibling).toHaveTextContent('TWO');
    expect(notes[1]!.previousElementSibling).toHaveTextContent('five');
    expect(screen.getByText('Comment on line 2')).toBeVisible();
  });

  it('spans both columns in the split view and keeps the rows in order', () => {
    const { container } = render(
      <CodeDiff
        variant="split"
        path="a.txt"
        before={before}
        after={after}
        baseVersion="a"
        nextVersion="b"
        annotate={annotate}
      />,
    );
    const notes = container.querySelectorAll('[data-part="code-diff-annotation"]');
    expect(notes).toHaveLength(2);
    // Each note sits between blocks of rows, outside either column.
    expect(notes[0]!.parentElement).toBe(notes[1]!.parentElement);
    // One pair of column labels, even though the rows come in several blocks.
    expect(screen.getAllByText('Before', { selector: 'strong' })).toHaveLength(1);
    const text = notes[0]!.parentElement!.textContent!;
    expect(text.indexOf('TWO')).toBeLessThan(text.indexOf('Comment on line 2'));
    expect(text.indexOf('Comment on line 2')).toBeLessThan(text.indexOf('three'));
  });

  it('renders as before when nothing is annotated', () => {
    const { container } = render(
      <CodeDiff
        variant="split"
        path="a.txt"
        before={before}
        after={after}
        baseVersion="a"
        nextVersion="b"
        annotate={() => null}
      />,
    );
    expect(container.querySelector('[data-part="code-diff-annotation"]')).toBeNull();
    expect(screen.getByText('After', { selector: 'strong' })).toBeVisible();
  });
});
