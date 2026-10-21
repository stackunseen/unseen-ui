'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import s from './workspace-shell.module.css';

export interface WorkspaceShellProps extends Omit<ComponentProps<'section'>, 'children'> {
  /** Named workspace landmark, independent of the host application's title. */
  label?: string;
  variant?: 'workspace' | 'contained' | 'compact';
  header?: ReactNode;
  navigation?: ReactNode;
  main: ReactNode;
  inspector?: ReactNode;
  footer?: ReactNode;
  headerLabel?: string;
  footerLabel?: string;
  navigationLabel?: string;
  mainLabel?: string;
  inspectorLabel?: string;
  /** Use section when the workspace is embedded inside an existing main landmark. */
  mainAs?: 'main' | 'section';
  /** Use div when the supplied inspector already owns its aside/dialog semantics. */
  inspectorAs?: 'aside' | 'div';
  /** Panes requires a bounded host height. Narrow layouts share one body scroll owner. */
  scrollMode?: 'flow' | 'panes';
  /**
   * "inline" (default) keeps navigation in the layout and stacks it on narrow widths.
   * "responsive" adds a toggle: wide layouts collapse the navigation column, narrow layouts show
   * it as a drawer over the content, as chat apps do.
   */
  navigationMode?: 'inline' | 'responsive';
  /** Responsive mode: whether navigation shows. Controlled by the host. */
  navigationOpen?: boolean;
  onNavigationOpenChange?: (open: boolean) => void;
  /** Responsive mode: below this width (px) the navigation becomes a drawer. */
  navigationBreakpoint?: number;
  /** Accessible name of the navigation toggle. */
  navigationToggleLabel?: string;
}

function hasSlot(value: ReactNode) {
  return value !== null && value !== undefined && value !== false;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Layout only: routing, visibility, access and state belong to the host. Slots mount once. */
export function WorkspaceShell({
  label = 'Workspace',
  variant = 'workspace',
  header,
  navigation,
  main,
  inspector,
  footer,
  headerLabel = 'Workspace header',
  footerLabel = 'Workspace footer',
  navigationLabel = 'Workspace navigation',
  mainLabel = 'Workspace content',
  inspectorLabel = 'Workspace inspector',
  mainAs: Main = 'main',
  inspectorAs: Inspector = 'aside',
  scrollMode = 'flow',
  navigationMode = 'inline',
  navigationOpen = true,
  onNavigationOpenChange,
  navigationBreakpoint = 700,
  navigationToggleLabel = 'Navigation',
  className = '',
  ...props
}: WorkspaceShellProps) {
  const hasNavigation = hasSlot(navigation);
  const hasInspector = hasSlot(inspector);
  const responsive = navigationMode === 'responsive' && hasNavigation;
  const rootRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [narrow, setNarrow] = useState(false);

  // The layout's own width decides, so a shell inside a pane behaves like one on a phone.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!responsive || !root || typeof ResizeObserver === 'undefined') return;
    const measure = () => setNarrow(root.getBoundingClientRect().width < navigationBreakpoint);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [responsive, navigationBreakpoint]);

  const drawer = responsive && narrow;
  const drawerOpen = drawer && navigationOpen;
  const navigationShown = !responsive || navigationOpen;

  // An open drawer takes focus, and gives it back to the toggle when it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) {
      const first = navRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (first ?? navRef.current)?.focus();
    } else if (
      wasOpen.current &&
      drawer &&
      // Hiding the focused drawer drops focus to the body; that still counts as inside.
      (document.activeElement === document.body ||
        !document.activeElement ||
        navRef.current?.contains(document.activeElement))
    ) {
      toggleRef.current?.focus();
    }
    wasOpen.current = drawerOpen;
  }, [drawerOpen, drawer]);

  const close = () => onNavigationOpenChange?.(false);
  const toggle = responsive ? (
    <IconButton
      ref={toggleRef}
      icon="sidebar"
      label={navigationToggleLabel}
      aria-expanded={navigationShown}
      onClick={() => onNavigationOpenChange?.(!navigationOpen)}
    />
  ) : null;

  return (
    <section
      ref={rootRef}
      aria-label={label}
      {...props}
      data-part="workspace-shell"
      data-variant={variant}
      data-scroll-mode={scrollMode}
      data-navigation-mode={responsive ? (drawer ? 'drawer' : 'collapsible') : 'inline'}
      className={`${s.root} ${className}`}
    >
      {(hasSlot(header) || toggle) && (
        <header
          role="group"
          aria-label={headerLabel}
          data-part="workspace-header"
          className={toggle ? `${s.header} ${s.headerWithToggle}` : s.header}
        >
          {toggle}
          {header}
        </header>
      )}
      <div
        data-part="workspace-body"
        data-navigation={hasNavigation && navigationShown && !drawer}
        data-inspector={hasInspector}
        className={s.body}
      >
        {hasNavigation && (
          <nav
            ref={navRef}
            data-part="workspace-navigation"
            aria-label={navigationLabel}
            hidden={!navigationShown || undefined}
            tabIndex={scrollMode === 'panes' || drawerOpen ? (drawerOpen ? -1 : 0) : undefined}
            className={`${s.pane} ${s.navigation}`}
            data-drawer={drawer || undefined}
            onKeyDown={(event) => {
              if (drawerOpen && event.key === 'Escape') {
                event.stopPropagation();
                close();
              }
            }}
            onClick={(event) => {
              // Following a link in the drawer closes it, as the next page is what people want.
              if (drawerOpen && (event.target as Element).closest('a[href]')) close();
            }}
          >
            {navigation}
          </nav>
        )}
        {drawerOpen && (
          <div className={s.scrim} data-part="workspace-scrim" aria-hidden="true" onClick={close} />
        )}
        <Main
          data-part="workspace-main"
          aria-label={mainLabel}
          tabIndex={scrollMode === 'panes' ? 0 : undefined}
          className={`${s.pane} ${s.main}`}
          inert={drawerOpen || undefined}
        >
          {main}
        </Main>
        {hasInspector && (
          <Inspector
            data-part="workspace-inspector"
            aria-label={Inspector === 'aside' ? inspectorLabel : undefined}
            tabIndex={scrollMode === 'panes' && Inspector === 'aside' ? 0 : undefined}
            className={`${s.pane} ${s.inspector}`}
            inert={drawerOpen || undefined}
          >
            {inspector}
          </Inspector>
        )}
      </div>
      {hasSlot(footer) && (
        <footer
          role="group"
          aria-label={footerLabel}
          data-part="workspace-footer"
          className={s.footer}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}
