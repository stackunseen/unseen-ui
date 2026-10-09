'use client';
import { forwardRef, useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode, RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconButton } from '../icon-button/icon-button.js';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import s from './sidecar.module.css';

export type SidecarPresentation = 'docked' | 'drawer' | 'overlay';
/** What a docked or overlay panel becomes below mobileBreakpoint. */
export type SidecarNarrowPresentation = 'drawer' | 'sheet';
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
  /** Docked and overlay panels change presentation at this viewport width. */
  mobileBreakpoint?: number | false;
  /**
   * Below the breakpoint a docked or overlay panel becomes a modal drawer, or with `sheet` a
   * non-modal bottom sheet (--ai-sidecar-sheet-height, 46vh) that leaves the content above it
   * visible and scrollable: the page body is padded by the sheet height while it is open and
   * `data-ai-sidecar-sheet` is set on the root element.
   */
  narrowPresentation?: SidecarNarrowPresentation;
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
  /**
   * Overlay only: close on Escape wherever focus is while this is the most recently opened
   * layer (default true). Nested popups that consume Escape keep the inspector open.
   */
  closeOnEscape?: boolean;
  /**
   * Overlay only: distance from the viewport edges in pixels, for example to clear a sticky
   * site header. A number applies to every edge. The same values are available as the CSS
   * custom properties --ai-sidecar-inset, --ai-sidecar-inset-top and --ai-sidecar-inset-bottom.
   */
  inset?: number | { top?: number; bottom?: number; inline?: number };
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
    narrowPresentation = 'drawer',
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
    closeOnEscape = true,
    inset,
    style,
    onFocusCapture,
    onBlurCapture,
    onKeyDown,
    className = '',
    ...props
  },
  forwardedRef,
) {
  const narrow = useNarrowViewport(mobileBreakpoint);
  const effectivePresentation: SidecarPresentation | 'sheet' = narrow
    ? narrowPresentation === 'sheet' && presentation !== 'drawer'
      ? 'sheet'
      : 'drawer'
    : presentation;
  const modal = effectivePresentation === 'drawer';
  // Overlay and sheet float over the page without a focus trap, so they share focus and
  // Escape handling.
  const floating = effectivePresentation === 'overlay' || effectivePresentation === 'sheet';
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
  // Overlay content mounts inside a portal one commit after open turns true, so the
  // focus move waits for the panel node instead of running against an empty ref.
  const pendingFocus = useRef(false);
  const setContentRef = useCallback(
    (node: HTMLElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
      if (node && pendingFocus.current) {
        pendingFocus.current = false;
        queueMicrotask(() => {
          if (!openRef.current || contentRef.current !== node) return;
          const active = node.ownerDocument.activeElement;
          if (
            active instanceof HTMLElement &&
            active !== node.ownerDocument.body &&
            !node.contains(active)
          )
            previousFocusRef.current = active;
          const target = initialFocusRef?.current;
          if (target && node.contains(target)) target.focus();
          else node.focus();
        });
      }
    },
    [forwardedRef, initialFocusRef],
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
    if (floating) {
      // The panel may already be attached (presentation change) or still waiting on the portal.
      if (contentRef.current?.isConnected) focusContent();
      else pendingFocus.current = true;
    } else if (focusedInside.current || initialFocusRef?.current) focusContent();
    return () => {
      pendingFocus.current = false;
      restoreFocus(false);
    };
  }, [open, modal, floating, initialFocusRef, focusContent, restoreFocus]);
  // A floating inspector is the top layer: Escape anywhere requests a close, then focus
  // returns to the explicit return target or the element focused before it opened.
  useEffect(() => {
    if (!open || modal || !floating || !closeOnEscape) return;
    const doc = contentRef.current?.ownerDocument ?? globalThis.document;
    if (!doc) return;
    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const target = event.target;
      if (target instanceof Node && contentRef.current?.contains(target)) return;
      queueMicrotask(() => {
        if (event.defaultPrevented || !openRef.current) return;
        if (doc.querySelector('[role="dialog"][aria-modal="true"], [role="listbox"]')) return;
        onEscapeKeyDown?.(event);
        if (event.defaultPrevented) return;
        focusedInside.current = true;
        onOpenChange(false);
      });
    }
    doc.addEventListener('keydown', onDocumentKeyDown);
    return () => doc.removeEventListener('keydown', onDocumentKeyDown);
  }, [open, modal, floating, closeOnEscape, onEscapeKeyDown, onOpenChange]);
  // A sheet covers the bottom of the viewport, so the page gets matching end padding and the
  // content the sheet describes can still scroll into view above it.
  useEffect(() => {
    if (!open || effectivePresentation !== 'sheet') return;
    const doc = contentRef.current?.ownerDocument ?? globalThis.document;
    if (!doc) return;
    const previous = doc.body.style.paddingBlockEnd;
    doc.body.style.paddingBlockEnd = 'var(--ai-sidecar-sheet-height, 46vh)';
    doc.documentElement.setAttribute('data-ai-sidecar-sheet', '');
    return () => {
      doc.body.style.paddingBlockEnd = previous;
      doc.documentElement.removeAttribute('data-ai-sidecar-sheet');
    };
  }, [open, effectivePresentation]);
  const insetStyle =
    inset === undefined
      ? undefined
      : typeof inset === 'number'
        ? { '--ai-sidecar-inset': `${inset}px` }
        : {
            ...(inset.inline !== undefined ? { '--ai-sidecar-inset': `${inset.inline}px` } : {}),
            ...(inset.top !== undefined ? { '--ai-sidecar-inset-top': `${inset.top}px` } : {}),
            ...(inset.bottom !== undefined
              ? { '--ai-sidecar-inset-bottom': `${inset.bottom}px` }
              : {}),
          };
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
      style={insetStyle ? { ...insetStyle, ...style } : style}
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
