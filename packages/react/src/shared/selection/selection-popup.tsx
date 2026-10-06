import type { RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { SelectionOptions } from './selection-options.js';
import type { SelectionOption } from './types.js';
import s from './selection.module.css';

export function SelectionMessage({
  id,
  message,
  error,
}: {
  id: string;
  message: string;
  error?: boolean;
}) {
  return (
    <p
      id={id}
      role={error ? 'alert' : 'status'}
      className={s.message}
      data-error={error || undefined}
    >
      {message}
    </p>
  );
}

export function SelectionPopup({
  inputRef,
  listRef,
  listId,
  label,
  dir,
  multiple,
  loading,
  visible,
  selection,
  active,
  truncated,
  message,
  error,
  statusId,
  onActiveChange,
  onSelect,
  onClose,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  label: string;
  dir?: string;
  multiple?: boolean;
  loading: boolean;
  visible: readonly SelectionOption[];
  selection: readonly string[];
  active?: string;
  truncated: boolean;
  message?: string;
  error?: boolean;
  statusId: string;
  onActiveChange: (value: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Popover.Portal>
      <ThemeSurface>
        <Popover.Content
          role="presentation"
          aria-labelledby={undefined}
          aria-describedby={undefined}
          dir={dir}
          className={s.popup}
          sideOffset={6}
          collisionPadding={12}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target === inputRef.current) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onClose();
            inputRef.current?.focus();
          }}
        >
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={`${label} options`}
            aria-multiselectable={multiple || undefined}
            aria-busy={loading}
          >
            <SelectionOptions
              options={visible}
              selection={selection}
              active={active}
              listId={listId}
              onActiveChange={onActiveChange}
              onSelect={onSelect}
            />
          </div>
          {message && <SelectionMessage id={statusId} message={message} error={error} />}
          {truncated && (
            <p className={s.message}>Showing the first 200 matches. Refine your search.</p>
          )}
        </Popover.Content>
      </ThemeSurface>
    </Popover.Portal>
  );
}
