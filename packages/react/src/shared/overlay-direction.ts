import { createContext, useContext } from 'react';

/** Body portals cannot inherit a locally scoped DOM direction. */
export const OverlayDirection = createContext<'ltr' | 'rtl' | undefined>(undefined);
export function useOverlayDirection(dir?: string) {
  const inherited = useContext(OverlayDirection);
  return dir ?? inherited;
}
