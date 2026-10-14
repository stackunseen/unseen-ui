import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeTabs } from './code-tabs.js';
import type { CodeFile, CodeTourStop } from './code-tabs.js';
import { MarkdownCodeBlock } from '../code-block/code-block.js';
import type { CodeBlockHandle } from '../code-block/code-block.js';

afterEach(() => {
  cleanup();
  history.replaceState(null, '', `${location.pathname}${location.search}`);
});

const files: CodeFile[] = [
  {
    file: 'app.py',
    language: 'python',
    code: 'import os\n\ndef main():\n    run()\n',
    label: 'Entry',
  },
  { file: 'tools.py', language: 'python', code: 'def run():\n    return 1\n' },
  { file: 'README.md', language: 'markdown', code: '# Example\n' },
];
const tour: CodeTourStop[] = [
  { file: 'app.py', start: 3, end: 4, title: 'The entry point', note: 'Where the program starts.' },
  { file: 'tools.py', start: 1, end: 2, title: 'The tool', note: 'What main calls.' },
];

describe('CodeTabs', () => {
  it('lists files as a vertical tablist keyed by name, with roving arrow keys', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<CodeTabs files={files} label="Example files" onValueChange={onValueChange} />);
    const list = screen.getByRole('tablist', { name: 'Example files' });
    expect(list).toHaveAttribute('aria-orientation', 'vertical');
    const tabs = within(list).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveTextContent('Entry');
    expect(screen.getByRole('tabpanel', { name: /app\.py/ })).toHaveTextContent('import os');
    tabs[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(tabs[1]).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('tools.py');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('def run');
    await user.keyboard('{End}');
    expect(tabs[2]).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('# Example');
    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
  });

  it('runs the tour: selects the file, marks the lines, scrolls the pane, announces, and keeps the hash', async () => {
    const user = userEvent.setup();
    const onStopChange = vi.fn();
    render(
      <CodeTabs
        files={files}
        label="Example files"
        tour={tour}
        hashLinks="tour-"
        onStopChange={onStopChange}
      />,
    );
    expect(screen.getByText('Code tour · 2 stops')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start the tour' }));
    expect(onStopChange).toHaveBeenCalledWith(0);
    expect(location.hash).toBe('#tour-1');
    expect(screen.getByRole('button', { name: 'Stop 1: The entry point' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const status = screen.getByRole('status', { name: 'Tour stop' });
    expect(status).toHaveTextContent('app.py · lines 3 to 4');
    expect(status).toHaveTextContent('The entry point');
    const panel = screen.getByRole('tabpanel');
    expect(panel.querySelectorAll('[data-highlighted]')).toHaveLength(2);
    expect(panel.querySelector('[data-line="3"]')).toHaveAttribute('data-highlighted');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStopChange).toHaveBeenLastCalledWith(1);
    expect(location.hash).toBe('#tour-2');
    expect(screen.getByRole('tab', { name: /tools\.py/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel').querySelectorAll('[data-highlighted]')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'End the tour' }));
    expect(onStopChange).toHaveBeenLastCalledWith(null);
    expect(location.hash).toBe('');
    expect(screen.getByRole('button', { name: 'Start the tour' })).toBeInTheDocument();
  });

  it('opens a stop from the hash on arrival and when it changes', async () => {
    history.replaceState(null, '', '#tour-2');
    render(<CodeTabs files={files} label="Example files" tour={tour} hashLinks="tour-" />);
    expect(screen.getByRole('button', { name: 'Stop 2: The tool' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('tab', { name: /tools\.py/ })).toHaveAttribute('aria-selected', 'true');
    await act(async () => {
      history.replaceState(null, '', '#tour-1');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('button', { name: 'Stop 1: The entry point' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('renders one file as a captioned figure with a copy button, and on the server', () => {
    render(<CodeTabs files={[files[2]!]} label="Example files" copy />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('figure')).toHaveTextContent('README.md');
    expect(screen.getByRole('button', { name: 'Copy README.md' })).toBeInTheDocument();
    const html = renderToString(<CodeTabs files={files} label="Example files" tour={tour} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Code tour');
  });
});

describe('code block line marking', () => {
  it('marks ranges deterministically and scrolls the pane through the prop and the handle', () => {
    const ref = createRef<CodeBlockHandle>();
    const { container, rerender } = render(
      <MarkdownCodeBlock ref={ref} code={'a\nb\nc\nd'} language="txt" highlightLines={[[2, 3]]} />,
    );
    const lines = container.querySelectorAll('[data-line]');
    expect(lines).toHaveLength(4);
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(2);
    const pre = container.querySelector('pre')!;
    const scrolls: number[] = [];
    Object.defineProperty(pre, 'scrollTop', {
      get: () => 0,
      set: (value: number) => scrolls.push(value),
      configurable: true,
    });
    pre.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    container.querySelector<HTMLElement>('[data-line="4"]')!.getBoundingClientRect = () =>
      ({ top: 200 }) as DOMRect;
    rerender(<MarkdownCodeBlock ref={ref} code={'a\nb\nc\nd'} language="txt" scrollToLine={4} />);
    expect(scrolls).toEqual([176]);
    act(() => ref.current!.scrollToLine(4));
    expect(scrolls).toEqual([176, 176]);
  });
});

describe('CodeTabs follow-ups', () => {
  it('marks ranges as block bands and brings the tour into view for a hash link', async () => {
    const scrolls = vi.mocked(Element.prototype.scrollIntoView);
    scrolls.mockClear();
    history.replaceState(null, '', '#tour-1');
    const { container } = render(
      <CodeTabs files={files} label="Example files" tour={tour} hashLinks="tour-" />,
    );
    expect(container.querySelector('[data-part="code-tour"]')).toBeInTheDocument();
    expect(scrolls).toHaveBeenCalled();
    expect(container.querySelector('pre[data-marked]')).toBeInTheDocument();
    expect(
      container.querySelector('[role="status"][aria-label="Tour stop"]'),
    ).not.toBeEmptyDOMElement();
  });

  it('collapses the stop note while nothing is open', () => {
    const { container } = render(<CodeTabs files={files} label="Example files" tour={tour} />);
    expect(
      container.querySelector('[role="status"][aria-label="Tour stop"]'),
    ).toBeEmptyDOMElement();
    expect(container.querySelector('pre[data-marked]')).toBeNull();
  });
});
