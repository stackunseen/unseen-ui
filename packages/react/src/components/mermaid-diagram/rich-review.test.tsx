import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AITheme } from '@stackunseen/ui';
import { MermaidDiagram } from '@stackunseen/ui/rich-markdown';

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));

vi.mock('../../../node_modules/mermaid', () => ({ default: mermaid }));

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
  it.each([
    'flowchart LR\n A@{ img: "/private/image.svg" }',
    'flowchart LR\n A@{ "\\u0069mg": "/private/image.svg" }',
    'flowchart LR; style A fill:red',
  ])('rejects resource and styling instructions before invoking Mermaid', async (code) => {
    render(<MermaidDiagram code={code} />);
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    await act(async () => undefined);
    expect(mermaid.render).not.toHaveBeenCalled();
  });

  it('allows ordinary labels that happen to contain directive words', async () => {
    render(<MermaidDiagram code={'flowchart LR\n A["Style controls"] --> B["Click to review"]'} />);
    expect(await screen.findByText('Current diagram')).toBeVisible();
  });

  it('keeps generated math labels while stripping links, events and embedded resources', async () => {
    mermaid.render.mockResolvedValue({
      svg: '<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup></math></div></foreignObject><script>alert(1)</script><a href="https://example.com">link</a><image href="https://example.com/a.png"/><text onclick="alert(1)">Safe text</text></svg>',
    });
    const { container } = render(<MermaidDiagram code={'flowchart LR\n A["$$x^2$$"] --> B'} />);
    await waitFor(() => expect(container.querySelector('math')).not.toBeNull());
    expect(container.querySelector('foreignObject')).not.toBeNull();
    expect(container.querySelector('script,a,image,[onclick],[href]')).toBeNull();
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: 'strict', htmlLabels: true, look: 'classic' }),
    );
  });

  it('hides the old palette while a new theme render is pending', async () => {
    const { container, rerender } = render(
      <AITheme appearance="light">
        <MermaidDiagram code="flowchart LR\n A --> B" />
      </AITheme>,
    );
    await screen.findByText('Current diagram');
    let finish: ((result: { svg: string }) => void) | undefined;
    mermaid.render.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    rerender(
      <AITheme appearance="dark">
        <MermaidDiagram code="flowchart LR\n A --> B" />
      </AITheme>,
    );
    expect(container.querySelector('[data-part="mermaid-diagram"] [role="group"] svg')).toBeNull();
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => finish?.({ svg: '<svg><text>Dark diagram</text></svg>' }));
    expect(await screen.findByText('Dark diagram')).toBeVisible();
  });

  it('reports missing clipboard access without throwing', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard);
    render(<MermaidDiagram code="flowchart LR\n A --> B" />);
    await user.click(screen.getByRole('button', { name: 'Copy source' }));
    expect(await screen.findByText('Copy unavailable. Select the source to copy.')).toBeVisible();
  });

  it('does not copy oversized diagram payloads', () => {
    render(<MermaidDiagram code={'a'.repeat(12001)} />);
    expect(screen.getByRole('button', { name: 'Copy source' })).toBeDisabled();
  });

  it('preserves the fallback when diagram parsing fails and removes its scratch node', async () => {
    mermaid.render.mockRejectedValue(new Error('parser failure'));
    render(<MermaidDiagram code="flowchart LR\n A[Unclosed" />);
    expect(await screen.findByText(/Unable to render this diagram/)).toBeVisible();
    expect(document.querySelector('[style*="-100000px"]')).toBeNull();
  });
});
