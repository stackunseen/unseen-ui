import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TableOfContents, trackPath } from './table-of-contents.js';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const items = [
  { id: 'v-why', title: 'Why evals' },
  {
    id: 'v-datasets',
    title: 'Datasets',
    items: [
      { id: 'v-golden', title: 'Golden sets' },
      { id: 'v-synthetic', title: 'Synthetic cases' },
    ],
  },
  { id: 'v-scoring', title: 'Scoring' },
];

function placeHeadings(tops: Record<string, number>) {
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
  for (const [id, top] of Object.entries(tops)) {
    const element = document.createElement('h2');
    element.id = id;
    element.getBoundingClientRect = () => ({ top }) as DOMRect;
    document.body.append(element);
  }
}

describe('TableOfContents variants', () => {
  it('track shows every level and lights the sections on screen', () => {
    placeHeadings({
      'v-why': 100,
      'v-datasets': 1200,
      'v-golden': 1400,
      'v-synthetic': 1600,
      'v-scoring': 2000,
    });
    render(<TableOfContents variant="track" items={items} collapsible="never" />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav).toHaveAttribute('data-variant', 'track');
    // Nested titles are listed even though their section is not being read.
    expect(within(nav).getByRole('link', { name: 'Golden sets' })).toHaveAttribute(
      'href',
      '#v-golden',
    );
    expect(within(nav).getByRole('link', { name: 'Why evals' })).toHaveAttribute('data-lit');
    expect(within(nav).getByRole('link', { name: 'Datasets' })).not.toHaveAttribute('data-lit');
  });

  it('track lights only the controlled heading when activeId is passed', () => {
    render(
      <TableOfContents variant="track" items={items} activeId="v-golden" collapsible="never" />,
    );
    const golden = screen.getByRole('link', { name: 'Golden sets' });
    expect(golden).toHaveAttribute('aria-current', 'location');
    expect(golden).toHaveAttribute('data-lit');
    expect(screen.getByRole('link', { name: 'Why evals' })).not.toHaveAttribute('data-lit');
  });

  it('ticks is a rail that opens into the titles and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<TableOfContents variant="ticks" items={items} activeId="v-datasets" />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const rail = within(nav).getByRole('button', { name: 'On this page' });
    expect(rail).toHaveAttribute('aria-expanded', 'false');
    // One mark per title, the active one marked current and its neighbours next.
    const marks = [...rail.querySelectorAll('[data-depth]')];
    expect(marks).toHaveLength(5);
    expect(marks.map((mark) => mark.getAttribute('data-near'))).toEqual([
      'next',
      'current',
      'next',
      null,
      null,
    ]);
    await user.click(rail);
    expect(rail).toHaveAttribute('aria-expanded', 'true');
    expect(nav).toHaveAttribute('data-open');
    expect(within(nav).getByRole('link', { name: 'Datasets' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    await user.keyboard('{Escape}');
    expect(rail).toHaveAttribute('aria-expanded', 'false');
    expect(rail).toHaveFocus();
  });
});

describe('trackPath', () => {
  const rows = [
    { top: 0, bottom: 30, x: 0.75 },
    { top: 30, bottom: 60, x: 12.75 },
    { top: 60, bottom: 90, x: 12.75 },
    { top: 90, bottom: 120, x: 0.75 },
  ];
  it('slants across the top of the row that changes level', () => {
    expect(trackPath(rows, 0, 3)).toBe(
      'M 0.75 0 L 0.75 30 L 0.75 30 L 12.75 38 L 12.75 60 L 12.75 90 L 12.75 90 L 0.75 98 L 0.75 120',
    );
  });
  it('starts a lit stretch below the slant and ends it on the row, with no part of a slant', () => {
    expect(trackPath(rows, 1, 1)).toBe('M 12.75 38 L 12.75 60');
    expect(trackPath(rows, 2, 2)).toBe('M 12.75 60 L 12.75 90');
    expect(trackPath(rows, 3, 3)).toBe('M 0.75 98 L 0.75 120');
  });
});
