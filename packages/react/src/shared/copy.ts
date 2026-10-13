'use client';
import { useCallback, useRef, useState } from 'react';

export interface CopyStatus {
  /** The key passed to copy, by default the text itself. */
  key: string;
  ok: boolean;
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
  const message = (key: string) =>
    status?.key === key ? (status.ok ? 'Copied' : 'Copy unavailable') : undefined;
  return { copy, message, status, reset };
}
