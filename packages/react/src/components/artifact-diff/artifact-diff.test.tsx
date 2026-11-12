import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArtifactDiff } from './artifact-diff.js';
import type { ArtifactVersion } from './artifact-diff.js';

const versions: ArtifactVersion[] = [
  { id: 'v1', label: 'Version 1', text: 'one\n', author: 'Planner', access: 'available' },
  { id: 'v2', label: 'Version 2', text: 'one\ntwo\n', author: 'Writer', access: 'available' },
  { id: 'v3', label: 'Version 3', text: 'three\n', author: 'Editor', access: 'revoked' },
];
const base = { path: 'notes.md', versions, onVersionsChange: () => {} };

describe('ArtifactDiff', () => {
  it('compares two versions and names who wrote each', () => {
    const { container } = render(<ArtifactDiff {...base} beforeId="v1" afterId="v2" />);
    expect(screen.getByRole('combobox', { name: 'Original artifact version' })).toHaveTextContent(
      'Version 1',
    );
    expect(screen.getByRole('combobox', { name: 'Updated artifact version' })).toHaveTextContent(
      'Version 2',
    );
    expect(screen.getByText('Planner → Writer')).toBeVisible();
    expect(container).toHaveTextContent('two');
  });

  it('says so when both sides are the same version', () => {
    render(<ArtifactDiff {...base} beforeId="v2" afterId="v2" />);
    expect(screen.getByText(/Both sides show the same version/)).toBeVisible();
    expect(screen.queryByText('Writer → Writer')).toBeNull();
  });

  it('shows no comparison when a selected version is missing', () => {
    const { container } = render(<ArtifactDiff {...base} beforeId="gone" afterId="v2" />);
    expect(screen.getByText('A selected version is unavailable or ambiguous.')).toBeVisible();
    expect(container).not.toHaveTextContent('two');
  });

  it('shows no comparison when an id is ambiguous', () => {
    render(
      <ArtifactDiff
        {...base}
        versions={[...versions, { ...versions[0]!, text: 'other' }]}
        beforeId="v1"
        afterId="v2"
      />,
    );
    expect(screen.getByText('A selected version is unavailable or ambiguous.')).toBeVisible();
  });

  it('withholds the text of a revoked version', () => {
    const { container } = render(<ArtifactDiff {...base} beforeId="v1" afterId="v3" />);
    expect(container).toHaveTextContent('Access to this comparison is unavailable.');
    expect(container).not.toHaveTextContent('three');
  });
});
