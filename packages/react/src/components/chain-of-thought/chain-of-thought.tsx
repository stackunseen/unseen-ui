'use client';
import { CheckIcon, ChevronDownIcon, ListBulletIcon } from '@radix-ui/react-icons';
import { Shimmer } from '../shimmer/shimmer.js';
import { safeHttpUrl, useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface ChainOfThoughtSource {
  id: string;
  title: string;
  href?: string;
}
export interface ChainOfThoughtStep {
  id: string;
  label: string;
  description?: string;
  state: 'complete' | 'active' | 'pending';
  sources?: readonly ChainOfThoughtSource[];
}
export interface ChainOfThoughtProps {
  steps: readonly ChainOfThoughtStep[];
  title?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Public, host-reported steps of an agent run with optional sources per step. */
export function ChainOfThought({
  steps,
  title = 'Chain of thought',
  open,
  defaultOpen = true,
  onOpenChange,
  className = '',
}: ChainOfThoughtProps) {
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const active = steps.some((step) => step.state === 'active');
  return (
    <div className={`${s.root} ${className}`} data-part="chain-of-thought">
      <button className={s.trigger} {...disclosure.triggerProps}>
        <ListBulletIcon aria-hidden="true" />
        {active ? <Shimmer>{title}</Shimmer> : title}
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <div {...disclosure.contentProps}>
        <ol className={`${s.list} ${s.stepList}`}>
          {steps.length === 0 && <li className={s.meta}>No steps reported yet.</li>}
          {steps.map((step) => (
            <li
              key={step.id}
              className={s.step}
              data-state={step.state}
              aria-current={step.state === 'active' ? 'step' : undefined}
            >
              <span className={s.dot} aria-hidden="true">
                {step.state === 'complete' && <CheckIcon />}
              </span>
              <span className={s.label}>
                {step.state === 'active' ? <Shimmer>{step.label}</Shimmer> : step.label}
                <span className={s.srOnly}> ({step.state})</span>
              </span>
              {step.description && <span className={s.meta}>{step.description}</span>}
              {!!step.sources?.length && (
                <span className={s.chips}>
                  {step.sources.map((source) => {
                    const href = safeHttpUrl(source.href);
                    return href ? (
                      <a
                        key={source.id}
                        className={s.chip}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <span key={source.id} className={s.chip}>
                        {source.title}
                      </span>
                    );
                  })}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
