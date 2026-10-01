import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { HighlightedCodeBlock, HighlightedCodeDiff } from '@ai-interaction/react/highlight';
import { useCodeHighlight } from './use-code-highlight.js';
import { CodeTokenLine } from './code-tokens.js';
const engine = vi.hoisted(() => ({ tokenizeCode: vi.fn() }));
vi.mock('./highlight-engine.js', () => engine);
beforeEach(() => {
  engine.tokenizeCode.mockReset();
});
describe('highlight reconciliation and limits', () => {
  it('does not load hidden diff documents and discards pending results on revocation', async () => {
    let finish: (value: unknown) => void = () => {};
    engine.tokenizeCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation(async (code: string) => [[{ text: code, tone: 'text' }]]);
    const props = {
      path: 'a.ts',
      before: 'old',
      after: 'new',
      baseVersion: 'v1',
      nextVersion: 'v2',
      language: 'ts',
    };
    const { container, rerender } = render(<HighlightedCodeDiff {...props} status="denied" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(engine.tokenizeCode).not.toHaveBeenCalled();
    rerender(<HighlightedCodeDiff {...props} />);
    await waitFor(() => expect(engine.tokenizeCode).toHaveBeenCalled());
    const current = engine.tokenizeCode.mock.calls[0]![2];
    rerender(<HighlightedCodeDiff {...props} status="denied" />);
    await act(async () => finish([[{ text: 'old', tone: 'constant' }]]));
    expect(container.querySelector('code')).toBeNull();
    expect(current()).toBe(false);
  });
  it('binds the shared token lifecycle to revision identity with unchanged source', async () => {
    let finish: (value: unknown) => void = () => {};
    engine.tokenizeCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation(async (code: string) => [[{ text: code, tone: 'string' }]]);
    function RevisionView({ revision }: { revision: string }) {
      const result = useCodeHighlight({ code: 'same source', language: 'ts', revision });
      return (
        <div data-state={result.state}>
          {result.lines?.map((tokens, index) => (
            <CodeTokenLine key={index} tokens={tokens} />
          ))}
        </div>
      );
    }
    const { container, rerender } = render(<RevisionView revision="path-a/base-1/next-2" />);
    await waitFor(() => expect(engine.tokenizeCode).toHaveBeenCalledTimes(1));
    const current = engine.tokenizeCode.mock.calls[0]![2];
    rerender(<RevisionView revision="path-b/base-1/next-3" />);
    await waitFor(() =>
      expect(container.querySelector('[data-state="highlighted"]')).not.toBeNull(),
    );
    await act(async () => finish([[{ text: 'same source', tone: 'constant' }]]));
    expect(current()).toBe(false);
    expect(container.querySelector('[data-code-token="constant"]')).toBeNull();
    expect(container.querySelector('[data-code-token="string"]')).not.toBeNull();
  });
  it.each([
    { code: 'const a=1', language: 'ts', streaming: true, state: 'streaming' },
    { code: 'const a=1', language: '../../remote', state: 'unsupported' },
    { code: 'x'.repeat(20001), language: 'ts', state: 'limited' },
    { code: 'x'.repeat(2001), language: 'ts', state: 'limited' },
    { code: 'a\n'.repeat(301), language: 'ts', state: 'limited' },
    { code: 'const a=1', language: 'ts', highlight: false, state: 'plain' },
  ])('keeps $state source plain without invoking the tokenizer', async ({ state, ...props }) => {
    const { container } = render(<HighlightedCodeBlock {...props} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(engine.tokenizeCode).not.toHaveBeenCalled();
    expect(container.querySelector('[data-part="code-block"]')).toHaveAttribute(
      'data-highlighting',
      state,
    );
    expect(container.querySelector('pre')?.textContent).toBe(props.code);
  });
  it('discards an obsolete asynchronous source and language result', async () => {
    let finishOld: (value: unknown) => void = () => {};
    engine.tokenizeCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockImplementationOnce(async (code: string) => [[{ text: code, tone: 'string' }]]);
    const { container, rerender } = render(<HighlightedCodeBlock code="old" language="ts" />);
    await waitFor(() => expect(engine.tokenizeCode).toHaveBeenCalledTimes(1));
    rerender(<HighlightedCodeBlock code="new" language="json" />);
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    await act(async () => {
      finishOld([[{ text: 'old', tone: 'keyword' }]]);
    });
    expect(container.querySelector('pre')?.textContent).toBe('new');
    expect(container.querySelector('[data-code-token="keyword"]')).toBeNull();
    expect(engine.tokenizeCode.mock.calls[0]![2]()).toBe(false);
  });
  it('shows plain fallback on failure and recovers for a new source', async () => {
    engine.tokenizeCode
      .mockRejectedValueOnce(new Error('Grammar unavailable'))
      .mockImplementationOnce(async (code: string) => [[{ text: code, tone: 'text' }]]);
    const { rerender, container } = render(<HighlightedCodeBlock code="first" language="ts" />);
    await screen.findByText('Syntax highlighting unavailable. Showing plain code.');
    expect(container.querySelector('pre')?.textContent).toBe('first');
    rerender(<HighlightedCodeBlock code="second" language="ts" />);
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    expect(screen.queryByText('Syntax highlighting unavailable. Showing plain code.')).toBeNull();
  });
});
