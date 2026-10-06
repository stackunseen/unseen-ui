'use client';
import { useState } from 'react';
import {
  BranchSwitcher,
  Button,
  IconButton,
  MessageQueue,
  PromptInput,
  ThreadList,
} from '@stackunseen/ui';
import type { QueuedMessage, ThreadSummary } from '@stackunseen/ui';

/** Local host acknowledgements demonstrate composition, not durable conversation storage. */
export function ActionPlacementDemo() {
  const [threads, setThreads] = useState<ThreadSummary[]>([
    { id: 'search', title: 'Review the search change', detail: 'Current workspace', version: '1' },
    { id: 'keyboard', title: 'Keyboard accessibility', detail: 'Draft session', version: '1' },
  ]);
  const [selected, setSelected] = useState('search');
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('main');
  const [draft, setDraft] = useState('Add keyboard tests for the search field.');
  const [queue, setQueue] = useState<QueuedMessage[]>([
    { id: 'draft-1', version: '1', text: 'Review the search change.', state: 'queued' },
    { id: 'draft-2', version: '1', text: 'Check empty and long queries.', state: 'queued' },
  ]);
  const [reference, setReference] = useState(true);
  const [feedback, setFeedback] = useState('');
  return (
    <div className="placement-demo" role="group" aria-label="Action placement workspace">
      <aside aria-label="Example conversation sidebar">
        <ThreadList
          variant="compact"
          threads={threads.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))}
          selectedId={selected}
          query={query}
          onQueryChange={setQuery}
          onSelect={(item) => {
            setSelected(item.id);
            setFeedback(`Selected ${item.title}. This example uses a shared local queue.`);
          }}
          onRename={(item, title) =>
            setThreads((current) =>
              current.map((value) =>
                value.id === item.id
                  ? { ...value, title, version: String(Number(value.version) + 1) }
                  : value,
              ),
            )
          }
          onArchive={(item) => {
            setThreads((current) => current.filter((value) => value.id !== item.id));
            if (selected === item.id) setSelected('');
          }}
        />
      </aside>
      <div className="placement-demo-session">
        <BranchSwitcher
          value={branch}
          onValueChange={(item) => setBranch(item.id)}
          branches={[
            { id: 'main', label: 'Main', version: '1' },
            { id: 'review', label: 'Review', version: '2', parentId: 'main' },
          ]}
        />
        <MessageQueue
          variant="compact"
          items={queue}
          onEdit={(item, text) =>
            setQueue((current) =>
              current.map((value) =>
                value.id === item.id
                  ? { ...value, text, version: String(Number(value.version) + 1) }
                  : value,
              ),
            )
          }
          onCancel={(item) =>
            setQueue((current) => current.filter((value) => value.id !== item.id))
          }
          onMove={(item, direction) =>
            setQueue((current) => {
              const next = [...current],
                index = next.findIndex((value) => value.id === item.id);
              const target = index + (direction === 'up' ? -1 : 1);
              const moving = next[index],
                adjacent = next[target];
              if (moving && adjacent) [next[index], next[target]] = [adjacent, moving];
              return next;
            })
          }
        />
        <PromptInput
          variant="compact"
          value={draft}
          onValueChange={setDraft}
          submitDisabled={queue.length >= 50}
          submitDisabledReason="The local queue is full. Remove a draft before adding another."
          onSubmit={(text) => {
            setQueue((current) => [
              ...current,
              { id: crypto.randomUUID(), version: '1', text, state: 'queued' },
            ]);
            setDraft('');
            setFeedback('Draft queued locally. No model or remote action was invoked.');
          }}
          toolbar={
            <Button
              size="sm"
              variant="ghost"
              disabled={reference}
              onClick={() => setReference(true)}
            >
              Add reference
            </Button>
          }
          attachments={
            reference ? (
              <span className="coding-reference-chip">
                <span>@src/search.ts</span>
                <IconButton
                  icon="close"
                  label="Remove example reference"
                  onClick={() => setReference(false)}
                />
              </span>
            ) : undefined
          }
        />
        <p className="fixture-label">Local simulation · shared queue · no model or persistence</p>
        {feedback && (
          <p className="specimen-feedback" role="status">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
