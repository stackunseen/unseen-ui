import { useCallback } from 'react';
import type { Ref, RefObject } from 'react';

/** One ref for an element the component needs itself and the caller may also want. */
export function useMergedRef<T>(own: RefObject<T | null>, outer: Ref<T> | undefined) {
  return useCallback(
    (node: T | null) => {
      own.current = node;
      if (typeof outer === 'function') {
        const cleanup = outer(node);
        if (typeof cleanup === 'function')
          return () => {
            own.current = null;
            cleanup();
          };
      } else if (outer) outer.current = node;
      return undefined;
    },
    [own, outer],
  );
}
