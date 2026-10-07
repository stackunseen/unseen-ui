'use client';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Shimmer } from '../shimmer/shimmer.js';
import { useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface TaskItem {
  id: string;
  text: string;
  /** Optional file or resource name shown as a chip. */
  file?: string;
}
export interface TaskProps {
  title: string;
  items: readonly TaskItem[];
  state?: 'running' | 'complete' | 'failed';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** A compact, collapsible log of what an agent did for one task. */
export function Task({
  title,
  items,
  state = 'complete',
  open,
  defaultOpen = true,
  onOpenChange,
  className = '',
}: TaskProps) {
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  return (
    <div className={`${s.root} ${className}`} data-part="task" data-state={state}>
      <button className={s.trigger} {...disclosure.triggerProps}>
        <MagnifyingGlassIcon aria-hidden="true" />
        {state === 'running' ? <Shimmer>{title}</Shimmer> : title}
        {state === 'failed' && <span className={s.meta}>· failed</span>}
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <ul className={`${s.list} ${s.content}`} {...disclosure.contentProps}>
        {items.length === 0 && <li>No activity reported.</li>}
        {items.map((item) => (
          <li key={item.id}>
            {item.text}
            {item.file && (
              <>
                {' '}
                <span className={s.chip}>{item.file}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
