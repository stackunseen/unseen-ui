'use client';
import type { ComponentProps } from 'react';
import { ChevronDownIcon, CopyIcon } from '@radix-ui/react-icons';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import { useDisclosure } from '../../shared/disclosure.js';
import { useCopy } from '../../shared/copy.js';
import type { CopyWords } from '../../shared/copy.js';
import s from '../../shared/styles/devtools.module.css';
import { stateLabel } from '../../shared/labels.js';

export interface CommitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}
export interface CommitProps extends ComponentProps<'section'> {
  hash: string;
  message: string;
  author?: string;
  /** Host timestamp of the commit. */
  committedAt?: string;
  files?: readonly CommitFile[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<CommitLabels>;
  className?: string;
}
export interface CommitLabels extends CopyWords {
  copyHash: string;
  files: (count: number) => string;
  /** A file's change as shown on its row. */
  status: (status: CommitFile['status']) => string;
}
const defaultLabels: CommitLabels = {
  copyHash: 'Copy commit hash',
  files: (count) => `${count} file${count === 1 ? '' : 's'}`,
  status: stateLabel,
  copied: 'Copied',
  copyFailed: 'Copy unavailable',
};

const statusTone = {
  added: 'success',
  modified: 'warning',
  deleted: 'danger',
  renamed: undefined,
} as const;

/** A host-reported commit with its changed files. */
export function Commit({
  hash,
  message,
  author,
  committedAt,
  files = [],
  headingLevel = 3,
  open,
  defaultOpen = false,
  onOpenChange,
  labels,
  className = '',
  ...rest
}: CommitProps) {
  const text = { ...defaultLabels, ...labels };
  const Heading = `h${headingLevel}` as const;
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const { copy, message: copyMessage } = useCopy();
  const [subject, ...body] = message.split('\n');
  return (
    <section {...rest} className={`${s.root} ${className}`} data-part="commit">
      <div className={s.header}>
        <div className={s.grow}>
          <Heading className={s.title}>{subject}</Heading>
          <div className={s.meta}>
            <span className={s.mono}>{hash.slice(0, 7)}</span>
            {author && ` · ${author}`}
            {committedAt && (
              <>
                {' · '}
                <ObservationTime value={committedAt} />
              </>
            )}
          </div>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={s.iconButton}
            aria-label={text.copyHash}
            onClick={() => void copy(hash)}
          >
            <CopyIcon aria-hidden="true" />
          </button>
          {files.length > 0 && (
            <button className={s.iconButton} {...disclosure.triggerProps}>
              {text.files(files.length)}
              <ChevronDownIcon aria-hidden="true" />
            </button>
          )}
          <span role="status" className={copyMessage(hash) ? s.meta : s.srOnly}>
            {copyMessage(hash, text)}
          </span>
        </div>
      </div>
      {body.join('\n').trim() && <p className={`${s.body} ${s.meta}`}>{body.join('\n').trim()}</p>}
      {files.length > 0 && (
        <ul className={s.list} {...disclosure.contentProps}>
          {files.map((file) => (
            <li key={file.path}>
              <span className={`${s.grow} ${s.mono}`}>{file.path}</span>
              {file.additions !== undefined && (
                <span className={`${s.mono} ${s.add}`}>+{file.additions}</span>
              )}
              {file.deletions !== undefined && (
                <span className={`${s.mono} ${s.remove}`}>−{file.deletions}</span>
              )}
              <span className={s.badge} data-tone={statusTone[file.status]}>
                {text.status(file.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
