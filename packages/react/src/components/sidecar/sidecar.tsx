'use client';
import { forwardRef, useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode, RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconButton } from '../icon-button/icon-button.js';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import s from './sidecar.module.css';

export type SidecarPresentation = 'docked' | 'drawer' | 'overlay';
export interface SidecarProps extends Omit<
  ComponentPropsWithoutRef<'aside'>,
  | 'title'
  | 'children'
  | 'role'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-modal'
> {
  /** Visibility belongs to the host. A close action only requests a change. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  presentation?: SidecarPresentation;
  side?: 'start' | 'end';
  /** Docked and overlay panels become modal drawers at this viewport width. */
  mobileBreakpoint?: number | false;
  /** A single focusable element, such as the shared Button or IconButton. */
  trigger?: ReactElement;
  /** Optional initial target inside the panel; otherwise drawers focus the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Used when the opener is outside this component or is replaced by host state. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
  /** Compact contextual actions. The close control is appended at the trailing edge. */
  actions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  bodyLabel?: string;
  /** Drawer pointer dismissal (default true). Non-modal panes stay open during outside work. */
  dismissOnInteractOutside?: boolean;
  onEscapeKeyDown?: ComponentPropsWithoutRef<typeof Dialog.Content>['onEscapeKeyDown'];
}

/** A consistent server snapshot prevents browser-width reads during SSR/hydration. */
function useNarrowViewport(breakpoint: number | false) {
  const query =
    breakpoint !== false && Number.isFinite(breakpoint) && breakpoint >= 0
      ? `(max-width: ${breakpoint}px)`
      : '';
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!query || typeof window === 'undefined' || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => !!query && typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * One mounted panel: inline complementary content, a modal drawer, or a floating
 * non-modal inspector. The host owns content, access, state and parent sizing.
 */
export const Sidecar = forwardRef<HTMLElement, SidecarProps>(function Sidecar(
  {
    open,
    onOpenChange,
    title,
    description,
    headingLevel = 2,
    presentation = 'docked',
    side = 'end',
    mobileBreakpoint = 768,
    trigger,
    initialFocusRef,
    returnFocusRef,
    closeLabel = 'Close panel',
    actions,
    toolbar,
    footer,
    children,
    bodyLabel,
    dismissOnInteractOutside,
    onEscapeKeyDown,
    onFocusCapture,
    onBlurCapture,
    onKeyDown,
    className = '',
    ...props
  },
  forwardedRef,
) {
  const narrow = useNarrowViewport(mobileBreakpoint);
  const effectivePresentation = narrow ? 'drawer' : presentation;
  const modal = effectivePresentation === 'drawer';
  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusedInside = useRef(false);
  const mounted = useRef(false);
  // Radix unmounts one focus scope before mounting the next presentation. Its
  // deferred close event must not restore an opener while this panel stays open.
  const openRef = useRef(open);
  openRef.current = open;
  const setContentRef = useCallback(
    (node: HTMLElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  const restoreFocus = useCallback(
    (wasModal: boolean, unmounted = false) => {
      if ((!unmounted && openRef.current) || (!wasModal && !focusedInside.current)) return;
      const target = [returnFocusRef?.current, triggerRef.current, previousFocusRef.current].find(
        (element) => element?.isConnected,
      );
      target?.focus();
      focusedInside.current = false;
    },
    [returnFocusRef],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // A controlled parent may remove the whole pane before open=false reaches
      // it. Run after parent layout fallbacks, but skip effect/presentation
      // replacement (including StrictMode) when the same Sidecar remains mounted.
      queueMicrotask(() => {
        if (!mounted.current) restoreFocus(false, true);
      });
    };
  }, [restoreFocus]);
  const focusContent = useCallback(() => {
    const active = contentRef.current?.ownerDocument.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== contentRef.current?.ownerDocument.body &&
      !contentRef.current?.contains(active)
    )
      previousFocusRef.current = active;
    const target = initialFocusRef?.current;
    if (target && contentRef.current?.contains(target)) target.focus();
    else contentRef.current?.focus();
  }, [initialFocusRef]);
  useEffect(() => {
    if (!open || modal) return;
    if (effectivePresentation === 'overlay' || focusedInside.current || initialFocusRef?.current)
      focusContent();
    return () => restoreFocus(false);
  }, [open, modal, effectivePresentation, initialFocusRef, focusContent, restoreFocus]);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const PanelElement = modal ? 'div' : 'aside';
  const panel = (
    <PanelElement
      {...props}
      ref={setContentRef}
      role={modal ? 'dialog' : 'complementary'}
      {...(modal
        ? { 'aria-modal': true }
        : {
            'aria-labelledby': titleId,
            'aria-describedby': description ? descriptionId : undefined,
          })}
      className={`${s.root} ${className}`}
      data-sidecar=""
      data-presentation={effectivePresentation}
      data-side={side}
      tabIndex={-1}
      onFocusCapture={(event) => {
        focusedInside.current = true;
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          focusedInside.current = false;
        onBlurCapture?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (modal || event.key !== 'Escape' || !event.currentTarget.contains(event.target as Node))
          return;
        const nativeEvent = event.nativeEvent;
        const panelNode = event.currentTarget;
        // A nested popup's document handler receives Escape first. Its
        // preventDefault then protects the persistent inspector from closing.
        queueMicrotask(() => {
          if (nativeEvent.defaultPrevented || !panelNode.isConnected || !openRef.current) return;
          onEscapeKeyDown?.(nativeEvent);
          if (!nativeEvent.defaultPrevented) onOpenChange(false);
        });
      }}
    >
      <div className={s.headerRegion} data-part="sidecar-header-region">
        <header className={s.header} data-part="sidecar-header">
          <div className={s.heading}>
            {modal ? (
              <Dialog.Title asChild>
                <Heading className={s.title}>{title}</Heading>
              </Dialog.Title>
            ) : (
              <Heading id={titleId} className={s.title}>
                {title}
              </Heading>
            )}
            {description &&
              (modal ? (
                <Dialog.Description className={s.description}>{description}</Dialog.Description>
              ) : (
                <p id={descriptionId} className={s.description}>
                  {description}
                </p>
              ))}
          </div>
          <div className={s.actions} data-part="sidecar-actions">
            {actions}
            <Dialog.Close asChild>
              <IconButton icon="close" label={closeLabel} />
            </Dialog.Close>
          </div>
        </header>
        {toolbar != null && (
          <div className={s.toolbar} data-part="sidecar-toolbar">
            {toolbar}
          </div>
        )}
      </div>
      <div
        className={s.body}
        data-part="sidecar-body"
        role="region"
        aria-label={bodyLabel ?? `${title} content`}
        tabIndex={0}
      >
        {children}
      </div>
      {footer != null && (
        <footer className={s.footer} data-part="sidecar-footer">
          {footer}
        </footer>
      )}
    </PanelElement>
  );
  const content = modal ? (
    <Dialog.Content
      asChild
      {...(description ? {} : { 'aria-describedby': undefined })}
      onEscapeKeyDown={onEscapeKeyDown}
      onInteractOutside={(event) => {
        if (dismissOnInteractOutside === false) event.preventDefault();
      }}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        focusContent();
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus(true);
      }}
    >
      {panel}
    </Dialog.Content>
  ) : open ? (
    panel
  ) : null;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      {trigger != null && (
        <Dialog.Trigger asChild ref={triggerRef}>
          {trigger}
        </Dialog.Trigger>
      )}
      {effectivePresentation === 'docked' ? (
        content
      ) : (
        <Dialog.Portal>
          <ThemeSurface>
            {modal && <Dialog.Overlay className={s.backdrop} />}
            {content}
          </ThemeSurface>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
});
