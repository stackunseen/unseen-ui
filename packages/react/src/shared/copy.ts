'use client';
import { useCallback, useRef, useState } from 'react';

/** Copies text and reports the real outcome; it never claims success when the clipboard fails. */
export function useCopy() {
  const [status, setStatus] = useState<{ key: string; ok: boolean } | undefined>();
  const attempt = useRef(0);
  const copy = useCallback(async (text: string, key = text) => {
    const current = ++attempt.current;
    try {
      await navigator.clipboard.writeText(text);
      if (attempt.current === current) setStatus({ key, ok: true });
    } catch {
      if (attempt.current === current) setStatus({ key, ok: false });
    }
  }, []);
  const message = (key: string) =>
    status?.key === key ? (status.ok ? 'Copied' : 'Copy unavailable') : undefined;
  return { copy, message };
}
