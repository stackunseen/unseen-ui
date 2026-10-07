import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AudioPlayer,
  Image,
  Persona,
  Transcription,
  VoiceSelector,
  formatTime,
} from '@stackunseen/ui/media';

describe('media entry', () => {
  it('formats times and refuses unsafe audio sources', () => {
    expect(formatTime(75)).toBe('1:15');
    expect(formatTime(Number.NaN)).toBe('--:--');
    render(<AudioPlayer src="javascript:alert(1)" label="Answer audio" />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByText('Audio unavailable')).toBeVisible();
  });

  it('highlights the active transcript segment and seeks', async () => {
    const onSeek = vi.fn();
    render(
      <Transcription
        currentTime={3}
        onSeek={onSeek}
        segments={[
          { id: '1', start: 0, end: 2, text: 'Hello', speaker: 'Ana' },
          { id: '2', start: 2, end: 5, text: 'Welcome back' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /Welcome back/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: /Hello/ }));
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('selects voices and requests samples without selecting', async () => {
    const onValueChange = vi.fn();
    const onPreview = vi.fn();
    render(
      <VoiceSelector
        value="a"
        onValueChange={onValueChange}
        onPreview={onPreview}
        voices={[
          { id: 'a', name: 'Aria' },
          { id: 'b', name: 'Ben', description: 'Warm' },
          { id: 'c', name: 'Cy', disabledReason: 'Not licensed' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play Ben sample' }));
    expect(onPreview).toHaveBeenCalledWith('b');
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('radio', { name: /Ben/ }));
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('radio', { name: /Cy/ })).toBeDisabled();
  });

  it('announces persona state', () => {
    render(<Persona state="listening" name="Relay" showLabel={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Relay: Listening');
  });

  it('renders base64 images and rejects unsafe sources', () => {
    const { rerender } = render(<Image base64="iVBORw0KGgo=" mediaType="image/png" alt="Chart" />);
    expect(screen.getByRole('img', { name: 'Chart' })).toHaveAttribute(
      'src',
      'data:image/png;base64,iVBORw0KGgo=',
    );
    rerender(<Image src="javascript:alert(1)" alt="Bad" />);
    expect(screen.getByRole('img', { name: 'Bad' })).toHaveTextContent('Image unavailable');
    rerender(<Image alt="Pending" state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Generating image…');
  });
});
