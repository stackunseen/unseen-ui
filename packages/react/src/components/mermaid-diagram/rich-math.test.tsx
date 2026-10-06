import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { MermaidDiagram } from '@stackunseen/ui/mermaid';

vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
);

describe('optional math and diagram boundaries', () => {
  it.each([
    '%%{init: {securityLevel: "loose"}}%%\nflowchart LR\nA-->B',
    'flowchart LR\nA-->B\nclick A "https://example.com"',
    'flowchart LR\nA["<img src=x>"]',
  ])('rejects unsafe diagram configuration before rendering', (code) => {
    const { container } = render(<MermaidDiagram code={code} />);
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    expect(container.querySelector('[data-part="diagram-canvas"]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
  it('holds a streaming diagram as inert source', () => {
    const { container } = render(<MermaidDiagram code="flowchart LR\nA-->B" state="streaming" />);
    expect(screen.getByRole('status')).toHaveTextContent('Receiving');
    expect(container.querySelector('[data-part="diagram-canvas"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy source' })).toBeDisabled();
  });
});
