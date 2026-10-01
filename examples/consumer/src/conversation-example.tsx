'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ThreadList,
  BranchSwitcher,
  MessageQueue,
  PromptInput,
  Button,
  Select,
  Accordion,
} from '@ai-interaction/react';
import type { ConversationDraft } from '@ai-interaction/core';
import { ConversationHost } from './conversation-host/host';
import { indexedDBConversationStore } from './conversation-host/store';
import s from './conversation-example.module.css';
const noSubscribe = () => () => {},
  noSnapshot = () => undefined;
const styles = [
  { threads: 'list', branches: 'segmented', queue: 'list', composer: 'standard' },
  { threads: 'cards', branches: 'cards', queue: 'cards', composer: 'compact' },
  { threads: 'compact', branches: 'select', queue: 'compact', composer: 'inline' },
] as const;
type LocalDraft = ConversationDraft & { key: string; baseText: string };
export function ConversationExample() {
  const [host, setHost] = useState<ConversationHost>(),
    [style, setStyle] = useState('0'),
    [allowed, setAllowed] = useState(true);
  const [local, setLocal] = useState<LocalDraft>();
  const [draftRevision, setDraftRevision] = useState(0);
  const pendingDraft = useRef(false);
  const snapshot = useSyncExternalStore(
    host?.subscribe ?? noSubscribe,
    host?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  useEffect(() => {
    const owner = new ConversationHost(indexedDBConversationStore());
    setHost(owner);
    return () => owner.dispose();
  }, []);
  const key =
    snapshot &&
    JSON.stringify([
      snapshot.context.workspaceId,
      snapshot.selection.threadId,
      snapshot.selection.branchId,
    ]);
  const saved = snapshot?.status === 'ready' ? snapshot.draft : undefined;
  const current = local?.key === key ? local : undefined;
  useEffect(() => {
    if (!key || !saved) return;
    setLocal((previous) =>
      previous?.key === key && previous.text !== previous.baseText
        ? previous
        : { ...saved, key, baseText: saved.text },
    );
  }, [key, saved]);
  const draft: ConversationDraft = current ?? saved ?? { text: '', version: 'unavailable' },
    dirty = !!saved && draft.text !== saved.text,
    conflict = !!saved && draft.version !== saved.version;
  const layout = styles[Number(style)] ?? styles[0];
  const ready =
    snapshot?.status === 'ready' &&
    !!saved &&
    !['submitting', 'outcome-unknown', 'acknowledged'].includes(
      snapshot.operation?.state ?? 'idle',
    );
  function syncDraft() {
    const now = host?.getSnapshot();
    if (now?.draft)
      setLocal({
        ...now.draft,
        key: JSON.stringify([
          now.context.workspaceId,
          now.selection.threadId,
          now.selection.branchId,
        ]),
        baseText: now.draft.text,
      });
    pendingDraft.current = false;
  }
  async function changeDraft(action: Promise<boolean>) {
    pendingDraft.current = true;
    if (await action) syncDraft();
    else if (host?.getSnapshot().operation?.state !== 'outcome-unknown')
      pendingDraft.current = false;
  }
  const shared = {
    context: snapshot?.context,
    status: snapshot?.status ?? ('unknown' as const),
    connection: 'connected' as const,
    operation: snapshot?.operation,
    onReconcile: () => {
      if (snapshot?.operation)
        void host?.reconcile(snapshot.operation).then((success) => {
          if (success && pendingDraft.current) syncDraft();
        });
    },
  };
  return (
    <section className={s.example} aria-label="Saved conversation workspace">
      <div className={s.heading}>
        <h2>Saved conversation workspace</h2>
        <p>
          Thread actions stay beside the conversation. Drafts are saved per branch; the queue
          remains a local queue.
        </p>
      </div>
      <div className={s.controls}>
        <label>
          <span>Presentation</span>
          <Select
            aria-label="Conversation presentation"
            value={style}
            onValueChange={setStyle}
            options={[
              { value: '0', label: 'List and segments' },
              { value: '1', label: 'Cards' },
              { value: '2', label: 'Compact and select' },
            ]}
          />
        </label>
        <div className={s.actions} role="group" aria-label="Saved workspace controls">
          <Button
            size="sm"
            variant="outline"
            disabled={snapshot?.status === 'loading'}
            onClick={() => {
              const next = !allowed;
              setAllowed(next);
              host?.setAccess(next);
            }}
          >
            {' '}
            {allowed ? 'Revoke local access' : 'Restore local access'}
          </Button>
          {snapshot?.status === 'ready' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!ready}
              onClick={() => void host?.refresh()}
            >
              Refresh workspace
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!allowed || snapshot?.status === 'loading'}
              onClick={() => void host?.connect()}
            >
              Open saved workspace
            </Button>
          )}
        </div>
      </div>
      {snapshot?.error && <p role="alert">{snapshot.error}</p>}
      <div className={s.workspace}>
        <aside className={s.sidebar} aria-label="Saved conversation sidebar">
          <ThreadList
            {...shared}
            variant={layout.threads}
            threads={snapshot?.threads ?? []}
            selectedId={snapshot?.selection.threadId}
            query={snapshot?.query ?? ''}
            pagination={snapshot?.threadPage}
            scrollRestoration={snapshot?.scroll}
            onRequestSearch={(request) => {
              void host?.search(request);
            }}
            onRequestPage={(request) => {
              void host?.page('threads', request);
            }}
            onScrollSnapshotChange={(value) => {
              void host?.scroll(value);
            }}
            onRequestSelect={
              conflict
                ? undefined
                : (request) => {
                    if (host && !conflict) void changeDraft(host.selectThread(request, draft));
                  }
            }
            onRequestRename={(request) => {
              void host?.rename(request);
            }}
            onRequestArchive={(request) => {
              void host?.archive(request);
            }}
          />
        </aside>
        <div className={s.session}>
          <BranchSwitcher
            {...shared}
            variant={layout.branches}
            branches={snapshot?.branches ?? []}
            value={snapshot?.selection.branchId}
            disabled={conflict}
            changeGuard={
              dirty
                ? {
                    version: draft.version + ':' + draftRevision,
                    message:
                      'This draft will be saved to the current branch before switching. If its version changed, the host will reject the switch.',
                  }
                : undefined
            }
            onRequestSelect={(request) => {
              if (host) void changeDraft(host.selectBranch(request, draft));
            }}
          />
          <MessageQueue
            {...shared}
            variant={layout.queue}
            items={snapshot?.items ?? []}
            pagination={snapshot?.queuePage}
            onRequestPage={(request) => {
              void host?.page('queue', request);
            }}
            onRequestEdit={(request) => {
              void host?.edit(request);
            }}
            onRequestCancel={(request) => {
              void host?.remove(request);
            }}
            onRequestMove={(request) => {
              void host?.move(request);
            }}
          />
          {conflict && (
            <div className={s.conflict}>
              <p role="status">
                The saved draft changed. Your unsaved text is retained; review it before replacing
                the stored version.
              </p>
              <div className={s.actions}>
                <Button size="sm" variant="ghost" onClick={syncDraft}>
                  Use saved draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (saved && key)
                      setLocal({ ...saved, key, text: draft.text, baseText: saved.text });
                  }}
                >
                  Keep my text for review
                </Button>
              </div>
            </div>
          )}
          <PromptInput
            variant={layout.composer}
            value={snapshot?.status === 'ready' ? draft.text : ''}
            disabled={!ready}
            submitDisabled={conflict}
            submitDisabledReason="Review the changed draft first."
            onValueChange={(text) => {
              setDraftRevision((previous) => previous + 1);
              if (key)
                setLocal({ ...draft, key, text, baseText: current?.baseText ?? saved?.text ?? '' });
            }}
            onSubmit={() => {
              if (host && snapshot) void changeDraft(host.enqueue(snapshot.context, draft));
            }}
            toolbar={
              <Button
                size="sm"
                variant="ghost"
                disabled={!ready || !dirty || conflict}
                onClick={() => {
                  if (host && snapshot) void changeDraft(host.saveDraft(snapshot.context, draft));
                }}
              >
                Save draft
              </Button>
            }
            placeholder="Write a draft for this branch…"
          />
          <p className={s.muted}>
            Browser IndexedDB example · saved on explicit actions · no model or send transport. The
            access toggle is a local demonstration.
          </p>
        </div>
      </div>
      <Accordion
        type="single"
        collapsible
        region={false}
        variant="divided"
        items={[
          {
            value: 'recovery',
            title: 'Recovery demonstration',
            content: (
              <div className={s.heading}>
                <p className={s.muted}>
                  Commit the next action locally, then leave its acknowledgement unknown. Use the
                  original receipt to check what happened.
                </p>
                <div className={s.actions}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!ready}
                    onClick={() => host?.loseNextAcknowledgement()}
                  >
                    Lose next acknowledgement
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
