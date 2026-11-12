'use client';
import { useEffect, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import type { Step } from '@stackunseen/ui-core';
import { AgentSteps } from '../agent-steps/agent-steps.js';
import { ElapsedTime } from '../elapsed-time/elapsed-time.js';
import { Shimmer } from '../shimmer/shimmer.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface WorkSummaryProps extends ComponentProps<'div'> {
  /** The public steps of one turn or run. */
  steps: Step[];
  /** "running" while the agent works; the others once it has ended. */
  state: 'running' | 'done' | 'stopped' | 'failed';
  startedAt: Date | string | number;
  /** When it ended. Leave it out while running. */
  endedAt?: Date | string | number;
  /** Host-measured duration, preferred over the browser clock. */
  durationMs?: number;
  /** Anything else about the turn, such as a terminal log, shown under the steps. */
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const lead: Record<WorkSummaryProps['state'], string> = {
  running: 'Working ·',
  done: 'Worked for',
  stopped: 'Stopped after',
  failed: 'Failed after',
};

/**
 * The activity of one agent turn, collapsed to "Worked for 15s" once it ends and open while it
 * runs, as coding agents show it. Steps inside are the compact AgentSteps.
 */
export function WorkSummary({
  steps,
  state,
  startedAt,
  endedAt,
  durationMs,
  children,
  open,
  defaultOpen,
  onOpenChange,
  className = '',
  ...rest
}: WorkSummaryProps) {
  const running = state === 'running';
  const disclosure = useDisclosure({ open, defaultOpen: defaultOpen ?? running, onOpenChange });
  const previous = useRef(state);
  const { setOpen } = disclosure;
  useEffect(() => {
    // Follow the run only when the host does not control disclosure.
    if (open === undefined && previous.current !== state) setOpen(state === 'running');
    previous.current = state;
  }, [open, setOpen, state]);
  // Once ended, the time must stop even if the host only sends a state change: remember when.
  const stoppedAt = useRef<number | undefined>(undefined);
  if (running) stoppedAt.current = undefined;
  else stoppedAt.current ??= Date.now();
  const end = running
    ? undefined
    : (endedAt ?? (durationMs === undefined ? stoppedAt.current : undefined));
  const time = (
    <ElapsedTime
      startedAt={startedAt}
      endedAt={end}
      durationMs={running ? undefined : durationMs}
    />
  );
  return (
    <div {...rest} className={`${s.root} ${className}`} data-part="work-summary" data-state={state}>
      <button className={s.trigger} {...disclosure.triggerProps}>
        <AIIcon name={state === 'failed' ? 'warning' : 'tool'} size={15} />
        {running ? (
          <Shimmer>
            {lead.running} {time}
          </Shimmer>
        ) : (
          <span>
            {lead[state]} {time}
          </span>
        )}
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <div className={s.content} {...disclosure.contentProps}>
        <AgentSteps steps={steps} variant="compact" label="Steps" />
        {children}
      </div>
    </div>
  );
}
