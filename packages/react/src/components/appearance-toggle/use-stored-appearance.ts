'use client';
import { useCallback, useSyncExternalStore } from 'react';
import type { Appearance } from '../../theme.js';

const appearances: readonly Appearance[] = ['light', 'dark', 'system'];
const isAppearance = (value: unknown): value is Appearance =>
  appearances.includes(value as Appearance);

// Listeners per key, so two toggles for the same key agree and other keys stay quiet.
const listeners = new Map<string, Set<() => void>>();
// What was chosen when storage is blocked, so the toggle still works for this page view.
const fallback = new Map<string, Appearance>();

function read(storageKey: string, defaultValue: Appearance): Appearance {
  try {
    const stored = localStorage.getItem(storageKey);
    if (isAppearance(stored)) return stored;
    return fallback.get(storageKey) ?? defaultValue;
  } catch {
    return fallback.get(storageKey) ?? defaultValue;
  }
}

export interface StoredAppearanceOptions {
  storageKey: string;
  defaultValue?: Appearance;
}

/**
 * The stored light, dark or system choice for a key. Reads through useSyncExternalStore with
 * a server snapshot of the default, follows other tabs through the storage event, and keeps
 * working when storage is blocked (the choice then lasts for this page view).
 */
export function useStoredAppearance({
  storageKey,
  defaultValue = 'system',
}: StoredAppearanceOptions): [Appearance, (next: Appearance) => void] {
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
    () => read(storageKey, defaultValue),
    () => defaultValue,
  );
  const set = useCallback(
    (next: Appearance) => {
      if (!isAppearance(next)) return;
      fallback.set(storageKey, next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Private mode or blocked storage: the choice is kept for this page view only.
      }
      listeners.get(storageKey)?.forEach((notify) => notify());
    },
    [storageKey],
  );
  return [value, set];
}

const darkQuery = '(prefers-color-scheme: dark)';
const subscribeSystem = (notify: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(darkQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const systemIsDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.(darkQuery).matches;

/** Resolves "system" through matchMedia and follows changes live; the server snapshot is light. */
export function useResolvedAppearance(appearance: Appearance): 'light' | 'dark' {
  const dark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return dark ? 'dark' : 'light';
}

export interface AppearanceInitScriptOptions {
  storageKey: string;
  /** The attribute set on the root element for light or dark; removed for system. */
  attribute?: string;
  target?: 'html';
}

/**
 * A tiny inline script for the document head that applies the stored choice before paint,
 * so there is no flash. It sets the attribute for light or dark and removes it for system;
 * the host's own stylesheet keys off that attribute.
 */
export function appearanceInitScript({
  storageKey,
  attribute = 'data-appearance',
}: AppearanceInitScriptOptions): string {
  const key = JSON.stringify(storageKey);
  const name = JSON.stringify(attribute);
  return `(function(){try{var v=localStorage.getItem(${key});var e=document.documentElement;if(v==="light"||v==="dark"){e.setAttribute(${name},v)}else{e.removeAttribute(${name})}}catch(e){}})();`;
}
