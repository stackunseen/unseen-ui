'use client';
import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Map<string, Set<() => void>>();
const fallback = new Map<string, string[]>();
// Snapshots must be stable for an unchanged value, so the parsed array is cached by its text.
const cache = new Map<string, { raw: string; ids: string[] }>();
const empty: string[] = [];

function parse(storageKey: string, raw: string | null): string[] {
  if (raw === null) return fallback.get(storageKey) ?? empty;
  const cached = cache.get(storageKey);
  if (cached && cached.raw === raw) return cached.ids;
  let ids: string[] = empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    ids = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : empty;
  } catch {
    ids = empty;
  }
  cache.set(storageKey, { raw, ids });
  return ids;
}
function read(storageKey: string): string[] {
  try {
    return parse(storageKey, localStorage.getItem(storageKey));
  } catch {
    return fallback.get(storageKey) ?? empty;
  }
}

/**
 * Checked ids kept in this browser under a key, for hosts that want a Checklist to remember
 * progress. Reads through useSyncExternalStore with an empty server snapshot, follows other
 * tabs through the storage event, and keeps working when storage is blocked.
 */
export function useStoredChecklist(storageKey: string): [string[], (ids: string[]) => void] {
  const subscribe = useCallback(
    (notify: () => void) => {
      let set = listeners.get(storageKey);
      if (!set) {
        set = new Set();
        listeners.set(storageKey, set);
      }
      set.add(notify);
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === storageKey) notify();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        set.delete(notify);
        window.removeEventListener('storage', onStorage);
      };
    },
    [storageKey],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => empty,
  );
  const set = useCallback(
    (ids: string[]) => {
      const next = [...new Set(ids)];
      fallback.set(storageKey, next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Private mode or blocked storage: progress lasts for this page view only.
      }
      listeners.get(storageKey)?.forEach((notify) => notify());
    },
    [storageKey],
  );
  return [value, set];
}
