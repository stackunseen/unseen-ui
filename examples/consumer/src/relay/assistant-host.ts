import { useEffect, useRef, useState } from 'react';
import type { MessageData } from '@ai-interaction/core';
import type { Account } from './data';
import { money } from './data';

export const ASSISTANT_LIMITS = { prompt: 1_000, response: 4_000, messages: 12, accounts: 100 };
type RelayMessage = MessageData & { text: string };
type AssistantStatus = 'idle' | 'streaming' | 'complete' | 'cancelled' | 'failed';
interface AssistantSnapshot {
  messages: RelayMessage[];
  status: AssistantStatus;
  trimmed: boolean;
}
const short = (value: string, limit = 240) =>
  value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
/** Deterministic sample responses. This function never calls a model or changes an account. */
export function buildAssistantReply(
  prompt: string,
  accounts: readonly Account[],
  selectedAccount?: Account,
): string {
  const sample = accounts.slice(0, ASSISTANT_LIMITS.accounts);
  if (!sample.length && !selectedAccount) return 'There are no sample accounts to review yet.';
  const context = selectedAccount ? [selectedAccount] : sample;
  const scope = selectedAccount
    ? short(selectedAccount.name, 80)
    : `${sample.length} sample accounts`;
  const note = selectedAccount ? `\n\nAccount note: ${short(selectedAccount.notes)}` : '';
  let reply: string;
  if (/\b(draft|follow[ -]?up|email)\b/i.test(prompt)) {
    if (!selectedAccount) {
      return 'Select an account from the table, then ask me to draft a follow-up. The draft stays here for you to review.';
    }
    reply = `Draft for ${scope}. Nothing has been sent.\n\nHi team,\n\nI’m checking in ahead of the renewal on ${short(selectedAccount.renewal, 30)}. Could we confirm the next steps and any open questions?\n\nThanks,\n${short(selectedAccount.owner, 80)}${note}`;
  } else if (/\b(risk|attention|priorit\w*|watch)\b/i.test(prompt)) {
    const review = context
      .filter((account) => account.health !== 'Healthy')
      .sort((a, b) => a.renewal.localeCompare(b.renewal));
    reply = review.length
      ? `${review.length} ${review.length === 1 ? 'account needs' : 'accounts need'} a closer look, ordered by renewal date. These are the health labels in the sample data.\n\n${review
          .slice(0, 5)
          .map(
            (account) =>
              `${short(account.name, 80)} · ${account.health}\nRenewal: ${short(account.renewal, 30)}. Owner: ${short(account.owner, 80)}.\n${short(account.notes)}`,
          )
          .join(
            '\n\n',
          )}\n\nSuggested next step: confirm the renewal plan with each account owner.${review.length > 5 ? '\nShowing the first five accounts.' : ''}`
      : `${scope} ${selectedAccount ? 'is' : 'are all'} marked Healthy in the sample data. This label is not a prediction of renewal.`;
  } else if (/\b(summary|summari\w*|brief|overview|renewal\w*)\b/i.test(prompt)) {
    reply = selectedAccount
      ? `${scope} is marked ${selectedAccount.health}. The account has ${money(selectedAccount.arr)} in annual recurring revenue and renews on ${short(selectedAccount.renewal, 30)}.\n\n${short(selectedAccount.owner, 80)} owns the relationship. Last contact: ${short(selectedAccount.lastContact, 30)}.${note}\n\nSuggested next step: confirm the renewal plan with the account owner.`
      : `Your sample portfolio has ${sample.length} accounts and ${money(sample.reduce((sum, account) => sum + account.arr, 0))} in annual recurring revenue. ${sample.filter((account) => account.health === 'At risk').length} are marked At risk; ${sample.filter((account) => account.health === 'Watch').length} are on Watch.\n\nAsk me to prioritize renewals, or select an account for a brief and a follow-up draft.`;
  } else {
    reply =
      'This local demo can summarize accounts, prioritize renewals, and draft a follow-up. Try “Summarize this account” or “Prioritize renewals”. It does not answer general questions or make account changes.';
  }
  if (accounts.length > sample.length && !selectedAccount) {
    reply += `\n\nThis demo uses the first ${ASSISTANT_LIMITS.accounts} accounts only.`;
  }
  return short(reply, ASSISTANT_LIMITS.response);
}

/** Local host state belongs to the template, while library components stay controlled. */
export function useAssistantHost(accounts: readonly Account[], selectedAccount?: Account) {
  const [snapshot, setSnapshot] = useState<AssistantSnapshot>({
    messages: [],
    status: 'idle',
    trimmed: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const active = useRef(false);
  const originalPrompt = useRef('');

  useEffect(
    () => () => {
      generation.current++;
      active.current = false;
      clearTimeout(timer.current);
    },
    [],
  );

  function start(prompt: string, simulateError = false, retry = false) {
    const text = prompt.trim();
    if (active.current || !text || text.length > ASSISTANT_LIMITS.prompt) return;
    clearTimeout(timer.current);
    const attempt = ++generation.current;
    active.current = true;
    originalPrompt.current = text;
    const response = buildAssistantReply(text, accounts, selectedAccount);
    const responseId = `relay-response-${attempt}`;
    const message: RelayMessage = {
      id: responseId,
      role: 'assistant',
      text: '',
      state: 'streaming',
      revision: 0,
    };
    setSnapshot((current) => {
      const messages = retry
        ? [...current.messages.slice(0, -1), message]
        : [
            ...current.messages,
            {
              id: `relay-prompt-${attempt}`,
              role: 'user' as const,
              text,
              state: 'complete' as const,
              revision: 0,
            },
            message,
          ];
      return {
        messages: messages.slice(-ASSISTANT_LIMITS.messages),
        status: 'streaming',
        trimmed: current.trimmed || messages.length > ASSISTANT_LIMITS.messages,
      };
    });
    let offset = 0;
    function tick() {
      if (generation.current !== attempt || !active.current) return;
      offset = Math.min(offset + 16, response.length);
      const failed = simulateError && offset >= Math.min(80, response.length);
      const done = offset === response.length;
      if (done || failed) active.current = false;
      setSnapshot((current) => ({
        ...current,
        status: failed ? 'failed' : done ? 'complete' : 'streaming',
        messages: current.messages.map((item) =>
          item.id === responseId
            ? {
                ...item,
                text: response.slice(0, offset),
                revision: item.revision + 1,
                state: failed ? 'failed' : done ? 'complete' : 'streaming',
                ...(failed
                  ? {
                      error: {
                        code: 'demo_failure',
                        message: 'Simulated error. Retry the same prompt to finish the response.',
                      },
                    }
                  : {}),
              }
            : item,
        ),
      }));
      if (!done && !failed) timer.current = setTimeout(tick, 65);
    }
    timer.current = setTimeout(tick, 300);
  }

  function cancel() {
    if (!active.current) return;
    active.current = false;
    generation.current++;
    clearTimeout(timer.current);
    setSnapshot((current) => ({
      ...current,
      status: 'cancelled',
      messages: current.messages.map((message) =>
        message.state === 'streaming'
          ? { ...message, state: 'interrupted', revision: message.revision + 1 }
          : message,
      ),
    }));
  }

  return {
    ...snapshot,
    submit: start,
    cancel,
    retry: () => start(originalPrompt.current, false, true),
  };
}
