'use client';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AIIcon, Button, IconButton, PromptInput, Select, Tabs } from '@ai-interaction/react';
import { Sidecar, SplitPane, WorkspaceShell, PanelHeader } from '@ai-interaction/react/layout';
import type {
  SidecarPresentation,
  SplitPaneSizes,
  WorkspaceShellProps,
} from '@ai-interaction/react/layout';
import { ConversationViewport } from '@ai-interaction/react/viewport';
import type { ConversationHistory } from '@ai-interaction/core/history';
import type { MessageData } from '@ai-interaction/core';
import s from './workspace-example.module.css';

const narrowQuery = '(max-width: 767px)';
const subscribe = (notify: () => void) => {
  const media = matchMedia(narrowQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const narrowSnapshot = () => matchMedia(narrowQuery).matches;
const serverSnapshot = () => false;
export function WorkspaceExample() {
  const narrow = useSyncExternalStore(subscribe, narrowSnapshot, serverSnapshot);
  const [variant, setVariant] = useState<NonNullable<WorkspaceShellProps['variant']>>('contained');
  const [presentation, setPresentation] = useState<SidecarPresentation>('docked');
  const [open, setOpen] = useState(false),
    [sizes, setSizes] = useState<SplitPaneSizes>([70, 30]);
  const [selected, setSelected] = useState('Review'),
    [tab, setTab] = useState('context');
  const [draft, setDraft] = useState(''),
    [rows, setRows] = useState<MessageData[]>([]);
  const [note, setNote] = useState('');
  const [revision, setRevision] = useState(0);
  const noteId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const inspectorElement = useRef<HTMLElement>(null);
  const inspectorOwnedFocus = useRef(false);
  useEffect(() => {
    if (!open) {
      inspectorOwnedFocus.current = false;
      return;
    }
    if (!inspectorOwnedFocus.current) return;
    // This composition moves the controlled panel between inline and portal
    // parents. Preserve reading focus after their unmount/close fallbacks.
    const frame = requestAnimationFrame(() => inspectorElement.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [narrow, presentation, open]);
  const history = useMemo<ConversationHistory>(
    () =>
      Object.freeze({
        context: Object.freeze({
          workspaceId: 'application-example',
          threadId: selected,
          snapshotId: 'local',
          version: String(revision),
        }),
        messages: Object.freeze([
          Object.freeze({
            id: `${selected}-welcome`,
            role: 'assistant' as const,
            state: 'complete' as const,
            revision: 0,
            text: `${selected} workspace. Open the inspector to review context while keeping the conversation in view.`,
          }),
          ...rows,
        ]),
        older: Object.freeze({ state: 'end' as const }),
        newer: Object.freeze({ state: 'end' as const }),
        startIndex: 0,
        totalMessages: rows.length + 1,
      }),
    [selected, rows, revision],
  );
  const resize = useCallback((next: SplitPaneSizes) => {
    if (next[1] === 0) setOpen(false);
    else {
      setSizes(next);
      setOpen(true);
    }
  }, []);
  const inspector = (
    <Sidecar
      ref={inspectorElement}
      open={open}
      onOpenChange={setOpen}
      title="Workspace inspector"
      description="Supporting detail beside the active workspace."
      headingLevel={4}
      presentation={narrow ? 'drawer' : presentation}
      mobileBreakpoint={false}
      returnFocusRef={opener}
      closeLabel="Close workspace inspector"
      onFocusCapture={() => {
        inspectorOwnedFocus.current = true;
      }}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          inspectorOwnedFocus.current = false;
      }}
      toolbar={
        <Tabs
          label="Inspector views"
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'context', label: 'Context', content: null },
            { value: 'details', label: 'Details', content: null },
          ]}
        />
      }
    >
      {tab === 'context' ? (
        <div className={s.detail}>
          <h5>Available context</h5>
          <p>This local example shows public project notes and the selected workspace.</p>
          <ul>
            <li>Workspace: {selected}</li>
            <li>Project notes: local fixture</li>
            <li>External tools: none connected</li>
          </ul>
          <p>Open panels do not change access or permission.</p>
        </div>
      ) : (
        <div className={s.detail}>
          <h5>Project details</h5>
          <label htmlFor={noteId}>Local note</label>
          <input
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note…"
          />
          <p>
            Draft state belongs to this example and survives panel closing. No persistence or
            provider call.
          </p>
        </div>
      )}
    </Sidecar>
  );
  const conversation = (
    <div className={s.conversation}>
      <PanelHeader
        title={`${selected} conversation`}
        headingLevel={4}
        description="Keep the main task readable; reveal supporting detail when needed."
      />
      <ConversationViewport
        value={history}
        label="Workspace conversation"
        variant={variant === 'compact' ? 'compact' : 'thread'}
        mode="reading"
        style={{ flex: 1, minHeight: 160, height: 'auto', border: 0, borderRadius: 0 }}
      />
      <div className={s.composer}>
        <PromptInput
          variant="inline"
          value={draft}
          onValueChange={setDraft}
          onSubmit={(text) => {
            if (rows.length >= 199) return;
            setRows((current) => [
              ...current,
              Object.freeze({
                id: `${selected}-${current.length}`,
                role: 'user',
                text,
                state: 'complete',
                revision: 0,
              }),
            ]);
            setRevision((value) => value + 1);
            setDraft('');
          }}
          disabled={rows.length >= 199}
          disabledReason={
            rows.length >= 199
              ? 'This local reading window is full. Choose another workspace to continue.'
              : undefined
          }
          placeholder="Add a local message…"
        />
      </div>
    </div>
  );
  return (
    <section
      className={s.example}
      aria-label="Application foundations example"
      data-workspace-example
    >
      <div className={s.settings}>
        <label>
          Shell
          <Select
            aria-label="Workspace layout"
            value={variant}
            onValueChange={(value) =>
              setVariant(value as NonNullable<WorkspaceShellProps['variant']>)
            }
            options={[
              { value: 'workspace', label: 'Workspace' },
              { value: 'contained', label: 'Contained' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </label>
        <label>
          Inspector
          <Select
            aria-label="Inspector presentation"
            value={presentation}
            onValueChange={(value) => setPresentation(value as SidecarPresentation)}
            options={[
              { value: 'docked', label: 'Docked' },
              { value: 'drawer', label: 'Drawer' },
              { value: 'overlay', label: 'Floating' },
            ]}
          />
        </label>
      </div>
      <WorkspaceShell
        label="Project workspace"
        mainAs="section"
        mainLabel="Active workspace"
        variant={variant}
        className={s.shell}
        style={{ blockSize: '38rem' }}
        scrollMode="panes"
        navigationLabel="Project navigation"
        header={
          <PanelHeader
            title="Project workspace"
            headingLevel={3}
            leading={<AIIcon name="assistant" />}
            status={<span className={s.local}>Local example</span>}
            actions={
              <IconButton
                ref={opener}
                icon="info"
                label={open ? 'Hide workspace inspector' : 'Open workspace inspector'}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
              />
            }
          />
        }
        navigation={
          <div className={s.navigation}>
            {['Review', 'Research'].map((name) => (
              <Button
                key={name}
                size="sm"
                variant="ghost"
                aria-current={selected === name ? 'page' : undefined}
                disabled={!!draft.trim()}
                title={
                  draft.trim() ? 'Add the local message before switching workspace.' : undefined
                }
                onClick={() => {
                  setSelected(name);
                  setRows([]);
                  setRevision((value) => value + 1);
                }}
              >
                {name}
              </Button>
            ))}
          </div>
        }
        main={
          narrow || presentation !== 'docked' ? (
            conversation
          ) : (
            <SplitPane
              label="Conversation and inspector"
              primary={{
                id: 'conversation',
                label: 'Conversation pane',
                children: conversation,
                minSize: 50,
              }}
              secondary={{
                id: 'inspector',
                label: 'Inspector pane',
                children: inspector,
                minSize: 20,
                collapsible: true,
              }}
              sizes={open ? sizes : [100, 0]}
              onSizesChange={resize}
              presentation="split"
              resizeLabel="Resize workspace inspector"
            />
          )
        }
        footer={<span className={s.local}>Local UI state · no external actions</span>}
      />
      {(narrow || presentation !== 'docked') && inspector}
    </section>
  );
}
