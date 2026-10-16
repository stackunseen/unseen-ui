'use client';
import { useEffect, useMemo } from 'react';
import { createLocalHost } from '@stackunseen/ui-core';
import type { LocalHost, LocalHostOptions } from '@stackunseen/ui-core';

export { Chat } from './components/chat/chat.js';
export type {
  ChatProps,
  ChatBaseProps,
  ChatControlledProps,
  ChatHostProps,
  ChatHost,
  ChatHostSnapshot,
  ChatStatus,
} from './components/chat/chat.js';
export type {
  LocalHost,
  LocalHostOptions,
  LocalHostSnapshot,
  LocalReply,
} from '@stackunseen/ui-core';
export { createLocalHost, defaultLocalReply } from '@stackunseen/ui-core';

/**
 * One local host for the life of the component. Pass the result to Chat as `host`.
 * Options are read once; recreate the component (change its key) to change them.
 */
export function useLocalHost(options?: LocalHostOptions): LocalHost {
  const host = useMemo(() => createLocalHost(options), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => host.dispose(), [host]);
  return host;
}
