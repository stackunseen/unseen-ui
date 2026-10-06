import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { MemoryControls, ArtifactDiff } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('revoked memories and artifact versions do not leak their contents', () => {
    render(
      <>
        <MemoryControls
          items={[
            {
              id: 'm',
              version: '1',
              label: 'Memory',
              value: 'Secret memory',
              scope: 'Workspace',
              state: 'revoked',
            },
          ]}
          onRequest={() => {}}
        />
        <ArtifactDiff
          path="a"
          versions={[
            { id: 'a', label: 'A', text: 'Secret artifact', author: 'User', access: 'revoked' },
            { id: 'b', label: 'B', text: 'Another secret', author: 'User', access: 'available' },
          ]}
          beforeId="a"
          afterId="b"
          onVersionsChange={() => {}}
        />
      </>,
    );
    expect(screen.queryByText(/Secret memory|Secret artifact|Another secret/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Request deletion of Memory' })).toBeDisabled();
  });
});
