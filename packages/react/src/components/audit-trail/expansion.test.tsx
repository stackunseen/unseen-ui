import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { AuditTrail } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('redacted audit records do not render action text or details', () => {
    render(
      <AuditTrail
        records={[
          {
            id: 'e',
            time: 'Now',
            actor: 'User',
            action: 'Secret action',
            detail: 'Secret payload',
            scope: 'Workspace',
            correlationId: 'run',
            outcome: 'Recorded',
            redacted: true,
          },
        ]}
        query=""
        onQueryChange={() => {}}
      />,
    );
    expect(screen.queryByText(/Secret/)).toBeNull();
    expect(screen.getByText('Redacted action')).toBeVisible();
  });
});
