import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableOfContents } from './table-of-contents.js';
import { useActiveHeading } from './use-active-heading.js';

afterEach(cleanup);

const items = [
  { id: 'why', title: 'Why evals' },
  {
    id: 'datasets',
    title: 'Datasets',
    items: [
      { id: 'golden', title: 'Golden sets' },
      { id: 'synthetic', title: 'Synthetic cases' },
    ],
  },
  { id: 'scoring', title: 'Scoring' },
];

/** Places headings at the given viewport offsets; the reading line is innerHeight * 0.33. */
function placeHeadings(tops: Record<string, number>) {
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
  for (const [id, top] of Object.entries(tops)) {
    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement('h2');
      element.id = id;
      document.body.append(element);
    }
    element.getBoundingClientRect = () => ({ top }) as DOMRect;
  }
}
const scroll = () => act(() => window.dispatchEvent(new Event('scroll')));

describe('TableOfContents', () => {
  it('marks the heading past the reading line, reads earlier sections, and shows only the active sub-items', async () => {
    placeHeadings({ why: 100, datasets: 1200, golden: 1400, synthetic: 1600, scoring: 2000 });
    const onActiveChange = vi.fn();
    render(<TableOfContents items={items} numbered showReading onActiveChange={onActiveChange} />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const why = within(nav).getByRole('link', { name: 'Why evals' });
    expect(why).toHaveTextContent('01');
    expect(why).toHaveAttribute('href', '#why');
    expect(why).toHaveAttribute('aria-current', 'location');
    expect(within(nav).queryByRole('link', { name: 'Golden sets' })).toBeNull();
    expect(nav).toHaveTextContent('1 / 3');
    placeHeadings({ why: -800, datasets: 200, golden: 250, synthetic: 700, scoring: 1500 });
    await scroll();
    expect(within(nav).getByRole('link', { name: 'Golden sets' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(why.closest('li')).toHaveAttribute('data-state', 'read');
    expect(within(nav).getByRole('link', { name: 'Datasets' }).closest('li')).toHaveAttribute(
      'data-state',
      'current',
    );
    expect(nav).toHaveTextContent('2 / 3');
    expect(onActiveChange).toHaveBeenLastCalledWith('golden');
    placeHeadings({ why: 100, datasets: 1200, golden: 1400, synthetic: 1600, scoring: 2000 });
    await scroll();
    expect(within(nav).queryByRole('link', { name: 'Golden sets' })).toBeNull();
  });

  it('renders nothing below minItems, can be controlled, and toggles on request', async () => {
    const { container, rerender } = render(<TableOfContents items={items.slice(0, 1)} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TableOfContents items={items} activeId="scoring" collapsible="always" />);
    expect(screen.getByRole('link', { name: 'Scoring' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    const toggle = screen.getByRole('button', { name: 'Show' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation')).toHaveAttribute('data-open');
  });

  it('renders on the server without an active heading and cleans up its listeners', () => {
    const html = renderToString(<TableOfContents items={items} label="Contents" numbered />);
    expect(html).toContain('Contents');
    expect(html).toContain('href="#datasets"');
    expect(html).not.toContain('aria-current');
    placeHeadings({ why: 100 });
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    function Probe() {
      const active = useActiveHeading(['why']);
      return <output>{active ?? 'none'}</output>;
    }
    const { unmount } = render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('why');
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
