import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MarketingNumber, MarketingReveal } from './marketing-motion.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('marketing motion', () => {
  it('shows content at once without IntersectionObserver and keeps the final figure in the text', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(
      <MarketingReveal>
        <p>Teams that ship</p>
      </MarketingReveal>,
    );
    expect(screen.getByText('Teams that ship').parentElement).toHaveAttribute('data-visible');
  });
  it('skips counting under reduced motion and renders the formatted value', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    render(
      <MarketingNumber value={1200} format={(count) => `${count.toLocaleString('en-US')} teams`} />,
    );
    expect(screen.getByText('1,200 teams')).toBeInTheDocument();
  });
  it('announces the final value while a count is in progress', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    let frame: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    render(<MarketingNumber value={500} durationMs={1000} />);
    expect(frame).not.toBeNull();
    act(() => frame?.(performance.now() + 200));
    const node = screen.getByText('500', { selector: '.uim-sr-only' });
    expect(node).toBeInTheDocument();
    expect(screen.getByText(/^[0-9]+$/, { selector: '[aria-hidden]' })).not.toHaveTextContent(
      '500',
    );
  });
});
