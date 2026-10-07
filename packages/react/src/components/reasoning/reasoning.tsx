'use client';
import { useEffect, useRef } from 'react';
import { ChevronDownIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import { Shimmer } from '../shimmer/shimmer.js';
import { useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface ReasoningProps {
  /** Public reasoning summary supplied by the host. Never private chain-of-thought. */
  summary: string;
  /** "streaming" while the summary arrives; "complete" once the host finishes it. */
  state: 'streaming' | 'complete';
  /** Host-measured duration. Omit when unknown; no duration is invented. */
  durationMs?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function reasoningLabel(state: ReasoningProps['state'], durationMs?: number) {
  if (state === 'streaming') return 'Thinking…';
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0)
    return 'Reasoning summary';
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `Thought for ${seconds} second${seconds === 1 ? '' : 's'}`;
}

/** Collapsible public reasoning summary. Opens while streaming and closes once complete. */
export function Reasoning({
  summary,
  state,
  durationMs,
  open,
  defaultOpen,
  onOpenChange,
  className = '',
}: ReasoningProps) {
  const disclosure = useDisclosure({
    open,
    defaultOpen: defaultOpen ?? state === 'streaming',
    onOpenChange,
  });
  const previous = useRef(state);
  const { setOpen } = disclosure;
  useEffect(() => {
    // Follow the stream only when the host does not control disclosure.
    if (open === undefined && previous.current !== state) setOpen(state === 'streaming');
    previous.current = state;
  }, [open, setOpen, state]);
  const label = reasoningLabel(state, durationMs);
  const paragraphs = summary.split(/\n{2,}/).filter((part) => part.trim());
  return (
    <div className={`${s.root} ${className}`} data-part="reasoning" data-state={state}>
      <button className={s.trigger} {...disclosure.triggerProps}>
        <LightningBoltIcon aria-hidden="true" />
        {state === 'streaming' ? <Shimmer>{label}</Shimmer> : label}
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <div className={s.content} {...disclosure.contentProps} aria-live="polite">
        {paragraphs.length ? (
          paragraphs.map((part, index) => <p key={index}>{part}</p>)
        ) : (
          <p>No reasoning summary was provided.</p>
        )}
      </div>
    </div>
  );
}
