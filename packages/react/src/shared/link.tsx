'use client';
import { createContext, forwardRef, useContext } from 'react';
import type { AnchorHTMLAttributes, ComponentType, ReactNode, Ref } from 'react';

/** The props every link-rendering component passes to the host's router link. */
export interface LinkComponentProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}
export type LinkComponent = ComponentType<LinkComponentProps>;

const LinkContext = createContext<LinkComponent | null>(null);

export interface LinkProviderProps {
  /** A router link such as Next.js Link. It must render an anchor and forward its ref. */
  component: LinkComponent;
  children: ReactNode;
}

/**
 * Supplies the router link once at the root. Chip, ToggleGroup links, Stepper, Card and Button
 * with href, and Matrix then render it instead of a native anchor, so filter clicks become
 * client-side navigations with prefetching. Without a provider they render `<a>`.
 */
export function LinkProvider({ component, children }: LinkProviderProps) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

/** The link supplied by the nearest LinkProvider, or null when none is set. */
export function useLinkComponent(): LinkComponent | null {
  return useContext(LinkContext);
}

/** The anchor used inside the library: the provided router link, else a native anchor. */
export const Anchor = forwardRef<HTMLAnchorElement, LinkComponentProps>(
  function Anchor(props, ref) {
    const Component = useContext(LinkContext);
    if (Component) return <Component {...props} ref={ref} />;
    return <a {...props} ref={ref} />;
  },
);
