'use client';
import { useEffect } from 'react';
import { Kbd } from '../kbd/kbd.js';
import { Modal } from '../modal/modal.js';
import css from './shortcut-help.module.css';

export interface ShortcutItem {
  id: string;
  /** What the shortcut does, in the same words as the control. */
  label: string;
  /** Keys in order. Each is its own cap; do not include the "+" between them. */
  keys: readonly string[];
  /** Section heading. Items with the same group stay together, in the order given. */
  group?: string;
}
export interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The shortcuts this app actually handles. The sheet does not listen for them. */
  shortcuts: readonly ShortcutItem[];
  title?: string;
  description?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const LIMIT = 40;

function usable(item: ShortcutItem) {
  return (
    !!item &&
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    typeof item.label === 'string' &&
    item.label.trim().length > 0 &&
    Array.isArray(item.keys) &&
    item.keys.some((key) => typeof key === 'string' && key.trim().length > 0)
  );
}

function keysOf(item: ShortcutItem) {
  return item.keys
    .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
    .slice(0, 4)
    .map((key) => key.trim().slice(0, 16));
}

/**
 * Opens the shortcut sheet when "?" is pressed outside a text field. Pass enabled={false}
 * while the sheet is already open. The hook does not handle the shortcuts themselves.
 */
export function useShortcutHelp(onOpen: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
        return;
      if (event.key !== '?') return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable)
          return;
      }
      event.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onOpen]);
}

/**
 * Lists keyboard shortcuts the host says it handles, without listening for those keys.
 */
export function ShortcutHelp({
  open,
  onOpenChange,
  shortcuts,
  title = 'Keyboard shortcuts',
  description = 'Actions available from the keyboard.',
  className = '',
}: ShortcutHelpProps) {
  const valid = (Array.isArray(shortcuts) ? shortcuts : []).filter(usable);
  const shown = valid.slice(0, LIMIT);
  const groups: { name: string; items: ShortcutItem[] }[] = [];
  for (const item of shown) {
    const name = item.group?.trim().slice(0, 80) ?? '';
    const existing = groups.find((group) => group.name === name);
    if (existing) existing.items.push(item);
    else groups.push({ name, items: [item] });
  }
  const named = groups.some((group) => group.name);
  return (
    <Modal
      className={className}
      layout="sheet"
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      {shown.length === 0 ? (
        <p>No shortcuts were supplied.</p>
      ) : (
        <div data-part="shortcut-help">
          {groups.map((group) => (
            <section key={group.name || 'general'}>
              {named && <p className={css.heading}>{group.name || 'Other'}</p>}
              <ul className={css.list}>
                {group.items.map((item) => {
                  const keys = keysOf(item);
                  return (
                    <li key={item.id}>
                      <span>{item.label.trim().slice(0, 200)}</span>
                      <span className={css.keys}>
                        {keys.map((key, index) => (
                          <span key={`${item.id}:${index}`}>
                            {index > 0 && <span aria-hidden="true">+</span>}
                            <Kbd size="sm">{key}</Kbd>
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {valid.length > LIMIT && (
            <p className={css.note}>
              Showing {LIMIT} of {valid.length} shortcuts.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
