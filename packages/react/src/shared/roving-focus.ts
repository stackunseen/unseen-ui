import type { KeyboardEvent } from 'react';

const navigationKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

/**
 * Roving tabindex navigation for a row of items. Returns the item that should receive focus
 * for an arrow, Home or End key, or null when the key is not a navigation key or nothing is
 * enabled. The caller focuses it and, for radio semantics, selects it.
 */
export function rovingTarget<T extends HTMLElement>(
  event: KeyboardEvent<HTMLElement>,
  items: readonly T[],
  isDisabled: (item: T) => boolean = (item) =>
    (item as HTMLElement & { disabled?: boolean }).disabled === true,
): T | null {
  if (!navigationKeys.has(event.key)) return null;
  const enabled = items.filter((item) => !isDisabled(item));
  if (enabled.length === 0) return null;
  const active = event.currentTarget.ownerDocument.activeElement;
  const position = Math.max(
    0,
    enabled.findIndex((item) => item === active),
  );
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabled.length - 1
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? (position + 1) % enabled.length
          : (position - 1 + enabled.length) % enabled.length;
  event.preventDefault();
  return enabled[next] ?? null;
}
