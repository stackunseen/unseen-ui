import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceSelector } from './voice-selector.js';
import { Transcription } from '../transcription/transcription.js';

const voices = [
  { id: 'a', name: 'Ash', description: 'Warm' },
  { id: 'b', name: 'Birch' },
  { id: 'c', name: 'Cedar', disabledReason: 'Not available in your region' },
];

describe('VoiceSelector', () => {
  it('offers voices as one named radio group and reports a choice', async () => {
    const onValueChange = vi.fn();
    render(<VoiceSelector voices={voices} value="a" onValueChange={onValueChange} />);
    expect(screen.getByRole('group', { name: 'Voice' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Ash/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Birch/ }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('explains an unavailable voice and offers no sample for it', () => {
    render(
      <VoiceSelector voices={voices} value="a" onValueChange={() => {}} onPreview={() => {}} />,
    );
    expect(screen.getByRole('radio', { name: /Cedar/ })).toBeDisabled();
    expect(screen.getByText('Not available in your region')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Play Cedar sample' })).toBeNull();
  });

  it('plays a sample through the host without choosing the voice', async () => {
    const onValueChange = vi.fn();
    const onPreview = vi.fn();
    render(
      <VoiceSelector
        voices={voices}
        value="a"
        onValueChange={onValueChange}
        onPreview={onPreview}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play Birch sample' }));
    expect(onPreview).toHaveBeenCalledWith('b');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('says when no voices are available', () => {
    render(<VoiceSelector voices={[]} value="" onValueChange={() => {}} label="Narrator" />);
    expect(screen.getByRole('group', { name: 'Narrator' })).toHaveTextContent(
      'No voices available.',
    );
  });
});

describe('Transcription', () => {
  const segments = [
    { id: '1', start: 0, end: 4, text: 'Welcome back.', speaker: 'Host' },
    { id: '2', start: 4, end: 65, text: 'Thanks for having me.' },
    { id: '3', start: 65, end: 70, text: 'Let us begin.' },
  ];

  it('marks the segment being played; a segment ends where the next begins', () => {
    const { rerender } = render(<Transcription segments={segments} currentTime={4} />);
    const current = () => document.querySelectorAll('[aria-current]');
    expect(current()).toHaveLength(1);
    expect(current()[0]).toHaveTextContent('Thanks for having me.');
    rerender(<Transcription segments={segments} currentTime={200} />);
    expect(current()).toHaveLength(0);
    rerender(<Transcription segments={segments} />);
    expect(current()).toHaveLength(0);
  });

  it('shows start times and speakers, and seeks through the host', async () => {
    const onSeek = vi.fn();
    render(<Transcription segments={segments} onSeek={onSeek} label="Call transcript" />);
    expect(screen.getByRole('list', { name: 'Call transcript' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Host: Welcome back/ })).toHaveTextContent('0:00');
    await userEvent.click(screen.getByRole('button', { name: /Let us begin/ }));
    expect(onSeek).toHaveBeenCalledWith(65);
    expect(screen.getByRole('button', { name: /Let us begin/ })).toHaveTextContent('1:05');
  });

  it('is plain text without a seek handler and says when empty', () => {
    const { rerender } = render(<Transcription segments={segments} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Transcription segments={[]} />);
    expect(screen.getByText('No transcript yet.')).toBeVisible();
  });
});
