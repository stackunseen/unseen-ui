import { useEffect, useId, useRef, useState } from 'react';
import { AIIcon, Button, Message, PromptInput } from '@stackunseen/ui';
import type { Account } from './data';
import { ASSISTANT_LIMITS, useAssistantHost } from './assistant-host';
import s from './assistant.module.css';

interface RelayAssistantProps {
  accounts: readonly Account[];
  selectedAccount?: Account;
  onClearContext?: () => void;
}

export function RelayAssistant({ accounts, selectedAccount, onClearContext }: RelayAssistantProps) {
  const headingId = useId();
  // Changed records start a fresh context and unmount the previous timer owner.
  const contextKey = JSON.stringify(
    selectedAccount ?? accounts.slice(0, ASSISTANT_LIMITS.accounts),
  );
  return (
    <section className={s.root} aria-labelledby={headingId}>
      <header className={s.header}>
        <div className={s.title}>
          <AIIcon name="assistant" />
          <h2 id={headingId}>AI assistant</h2>
        </div>
        <span className={s.badge}>Simulated AI</span>
      </header>
      <div className={s.context}>
        <AIIcon name="document" />
        <span>{selectedAccount ? selectedAccount.name : 'Portfolio overview'}</span>
        {selectedAccount && onClearContext && (
          <Button size="sm" variant="ghost" onClick={onClearContext}>
            All accounts
          </Button>
        )}
      </div>
      <AssistantSession key={contextKey} accounts={accounts} selectedAccount={selectedAccount} />
    </section>
  );
}

function AssistantSession({ accounts, selectedAccount }: RelayAssistantProps) {
  const host = useAssistantHost(accounts, selectedAccount);
  const [draft, setDraft] = useState('');
  const [simulateError, setSimulateError] = useState(false);
  const [follow, setFollow] = useState(true);
  const history = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const busy = host.status === 'streaming';
  const choices = selectedAccount
    ? ['Summarize this account', 'Draft a follow-up']
    : ['Summarize the portfolio', 'Prioritize renewals'];

  useEffect(() => {
    if (follow && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [host.messages, follow]);

  function submit(text: string) {
    if (busy || !text.trim() || text.trim().length > ASSISTANT_LIMITS.prompt) return;
    host.submit(text, simulateError);
    setDraft('');
    setSimulateError(false);
    setFollow(true);
    composer.current?.querySelector('textarea')?.focus();
  }

  return (
    <>
      <div className={s.intro}>
        <h3>
          {selectedAccount ? 'Get ready for the next conversation.' : 'A clear place to start.'}
        </h3>
        <p>
          {selectedAccount
            ? 'Review the account or prepare a follow-up from its current notes.'
            : 'Review your portfolio and find renewals that need attention.'}
        </p>
        {!host.messages.length && (
          <div className={s.choices}>
            {choices.map((choice) => (
              <Button key={choice} variant="outline" onClick={() => submit(choice)}>
                {choice}
                <AIIcon name="send" />
              </Button>
            ))}
          </div>
        )}
      </div>
      {host.messages.length > 0 && (
        <div
          ref={history}
          className={s.history}
          role="region"
          aria-label="Assistant conversation"
          tabIndex={0}
          onScroll={(event) => {
            const node = event.currentTarget;
            setFollow(node.scrollHeight - node.scrollTop - node.clientHeight < 48);
          }}
        >
          {host.trimmed && (
            <p className={s.note}>
              Showing the latest six exchanges. Earlier messages were cleared from this demo.
            </p>
          )}
          {host.messages.map((message) => (
            <Message key={message.id} value={message} className={s.message} variant="plain" />
          ))}
          {host.status === 'cancelled' && (
            <p className={s.note} role="status">
              Canceled. Your partial response is kept above.
            </p>
          )}
          {(host.status === 'failed' || host.status === 'cancelled') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                host.retry();
                composer.current?.querySelector('textarea')?.focus();
              }}
            >
              <AIIcon name="retry" />
              Retry response
            </Button>
          )}
        </div>
      )}
      {!follow && (
        <div className={s.jump}>
          <Button variant="ghost" size="sm" onClick={() => setFollow(true)}>
            Jump to latest
          </Button>
        </div>
      )}
      <div className={s.composer}>
        <PromptInput
          ref={composer}
          variant="compact"
          aria-label="Ask the demo assistant"
          value={draft}
          onValueChange={setDraft}
          onSubmit={submit}
          busy={busy}
          onCancel={() => {
            host.cancel();
            composer.current?.querySelector('textarea')?.focus();
          }}
          placeholder={selectedAccount ? 'Ask about this account…' : 'Ask about your portfolio…'}
          submitDisabled={draft.trim().length > ASSISTANT_LIMITS.prompt}
          submitDisabledReason="Keep your message under 1,000 characters for this demo."
          toolbar={
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={simulateError}
              disabled={busy}
              onClick={() => setSimulateError(!simulateError)}
            >
              <AIIcon name="warning" />
              Simulate error
            </Button>
          }
        />
        {simulateError && (
          <p className={s.note} role="status">
            The next response will fail once. Retry will complete it.
          </p>
        )}
        <p className={s.note}>
          Local sample responses. Nothing is sent or changed. Switching context clears this chat.
        </p>
      </div>
    </>
  );
}
