import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThreadList, BranchSwitcher, MessageQueue } from '@stackunseen/ui';
import type { NavigationAvailability } from '@stackunseen/ui-core';
import { context, thread, branches, item } from '../fixtures/conversation-navigation.js';

describe('controlled navigation and compact contextual actions', () => {
  it.each(['denied', 'loading', 'error', 'unknown', 'unavailable'] as NavigationAvailability[])(
    '%s hides records across the three families',
    (status) => {
      render(
        <>
          <ThreadList
            context={context}
            status={status}
            threads={[{ ...thread, title: 'Private conversation' }]}
            query="secret query"
          />
          <BranchSwitcher
            context={context}
            status={status}
            branches={[{ ...branches[0]!, label: 'Private branch' }]}
          />
          <MessageQueue
            context={context}
            status={status}
            items={[{ ...item, text: 'Private queue' }]}
          />
        </>,
      );
      expect(screen.queryByText('Private conversation')).toBeNull();
      expect(screen.queryByText('Private branch')).toBeNull();
      expect(screen.queryByText('Private queue')).toBeNull();
      expect(screen.queryByRole('searchbox')).toBeNull();
    },
  );
});
