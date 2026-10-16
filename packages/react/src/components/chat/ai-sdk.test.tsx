import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import type { AiSdkChatLike, AiSdkMessage } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';

const approvalMessages: AiSdkMessage[] = [
  { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Archive the inactive accounts' }] },
  {
    id: 'a1',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I need your approval first.', state: 'done' },
      {
        type: 'tool-archive_accounts',
        toolCallId: 'call-1',
        state: 'approval-requested',
        input: { ids: ['acme', 'demo'] },
        approval: { id: 'approval-1', requestReason: 'Two accounts become read-only.' },
      },
    ],
  },
];

/** A stand-in for useChat(): state in React, the same method names and argument shapes. */
function useFakeChat(initial: AiSdkMessage[]) {
  const [messages, setMessages] = useState(initial);
  const [status, setStatus] = useState<AiSdkChatLike['status']>('ready');
  const [calls] = useState(() => ({
    sendMessage: vi.fn((message: { text: string }) => {
      setMessages((list) => [
        ...list,
        { id: `u${list.length}`, role: 'user', parts: [{ type: 'text', text: message.text }] },
      ]);
      setStatus('submitted');
    }),
    stop: vi.fn(() => setStatus('ready')),
    regenerate: vi.fn(),
    addToolApprovalResponse: vi.fn((response: { id: string; approved: boolean }) => {
      setMessages((list) =>
        list.map((message) => ({
          ...message,
          parts: message.parts.map((part) =>
            'approval' in part &&
            (part as { approval?: { id: string } }).approval?.id === response.id
              ? {
                  ...part,
                  state: 'approval-responded',
                  approval: { id: response.id, approved: response.approved },
                }
              : part,
          ),
        })),
      );
      setStatus('submitted');
    }),
  }));
  return { chat: { messages, status, ...calls } satisfies AiSdkChatLike, calls };
}

let captured: ReturnType<typeof useFakeChat>['calls'] | undefined;
function Harness({ markdown = false }: { markdown?: boolean }) {
  const { chat, calls } = useFakeChat(approvalMessages);
  captured = calls;
  return (
    <Chat
      title="Demo"
      {...useAiSdkChat(chat)}
      renderTextPart={markdown ? renderMarkdownPart : undefined}
    />
  );
}

describe('Chat on an AI SDK chat', () => {
  it('shows an inline approval card that answers addToolApprovalResponse with the approval id', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const card = screen
      .getByRole('heading', { name: 'Run archive_accounts' })
      .closest('[data-part="approval"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card).toHaveTextContent('Two accounts become read-only.');
    expect(card).toHaveTextContent('Risk not assessed');
    // The reply waits on the decision, so copy and regenerate are held back.
    expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
    await user.click(within(card).getByRole('button', { name: /approve/i }));
    expect(captured!.addToolApprovalResponse).toHaveBeenCalledExactlyOnceWith({
      id: 'approval-1',
      approved: true,
    });
    expect(within(card).getByRole('button', { name: /approve/i })).toBeDisabled();
  });

  it('sends the draft through sendMessage and stops through stop', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('textbox'), 'And the next one{Enter}');
    expect(captured!.sendMessage).toHaveBeenCalledExactlyOnceWith({ text: 'And the next one' });
    expect(screen.getAllByRole('article', { name: 'user message' })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /stop|cancel/i }));
    expect(captured!.stop).toHaveBeenCalledOnce();
  });

  it('formats replies as Markdown when renderMarkdownPart is passed', async () => {
    function MarkdownHarness() {
      const { chat } = useFakeChat([
        {
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Use **bold** here.', state: 'done' }],
        },
      ]);
      return <Chat {...useAiSdkChat(chat)} renderTextPart={renderMarkdownPart} />;
    }
    render(<MarkdownHarness />);
    expect(await screen.findByText('bold', { selector: 'strong' })).toBeVisible();
  });

  it('lets a host render its own view for a tool', () => {
    function CustomTool() {
      const { chat } = useFakeChat([
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-weather',
              toolCallId: 'w1',
              state: 'output-available',
              input: { city: 'Oslo' },
              output: { c: 4 },
            },
          ],
        },
      ]);
      return (
        <Chat
          {...useAiSdkChat(chat)}
          renderTool={(tool) =>
            tool.name === 'weather' ? (
              <p>Weather card: {tool.output?.replace(/\s/g, '')}</p>
            ) : undefined
          }
        />
      );
    }
    render(<CustomTool />);
    expect(screen.getByText('Weather card: {"c":4}')).toBeVisible();
    expect(document.querySelector('[data-part="tool-call"]')).toBeNull();
  });
});
