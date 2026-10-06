'use client';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { Runtime, RuntimeSnapshot } from '@stackunseen/ui-core';
const RuntimeContext = createContext<Runtime | null>(null);
export function RuntimeProvider({ runtime, children }: { runtime: Runtime; children: ReactNode }) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
/** Return stable snapshot fields; allocating a new object in a selector is unsupported. */
export function useRuntimeSelector<T>(selector: (snapshot: RuntimeSnapshot) => T): T {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('useRuntimeSelector requires RuntimeProvider.');
  const get = useCallback(() => selector(runtime.getSnapshot()), [runtime, selector]);
  const server = useCallback(() => selector(runtime.getServerSnapshot()), [runtime, selector]);
  return useSyncExternalStore(runtime.subscribe, get, server);
}
