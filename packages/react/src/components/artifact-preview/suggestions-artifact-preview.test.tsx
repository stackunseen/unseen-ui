import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Artifact } from '@stackunseen/ui-core';

import { ArtifactPreview } from '@stackunseen/ui';

afterEach(() => vi.restoreAllMocks());

const artifact: Artifact = {
  id: 'preview',
  title: 'Review output',
  version: 3,
  kind: 'text',
  content: '',
  sourceIds: [],
};

describe('ArtifactPreview direct behavior', () => {
  it.each(['document', 'code', 'compact'] as const)(
    '%s preserves untrusted source as inert text and updates its displayed version',
    (variant) => {
      const content =
        '<script>alert(1)</script>\n<img src=x onerror="alert(2)">\n[link](javascript:alert(3))';
      const { container, rerender } = render(
        <ArtifactPreview variant={variant} artifact={{ ...artifact, content }} />,
      );
      expect(container.querySelector('pre')?.textContent).toBe(content);
      expect(container.querySelector('script,img,a,iframe')).toBeNull();
      expect(screen.getByText('Version 3')).toBeVisible();
      rerender(
        <ArtifactPreview
          variant={variant}
          artifact={{ ...artifact, version: 4, content: 'Current host content' }}
        />,
      );
      expect(screen.getByText('Version 4')).toBeVisible();
      expect(screen.queryByText('Version 3')).toBeNull();
      expect(container.querySelector('pre')?.textContent).toBe('Current host content');
    },
  );

  it.each(['document', 'code', 'compact'] as const)(
    '%s bounds text at 20,000 characters and discloses truncation without changing host data',
    (variant) => {
      const current = { ...artifact, content: 'x'.repeat(20_000) + 'HIDDEN-TAIL' };
      const { container, rerender } = render(
        <ArtifactPreview variant={variant} artifact={current} />,
      );
      expect(container.querySelector('pre')?.textContent).toBe('x'.repeat(20_000));
      expect(screen.getByText('Preview truncated.')).toBeVisible();
      expect(screen.queryByText(/HIDDEN-TAIL/)).toBeNull();
      expect(current.content).toHaveLength(20_011);
      rerender(
        <ArtifactPreview
          variant={variant}
          artifact={{ ...current, content: 'x'.repeat(20_000) }}
        />,
      );
      expect(screen.queryByText('Preview truncated.')).toBeNull();
    },
  );

  it.each(['document', 'code', 'compact'] as const)(
    '%s names a keyboard-reachable table with headers, numeric cells and inert text',
    async (variant) => {
      const unsafe = '<img src=x onerror="alert(1)">';
      const { container } = render(
        <>
          <button>Before preview</button>
          <ArtifactPreview
            variant={variant}
            artifact={{
              ...artifact,
              kind: 'table',
              content: JSON.stringify([
                ['Metric', 'Value'],
                [unsafe, 7],
              ]),
            }}
          />
          <button>After preview</button>
        </>,
      );
      const region = screen.getByRole('region', { name: 'Review output table' });
      const table = within(region).getByRole('table', { name: /Review output.*version 3/ });
      expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
      expect(within(table).getByRole('columnheader', { name: 'Metric' })).toHaveAttribute(
        'scope',
        'col',
      );
      expect(within(table).getByRole('cell', { name: '7' })).toBeVisible();
      expect(within(table).getByRole('cell', { name: unsafe })).toBeVisible();
      expect(container.querySelector('img,script')).toBeNull();
      screen.getByRole('button', { name: 'Before preview' }).focus();
      await userEvent.tab();
      expect(region).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'After preview' })).toHaveFocus();
    },
  );

  it('uses host-supplied names to distinguish repeated table scroll regions', () => {
    const table: Artifact = { ...artifact, kind: 'table', content: '[["Count"],[2]]' };
    render(
      <>
        <ArtifactPreview artifact={table} tableLabel="Original result table" />
        <ArtifactPreview artifact={table} tableLabel="Compared result table" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Original result table' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Compared result table' })).toBeVisible();
    expect(screen.getAllByRole('table', { name: /Review output.*version 3/ })).toHaveLength(2);
  });

  it.each([
    ['malformed JSON', '<script>alert(1)</script>'],
    ['object payload', '{"hidden":"do not render"}'],
    ['scalar row', '["do not render"]'],
    ['object cell', '[[{"hidden":"do not render"}]]'],
    ['null cell', '[[null]]'],
    ['boolean cell', '[[true]]'],
    ['too many rows', JSON.stringify(Array.from({ length: 201 }, () => ['do not render']))],
    ['too many columns', JSON.stringify([Array.from({ length: 21 }, () => 'do not render')])],
  ])('rejects %s without exposing a partial table', (_label, content) => {
    const { container } = render(
      <ArtifactPreview artifact={{ ...artifact, kind: 'table', content }} />,
    );
    expect(screen.getByText('This table is invalid or exceeds preview limits.')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText('do not render')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('accepts the documented 200-row and 20-column boundaries', () => {
    const { rerender } = render(
      <ArtifactPreview
        artifact={{
          ...artifact,
          kind: 'table',
          content: JSON.stringify(Array.from({ length: 200 }, (_, index) => [String(index)])),
        }}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(200);
    rerender(
      <ArtifactPreview
        artifact={{
          ...artifact,
          kind: 'table',
          content: JSON.stringify([Array.from({ length: 20 }, (_, index) => String(index))]),
        }}
      />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(20);
  });

  it('replaces previously visible content with the unsupported-type fallback', () => {
    const { container, rerender } = render(
      <ArtifactPreview artifact={{ ...artifact, content: 'Previously visible content' }} />,
    );
    expect(screen.getByText('Previously visible content')).toBeVisible();
    rerender(
      <ArtifactPreview
        artifact={{ ...artifact, kind: 'unsupported', content: '<script>do not render</script>' }}
      />,
    );
    expect(screen.getByText('Preview unavailable for this artifact type.')).toBeVisible();
    expect(screen.queryByText('Previously visible content')).toBeNull();
    expect(container.querySelector('pre,table,script')).toBeNull();
  });
});
