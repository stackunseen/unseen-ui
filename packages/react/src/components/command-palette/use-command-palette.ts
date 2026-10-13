'use client';
import { useCallback } from 'react';

interface Controller {
  open: () => void;
  close: () => void;
}
// Mounted palettes register here so a header button can open one without window events.
const controllers = new Set<Controller>();

export function registerCommandPalette(controller: Controller) {
  controllers.add(controller);
  return () => {
    controllers.delete(controller);
  };
}

function latest(): Controller | undefined {
  let last: Controller | undefined;
  for (const controller of controllers) last = controller;
  return last;
}

/**
 * Opens or closes the mounted CommandPalette from anywhere in the tree, such as a header's
 * search button. When several are mounted, the most recently mounted one answers.
 */
export function useCommandPalette(): { open: () => void; close: () => void } {
  const open = useCallback(() => latest()?.open(), []);
  const close = useCallback(() => latest()?.close(), []);
  return { open, close };
}
