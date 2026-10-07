'use client';
import { useCallback, useId, useState } from 'react';

/** Local disclosure state: controlled when `open` is supplied, otherwise uncontrolled. */
export function useDisclosure({
  open,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [local, setLocal] = useState(defaultOpen);
  const isOpen = open ?? local;
  const contentId = useId();
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setLocal(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  return {
    open: isOpen,
    setOpen,
    triggerProps: {
      type: 'button' as const,
      'aria-expanded': isOpen,
      'aria-controls': contentId,
      onClick: () => setOpen(!isOpen),
    },
    contentProps: { id: contentId, hidden: !isOpen },
  };
}

/** Safe external link check: only absolute http(s) URLs are rendered as links. */
export function safeHttpUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
