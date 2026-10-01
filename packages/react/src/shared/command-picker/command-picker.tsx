'use client';
import { Command } from 'cmdk';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../../components/loading-indicator/loading-indicator.js';
import s from '../styles/agent-controls.module.css';

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
}

export interface PickerProps<T extends CommandOption> {
  items: readonly T[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (item: T) => void;
  status?: 'ready' | 'loading' | 'error';
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
          <input aria-expanded={available} />
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
            items.slice(0, 200).map((item) => (
              <Command.Item
                className={s.commandItem}
                key={item.id}
                value={item.id}
                keywords={[item.label, item.description, ...(item.keywords ?? [])]}
                disabled={!!item.disabledReason}
                onSelect={() => {
                  if (!item.disabledReason) onSelect(item);
                }}
              >
                <AIIcon name={reference ? 'document' : 'tool'} />
                <span>
                  <strong>
                    {reference ? '@' : '/'}
                    {item.label}
                  </strong>
                  <small className={s.muted}>{item.disabledReason ?? item.description}</small>
                  {reference && (
                    <small className={s.muted}>
                      {(item as unknown as ReferenceOption).kind} ·{' '}
                      {(item as unknown as ReferenceOption).version}
                    </small>
                  )}
                </span>
              </Command.Item>
            ))}
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
      {items.length > 200 && (
        <p className={s.muted}>Showing the first 200 options. Refine the host search.</p>
      )}
    </div>
  );
}
