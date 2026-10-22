'use client';
import { Command } from 'cmdk';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../../components/loading-indicator/loading-indicator.js';
import s from '../styles/agent-controls.module.css';
import { Input } from '../../components/input/input.js';
import type { DocumentSnapshot, VersionedTextTarget } from '@stackunseen/ui-core/editing';
import { sameDocumentIdentity, validTextRange } from '@stackunseen/ui-core/editing';
import { stateLabel } from '../labels.js';

export interface CommandOption {
  id: string;
  label: string;
  description: string;
  keywords?: string[];
  disabledReason?: string;
}

export interface ReferenceOption extends CommandOption {
  kind: 'file' | 'folder' | 'symbol' | 'person' | 'source';
  version: string;
  /** Exact resource revision/range. Supplying either opts into precise validation. */
  target?: VersionedTextTarget;
  resource?: DocumentSnapshot & { readonly digest?: string };
  access?: 'available' | 'revoked' | 'missing' | 'unknown';
}

export function referenceUnavailableReason(item: ReferenceOption): string | undefined {
  if (item.disabledReason) return item.disabledReason;
  if (item.access && item.access !== 'available') return `Reference access is ${item.access}.`;
  if (!item.target && !item.resource) return;
  if (!item.target || !item.resource) return 'Exact reference revision is unavailable.';
  if (typeof item.resource.text !== 'string' || item.resource.text.length > 100_000)
    return 'Reference content is invalid or exceeds the bounded source window.';
  if (!sameDocumentIdentity(item.target, item.resource) || item.target.version !== item.version)
    return 'Reference revision is stale. Refresh the host search.';
  if (
    item.target.digest !== undefined &&
    (typeof item.target.digest !== 'string' ||
      !item.target.digest ||
      item.target.digest.length > 160 ||
      item.target.digest !== item.resource.digest)
  )
    return 'Reference content identity changed.';
  if (item.target.range && !validTextRange(item.target.range, item.resource.text))
    return 'Reference range is invalid for this revision.';
}

export interface PickerProps<T extends CommandOption> {
  items: readonly T[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (item: T) => void;
  status?: 'ready' | 'loading' | 'error' | 'stale' | 'unknown' | 'denied';
  error?: string;
  disabled?: boolean;
}

export function SearchPicker<T extends CommandOption>({
  items,
  query,
  onQueryChange,
  onSelect,
  status = 'ready',
  error,
  disabled,
  variant = 'list',
  reference = false,
}: PickerProps<T> & { variant?: 'list' | 'cards' | 'compact'; reference?: boolean }) {
  const label = reference ? 'Find a reference' : 'Find a command';
  const available = status === 'ready' && !disabled;
  return (
    <div
      className={s.root}
      data-variant={variant}
      data-part={reference ? 'mention-picker' : 'slash-command-menu'}
    >
      <Command label={label} className={s.root}>
        <Command.Input
          asChild
          aria-label={label}
          className={s.search}
          value={query}
          onValueChange={onQueryChange}
          placeholder={reference ? 'Search files, symbols or people…' : 'Search commands…'}
          disabled={!available}
        >
          <Input aria-expanded={available} />
        </Command.Input>
        <Command.List
          className={s.commandList}
          label={reference ? 'References' : 'Commands'}
          hidden={!available}
        >
          {available && (
            <Command.Empty>
              <div role="option" aria-disabled="true" aria-selected="false">
                No matching {reference ? 'references' : 'commands'}.
              </div>
            </Command.Empty>
          )}
          {available &&
            items.slice(0, 200).map((item, index) => {
              const reason =
                items.filter((option) => option.id === item.id).length !== 1
                  ? 'Option identity is ambiguous. Refresh the host search.'
                  : reference
                    ? referenceUnavailableReason(item as unknown as ReferenceOption)
                    : item.disabledReason;
              const target = reference ? (item as unknown as ReferenceOption).target : undefined;
              return (
                <Command.Item
                  className={s.commandItem}
                  key={`${item.id}-${index}`}
                  value={item.id}
                  keywords={[item.label, item.description, ...(item.keywords ?? [])]}
                  disabled={!!reason}
                  onSelect={() => {
                    if (available && !reason) onSelect(item);
                  }}
                >
                  <AIIcon name={reference ? 'document' : 'tool'} />
                  <span>
                    <strong>
                      {reference ? '@' : '/'}
                      {item.label}
                    </strong>
                    <small className={s.muted}>{reason ?? item.description}</small>
                    {reference && (
                      <small className={s.muted}>
                        {stateLabel((item as unknown as ReferenceOption).kind)} ·{' '}
                        {(item as unknown as ReferenceOption).version}
                        {target?.range &&
                          ` · UTF-16 ${target.range.from}–${target.range.to} (end exclusive)`}
                      </small>
                    )}
                  </span>
                </Command.Item>
              );
            })}
        </Command.List>
      </Command>
      {status === 'loading' && (
        <LoadingIndicator label={reference ? 'Loading references' : 'Loading commands'} />
      )}
      {status === 'error' && (
        <p role="alert" className={s.error}>
          {error || 'Unable to load options.'}
        </p>
      )}
      {disabled && <p className={s.muted}>Selection is unavailable.</p>}
      {(status === 'stale' || status === 'unknown' || status === 'denied') && (
        <p role="status" className={s.muted}>
          Selection is {status}. Refresh the host search before selecting.
        </p>
      )}
      {items.length > 200 && (
        <p className={s.muted}>Showing the first 200 options. Refine the host search.</p>
      )}
    </div>
  );
}
