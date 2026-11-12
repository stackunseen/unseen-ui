'use client';
import { useCallback, useRef, useState } from 'react';

export interface CopyStatus {
  /** The key passed to copy, by default the text itself. */
  key: string;
  ok: boolean;
}

/** The two outcomes a copy control announces; pass translations through a component's labels. */
export interface CopyWords {
  copied: string;
  copyFailed: string;
}

/** Copies text and reports the real outcome; it never claims success when the clipboard fails. */
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus | undefined>();
  const attempt = useRef(0);
  const copy = useCallback(async (text: string, key = text) => {
    const current = ++attempt.current;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    if (attempt.current === current) setStatus({ key, ok });
    return ok;
  }, []);
  const reset = useCallback(() => {
    attempt.current += 1;
    setStatus(undefined);
  }, []);
  const message = (key: string, words: Partial<CopyWords> = {}) =>
    status?.key === key
      ? status.ok
        ? (words.copied ?? 'Copied')
        : (words.copyFailed ?? 'Copy unavailable')
      : undefined;
  return { copy, message, status, reset };
}
