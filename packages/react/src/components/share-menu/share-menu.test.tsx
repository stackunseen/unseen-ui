import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareMenu } from './share-menu.js';

afterEach(() => {
  cleanup();
  delete (navigator as { clipboard?: unknown }).clipboard;
  delete (navigator as { share?: unknown }).share;
});

const url = 'https://example.test/journal/evals?x=1&y=two words';
const title = 'Evals & you';

describe('ShareMenu', () => {
  it('renders encoded external links in new tabs, email without a tab, and no native share without support', () => {
    render(<ShareMenu url={url} title={title} text="Worth a read" />);
    const group = screen.getByRole('group', { name: 'Share this page' });
    expect(within(group).getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(within(group).queryByRole('button', { name: 'Share…' })).toBeNull();
    const linkedin = within(group).getByRole('link', { name: 'LinkedIn' });
    expect(linkedin).toHaveAttribute(
      'href',
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    );
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
    const x = within(group).getByRole('link', { name: 'X' });
    expect(x.getAttribute('href')).toBe(
      `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    );
    const email = within(group).getByRole('link', { name: 'Email' });
    expect(email.getAttribute('href')).toBe(
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Worth a read\n\n${url}`)}`,
    );
    expect(email).not.toHaveAttribute('target');
    expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('');
  });

  it('offers the native share sheet when supported, treats a dismissal as nothing, and reports failures', async () => {
    const share = vi.fn().mockRejectedValueOnce(new DOMException('dismissed', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(<ShareMenu url={url} title={title} onShare={onShare} targets={['native']} />);
    const button = screen.getByRole('button', { name: 'Share…' });
    await user.click(button);
    expect(share).toHaveBeenCalledWith({ title, text: undefined, url });
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(onShare).not.toHaveBeenCalled();
    share.mockRejectedValueOnce(new Error('NotAllowedError'));
    await user.click(button);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Sharing is unavailable here'),
    );
    share.mockResolvedValueOnce(undefined);
    await user.click(button);
    await waitFor(() => expect(onShare).toHaveBeenCalledWith('native'));
  });

  it('copies through CopyButton and reports the outcome', async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareMenu url={url} title={title} targets={['copy']} onShare={onShare} />);
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(url);
    await waitFor(() => expect(onShare).toHaveBeenCalledWith('copy'));
    expect(screen.getAllByRole('status').some((node) => node.textContent === 'Link copied')).toBe(
      true,
    );
  });

  it('presents the targets as a menu and renders on the server', async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        url={url}
        title={title}
        presentation="menu"
        targets={[
          'copy',
          { id: 'bluesky', label: 'Bluesky', href: 'https://bsky.app/intent/compose?text=hi' },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Share' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument();
    const custom = within(menu).getByRole('menuitem', { name: 'Bluesky' });
    expect(custom).toHaveAttribute('href', 'https://bsky.app/intent/compose?text=hi');
    expect(custom).toHaveAttribute('rel', 'noopener noreferrer');
    const html = renderToString(<ShareMenu url={url} title={title} />);
    expect(html).toContain('Copy link');
    expect(html).not.toContain('Share…');
  });
});
