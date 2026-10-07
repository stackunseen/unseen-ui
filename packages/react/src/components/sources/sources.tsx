'use client';
import { ChevronDownIcon, GlobeIcon } from '@radix-ui/react-icons';
import { safeHttpUrl, useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface SourceLink {
  id: string;
  title: string;
  href?: string;
  description?: string;
}
export interface SourcesProps {
  sources: readonly SourceLink[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** "Used N sources" disclosure. Listing a source does not claim it supports the answer. */
export function Sources({
  sources,
  open,
  defaultOpen = false,
  onOpenChange,
  className = '',
}: SourcesProps) {
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const count = sources.length;
  return (
    <div className={`${s.root} ${className}`} data-part="sources">
      <button className={s.trigger} {...disclosure.triggerProps} disabled={count === 0}>
        <GlobeIcon aria-hidden="true" />
        {count === 0 ? 'No sources reported' : `Used ${count} source${count === 1 ? '' : 's'}`}
        {count > 0 && <ChevronDownIcon aria-hidden="true" className={s.chevron} />}
      </button>
      <ul className={`${s.list} ${s.content}`} {...disclosure.contentProps}>
        {sources.map((source) => {
          const href = safeHttpUrl(source.href);
          return (
            <li key={source.id}>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer noopener" className={s.label}>
                  {source.title}
                </a>
              ) : (
                <span className={s.label}>{source.title}</span>
              )}
              {source.description && <div className={s.meta}>{source.description}</div>}
              {!href && source.href && <div className={s.meta}>Link unavailable</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
