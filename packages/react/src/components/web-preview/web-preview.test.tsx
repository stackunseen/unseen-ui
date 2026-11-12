import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebPreview } from './web-preview.js';

describe('WebPreview', () => {
  it('frames an http(s) page without same-origin access', () => {
    render(<WebPreview url="https://example.com/app" title="Draft site" />);
    const frame = screen.getByTitle('Draft site');
    expect(frame).toHaveAttribute('src', 'https://example.com/app');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.getByRole('link', { name: 'Open in a new tab' })).toHaveAttribute(
      'rel',
      'noreferrer noopener',
    );
    expect(screen.getByRole('textbox', { name: 'Preview address' })).toHaveAttribute('readonly');
  });

  it('refuses to frame other schemes', () => {
    render(<WebPreview url="javascript:alert(1)" />);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByText(/cannot be previewed/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reload preview' })).toBeDisabled();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('asks the host to navigate, and explains an address it will not send', async () => {
    const onNavigate = vi.fn();
    render(<WebPreview url="https://example.com/" onNavigate={onNavigate} />);
    const address = screen.getByRole('textbox', { name: 'Preview address' });
    await userEvent.clear(address);
    await userEvent.type(address, 'example.org{Enter}');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('http:// or https://');
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(address).toHaveAccessibleDescription(/starts with http/);
    await userEvent.type(address, '/');
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.clear(address);
    await userEvent.type(address, ' https://example.org/docs {Enter}');
    expect(onNavigate).toHaveBeenCalledWith('https://example.org/docs');
    // The frame keeps the host's page until the host changes `url`.
    expect(document.querySelector('iframe')).toHaveAttribute('src', 'https://example.com/');
  });

  it('follows a new host url and reloads by replacing the frame', async () => {
    const { rerender } = render(<WebPreview url="https://example.com/" onNavigate={() => {}} />);
    const before = document.querySelector('iframe');
    await userEvent.click(screen.getByRole('button', { name: 'Reload preview' }));
    expect(document.querySelector('iframe')).not.toBe(before);
    rerender(<WebPreview url="https://example.com/next" onNavigate={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Preview address' })).toHaveValue(
      'https://example.com/next',
    );
  });
});
