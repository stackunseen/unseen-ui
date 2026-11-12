'use client';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const LocaleContext = createContext<string | undefined>(undefined);

export interface AILocaleProps {
  /** A BCP 47 tag such as `de-DE`. Numbers, dates and money inside follow it. */
  locale: string;
  children: ReactNode;
}

/**
 * Sets the locale for every component inside, so an app states it once instead of on each
 * component. A component's own `locale` prop still wins. Without either, formatting is `en-US`,
 * which keeps server and browser output the same.
 */
export function AILocale({ locale, children }: AILocaleProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The locale to format with: the component's prop, else the nearest AILocale, else `en-US`. */
export function useLocale(locale?: string): string {
  const inherited = useContext(LocaleContext);
  return locale ?? inherited ?? 'en-US';
}
