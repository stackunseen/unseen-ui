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
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<SourcesLabels>;
  className?: string;
}
export interface SourcesLabels {
  none: string;
  count: (count: number) => string;
  /** Shown under a source whose link is not a safe http(s) URL. */
  linkUnavailable: string;
}
const defaultLabels: SourcesLabels = {
  none: 'No sources reported',
  count: (count) => `Used ${count} source${count === 1 ? '' : 's'}`,
  linkUnavailable: 'Link unavailable',
};

/** "Used N sources" disclosure. Listing a source does not claim it supports the answer. */
export function Sources({
  sources,
  open,
  defaultOpen = false,
  onOpenChange,
  labels,
  className = '',
}: SourcesProps) {
  const text = { ...defaultLabels, ...labels };
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const count = sources.length;
  return (
    <div className={`${s.root} ${className}`} data-part="sources">
      <button className={s.trigger} {...disclosure.triggerProps} disabled={count === 0}>
        <GlobeIcon aria-hidden="true" />
        {count === 0 ? text.none : text.count(count)}
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
              {!href && source.href && <div className={s.meta}>{text.linkUnavailable}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
