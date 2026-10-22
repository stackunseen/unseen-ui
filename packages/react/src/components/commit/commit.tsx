'use client';
import { ChevronDownIcon, CopyIcon } from '@radix-ui/react-icons';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import { useDisclosure } from '../../shared/disclosure.js';
import { useCopy } from '../../shared/copy.js';
import s from '../../shared/styles/devtools.module.css';
import { stateLabel } from '../../shared/labels.js';

export interface CommitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}
export interface CommitProps {
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
  className?: string;
}

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
  className = '',
}: CommitProps) {
  const Heading = `h${headingLevel}` as const;
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const { copy, message: copyMessage } = useCopy();
  const [subject, ...body] = message.split('\n');
  return (
    <section className={`${s.root} ${className}`} data-part="commit">
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
            aria-label="Copy commit hash"
            onClick={() => void copy(hash)}
          >
            <CopyIcon aria-hidden="true" />
          </button>
          {files.length > 0 && (
            <button className={s.iconButton} {...disclosure.triggerProps}>
              {files.length} file{files.length === 1 ? '' : 's'}
              <ChevronDownIcon aria-hidden="true" />
            </button>
          )}
          <span role="status" className={copyMessage(hash) ? s.meta : s.srOnly}>
            {copyMessage(hash)}
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
                {stateLabel(file.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
