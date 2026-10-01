import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageContent, StreamingResponse } from '@ai-interaction/react';
import type { MessageData } from '@ai-interaction/core';

describe('StreamingResponse design and announcement contracts', () => {
  it.each(['cursor', 'dots', 'shimmer'] as const)(
    '%s announces one public receiving status while preserving empty/partial streaming text',
    (variant) => {
      const { rerender } = render(
        <StreamingResponse variant={variant} text="" state="streaming" />,
      );
      const statuses = screen.getAllByRole('status');
      expect(statuses.filter((node) => node.textContent?.trim())).toHaveLength(1);
      expect(statuses.find((node) => node.textContent?.trim())).toHaveTextContent(
        'Receiving response',
      );
      rerender(
        <StreamingResponse variant={variant} text="Partial public answer" state="streaming" />,
      );
      expect(screen.getByText('Partial public answer')).toBeVisible();
      expect(screen.getAllByRole('status').filter((node) => node.textContent?.trim())).toHaveLength(
        1,
      );
    },
  );
  it.each(['cursor', 'dots', 'shimmer'] as const)(
    '%s suppresses every per-part live announcement when the host owns the message boundary',
    (variant) => {
      const { rerender } = render(
        <StreamingResponse variant={variant} text="" state="streaming" showStatus={false} />,
      );
      expect(screen.queryByRole('status')).toBeNull();
      rerender(
        <StreamingResponse
          variant={variant}
          text="Partial answer"
          state="failed"
          error="Public error"
          showStatus={false}
        />,
      );
      expect(screen.getByText('Partial answer')).toBeVisible();
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it.each(['cursor', 'dots', 'shimmer'] as const)(
    '%s composite messages retain a single nonempty receiving announcement',
    (responseVariant) => {
      const value: MessageData = {
        id: 'message',
        revision: 1,
        role: 'assistant',
        state: 'streaming',
        parts: [{ id: 'part', type: 'text', format: 'plain', text: '', state: 'streaming' }],
      };
      render(<MessageContent value={value} responseVariant={responseVariant} />);
      expect(screen.getAllByRole('status').filter((node) => node.textContent?.trim())).toHaveLength(
        1,
      );
      expect(
        screen.getAllByRole('status').find((node) => node.textContent?.trim()),
      ).toHaveTextContent('Receiving response');
    },
  );
  it.each(['cursor', 'dots', 'shimmer'] as const)(
    '%s keeps safe original text and visible long errors across interrupted/failed/complete states',
    (variant) => {
      const text = '<script>run_untrusted_code()</script>\n' + 'workspace-path/'.repeat(60);
      const error = 'Host reported ' + 'connector-error/'.repeat(40);
      const { container, rerender } = render(
        <StreamingResponse
          variant={variant}
          text={text}
          state="interrupted"
          className="host-response"
        />,
      );
      expect(container.querySelector('[data-part="response"]')).toHaveClass('host-response');
      expect(container.querySelector('p')).toHaveTextContent(
        '<script>run_untrusted_code()</script>',
      );
      expect(container.querySelector('script')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Response interrupted. Partial content retained.',
      );
      rerender(<StreamingResponse variant={variant} text={text} state="failed" error={error} />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Response failed. Received content retained.',
      );
      expect(screen.getByRole('alert')).toHaveTextContent(error);
      expect(container.querySelector('p')).toHaveTextContent('workspace-path/');
      rerender(<StreamingResponse variant={variant} text={text} state="complete" />);
      expect(screen.getByRole('status')).toHaveTextContent('Response complete');
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it('passes only the public text/state to an explicit trusted renderer and keeps status separate', () => {
    const renderer = vi.fn(({ text }: { text: string }) => (
      <span data-testid="trusted-content">{text}</span>
    ));
    const { container } = render(
      <StreamingResponse
        text="Public execution summary"
        state="interrupted"
        renderContent={renderer}
      />,
    );
    expect(renderer).toHaveBeenCalledExactlyOnceWith({
      text: 'Public execution summary',
      state: 'interrupted',
    });
    expect(screen.getByTestId('trusted-content')).toHaveTextContent('Public execution summary');
    const status = screen.getByRole('status');
    expect(status.previousElementSibling).toBe(screen.getByTestId('trusted-content'));
    expect(container.textContent).not.toMatch(/reasoning|confidence|progress|tokens|cost/i);
  });
});
