import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Video } from '@stackunseen/ui/media';

describe('Video', () => {
  it('shows queued and measured progress, and only the progress the host measured', () => {
    const { rerender } = render(<Video label="A paper boat on a pond" state="queued" />);
    expect(screen.getByRole('status').textContent).toContain('Waiting to start');
    rerender(<Video label="A paper boat on a pond" state="loading" />);
    expect(screen.getByRole('status').textContent).toBe('Generating video…');
    expect(screen.queryByRole('progressbar')).toBeNull();
    rerender(<Video label="A paper boat on a pond" state="loading" progress={0.42} />);
    expect(screen.getByRole('status').textContent).toContain('42%');
    expect(screen.getByRole('progressbar', { name: 'Video generation' })).toBeTruthy();
  });

  it('offers a retry when it failed', async () => {
    const retry = vi.fn();
    render(<Video label="Boat" state="failed" error="The video model is busy." onRetry={retry} />);
    expect(screen.getByRole('alert').textContent).toContain('busy');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('plays only safe sources, with controls and no autoplay', () => {
    const { container, rerender } = render(
      <Video label="Boat" src="https://example.com/boat.mp4" />,
    );
    const video = container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('https://example.com/boat.mp4');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.getAttribute('aria-label')).toBe('Boat');
    rerender(<Video label="Boat" src="javascript:alert(1)" />);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img', { name: 'Boat' }).textContent).toBe('Video unavailable');
  });
});
