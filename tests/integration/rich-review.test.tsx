import { render, screen } from '@testing-library/react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownCodeBlock, MarkdownResponse } from '@ai-interaction/react/markdown';

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));

vi.mock('../../packages/react/node_modules/mermaid', () => ({ default: mermaid }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mermaid.initialize.mockReset();
  mermaid.render.mockReset().mockResolvedValue({ svg: '<svg><text>Current diagram</text></svg>' });
});

afterEach(() => vi.unstubAllGlobals());

describe('rich renderer review regressions', () => {
  it('renders readable punctuation in code and image fallbacks', () => {
    render(
      <>
        <MarkdownCodeBlock code="const ready =" streaming />
        <MarkdownResponse
          state="complete"
          text="![Architecture](https://example.com/diagram.png)"
        />
      </>,
    );
    expect(screen.getByText('Receiving code…')).toBeVisible();
    expect(screen.getByText(/Image: Architecture/)).toHaveTextContent(
      'Image: Architecture · Open image',
    );
  });
});
