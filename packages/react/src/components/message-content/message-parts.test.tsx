import { render, screen } from '@testing-library/react';

import { afterEach, describe, expect, it } from 'vitest';

import type { MessageData, MessagePart, Runtime, TextMessagePart } from '@stackunseen/ui-core';

import { MessageContent } from '@stackunseen/ui';

const closed: TextMessagePart = {
  id: 'intro',
  type: 'text',
  format: 'markdown',
  text: '**Completed** section.',
  state: 'complete',
};

const active: TextMessagePart = {
  id: 'answer',
  type: 'text',
  format: 'markdown',
  text: 'A partial',
  state: 'streaming',
};

const message = (parts: MessagePart[] = [closed, active]): MessageData => ({
  id: 'rich',
  role: 'assistant',
  state: 'streaming',
  revision: 0,
  parts,
});

const live: Runtime[] = [];

afterEach(() => {
  live.splice(0).forEach((store) => store.dispose());
});

describe('message part composition', () => {
  it('has explicit unresolved/unsupported parts and hides a mismatched attachment preview', () => {
    const value: MessageData = {
      ...message([
        { id: 'f', type: 'attachment', attachmentId: 'file', version: 'old' },
        { id: 't', type: 'tool', toolCallId: 'missing' },
        { id: 'u', type: 'unsupported', kind: 'future-viz', label: 'New visualization' },
      ]),
      state: 'complete',
    };
    render(
      <MessageContent
        value={value}
        attachments={[
          {
            id: 'file',
            version: 'new',
            value: {
              name: 'Private.txt',
              state: 'ready',
              preview: { kind: 'text', text: 'Do not show' },
            },
          },
        ]}
      />,
    );
    expect(screen.queryByText('Private.txt')).toBeNull();
    expect(screen.getByText(/version of the attachment isn’t available/)).toBeVisible();
    expect(screen.getByText(/tool result isn’t available/)).toBeVisible();
    expect(screen.getByText(/Unsupported content: New visualization/)).toBeVisible();
  });
});
