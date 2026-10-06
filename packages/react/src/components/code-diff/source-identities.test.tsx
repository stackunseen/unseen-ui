import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeDiff } from '@stackunseen/ui';

const props = {
  path: 'source.ts',
  before: 'before',
  after: 'after',
  baseVersion: '1',
  nextVersion: '1',
};
const sources = {
  before: { documentId: 'file', version: '1' },
  after: { documentId: 'proposal', version: '1' },
};

describe('paired comparison source identities', () => {
  it('compares independent host sources with the same version string', () => {
    render(<CodeDiff {...props} sourceIdentities={sources} />);
    expect(screen.getByRole('group', { name: 'Changes in source.ts' })).toBeVisible();
    expect(screen.getByText('before')).toBeVisible();
    expect(screen.getByText('after')).toBeVisible();
  });
  it('preserves the legacy same-version guard without source identities', () => {
    render(<CodeDiff {...props} />);
    expect(screen.getByText(/One version cannot identify/)).toBeVisible();
  });
  it('rejects contradictory version labels or different text for the same source identity', () => {
    const view = render(
      <CodeDiff {...props} sourceIdentities={{ before: sources.before, after: sources.before }} />,
    );
    expect(screen.queryByRole('group', { name: 'Changes in source.ts' })).not.toBeInTheDocument();
    view.rerender(
      <CodeDiff
        {...props}
        sourceIdentities={{ ...sources, after: { ...sources.after, version: '2' } }}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Changes in source.ts' })).not.toBeInTheDocument();
  });
  it('clears old clipboard feedback when only the source identity changes', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const view = render(<CodeDiff {...props} sourceIdentities={sources} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy after version' }));
    expect(await screen.findByText('After version copied')).toBeVisible();
    view.rerender(
      <CodeDiff
        {...props}
        sourceIdentities={{
          ...sources,
          after: { ...sources.after, documentId: 'another-proposal' },
        }}
      />,
    );
    expect(screen.queryByText('After version copied')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
