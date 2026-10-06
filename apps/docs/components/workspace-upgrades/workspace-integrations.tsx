'use client';
import { useId, useRef, useState } from 'react';
import { EditorDemo } from './editor-demo';
import { ReviewDemo } from './review-demo';
import { ArtifactDemo } from './artifact-demo';
import { ConversationDemo } from './conversation-demo';
import s from './workspace-integrations.module.css';

const tasks = [
  {
    id: 'editor',
    label: 'Editor',
    title: 'Edit code',
    content: <EditorDemo sample />,
  },
  {
    id: 'review',
    label: 'File review',
    title: 'Review file changes',
    content: <ReviewDemo compact />,
  },
  {
    id: 'artifact',
    label: 'Artifact',
    title: 'Edit an artifact',
    content: <ArtifactDemo inline sample />,
  },
  {
    id: 'conversation',
    label: 'Conversation',
    title: 'Continue a conversation',
    content: <ConversationDemo sample />,
  },
] as const;

export function WorkspaceIntegrations() {
  const id = useId();
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState([0]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function select(index: number) {
    setActive(index);
    setVisited((items) => (items.includes(index) ? items : [...items, index]));
  }
  return (
    <section className={s.workspace} aria-label="Workspace examples">
      <div className={s.tabs} role="tablist" aria-label="Workspace tasks">
        {tasks.map((task, index) => (
          <button
            key={task.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            id={`${id}-${task.id}-tab`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`${id}-${task.id}-panel`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tasks.length
                  : event.key === 'ArrowLeft'
                    ? (index + tasks.length - 1) % tasks.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tasks.length - 1
                        : undefined;
              if (next === undefined) return;
              event.preventDefault();
              select(next);
              buttons.current[next]?.focus();
            }}
          >
            {task.label}
          </button>
        ))}
      </div>
      {tasks.map((task, index) => (
        <div
          key={task.id}
          id={`${id}-${task.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${task.id}-tab`}
          hidden={active !== index}
          tabIndex={0}
          className={s.panel}
          data-task={task.id}
        >
          {visited.includes(index) && (
            <>
              <header className={s.heading}>
                <h2>{task.title}</h2>
              </header>
              <div className={s.body}>{task.content}</div>
            </>
          )}
        </div>
      ))}
      <p className={s.footer}>
        Local examples · drafts stay here while you switch tasks. Reload clears them.
      </p>
    </section>
  );
}
