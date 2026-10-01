import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidDiagram } from './mermaid-diagram.js';

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));

vi.mock('../../../node_modules/mermaid', () => ({ default: mermaid }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mermaid.initialize.mockReset();
  mermaid.render.mockReset().mockResolvedValue({
    svg: '<svg viewBox="0 0 160 80"><text>Viewport diagram</text></svg>',
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('contextual content actions', () => {
  it.each(['panel', 'minimal', 'source'] as const)(
    '%s diagram groups bounded zoom actions without changing copy semantics',
    async (variant) => {
      render(<MermaidDiagram variant={variant} code="flowchart LR\n A --> B" />);
      await screen.findByText('Viewport diagram');
      const group = screen.getByRole('group', { name: 'Diagram zoom' });
      const zoomOut = within(group).getByRole('button', { name: 'Zoom out diagram' });
      const zoomIn = within(group).getByRole('button', { name: 'Zoom in diagram' });
      const reset = within(group).getByRole('button', { name: 'Reset zoom' });
      const copy = screen.getByRole('button', { name: 'Copy source' });
      expect(copy).toHaveAttribute('data-part', 'icon-button');
      expect(group).not.toContainElement(copy);
      for (let index = 0; index < 2; index++) await userEvent.click(zoomOut);
      expect(within(group).getByText('50%')).toBeVisible();
      expect(zoomOut).toBeDisabled();
      await userEvent.click(reset);
      expect(within(group).getByText('100%')).toBeVisible();
      for (let index = 0; index < 4; index++) await userEvent.click(zoomIn);
      expect(within(group).getByText('200%')).toBeVisible();
      expect(zoomIn).toBeDisabled();
      expect(copy).toBeEnabled();
    },
  );
});
