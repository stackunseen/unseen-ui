'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { GroupImperativeHandle, Layout, LayoutChangedMeta } from 'react-resizable-panels';
import s from './split-pane.module.css';

export interface SplitPanePanel {
  /** Stable local identity; letters, numbers, underscore and hyphen only. */
  id: string;
  /** Accessible region name; visible headings belong to the supplied content. */
  label: string;
  children: ReactNode;
  /** Percentage of the available group; defaults to 20. */
  minSize?: number;
  /** Percentage of the available group; defaults to 100. */
  maxSize?: number;
  /** A controlled size of zero hides and unmounts this panel's content. */
  collapsible?: boolean;
  /** Host avoids a second scroll owner; auto gives this panel its own scrolling. */
  scroll?: 'host' | 'auto';
}

export type SplitPaneSizes = readonly [primary: number, secondary: number];
export interface SplitPaneResizeRequest {
  /** Only a completed pointer or keyboard interaction emits a request. */
  source: 'user';
  collapsedPanel: 'primary' | 'secondary' | null;
}
export interface SplitPaneProps extends Omit<ComponentProps<'div'>, 'children' | 'onChange'> {
  label: string;
  primary: SplitPanePanel;
  secondary: SplitPanePanel;
  /** Controlled percentages, totaling 100. No local storage is read or written. */
  sizes: SplitPaneSizes;
  onSizesChange?: (sizes: SplitPaneSizes, request: SplitPaneResizeRequest) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Stacked retains the same two panes in a vertical, bounded layout. */
  presentation?: 'split' | 'stacked' | 'responsive';
  /** Container width at which responsive switches to a vertical stack. */
  stackAt?: number;
  disabled?: boolean;
  resizeLabel?: string;
  /** Decorative replacement for the grip; the separator keeps its name. */
  grip?: ReactNode;
}

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const tolerance = 0.001;

function validName(value: string) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
}
function withinBounds(value: number, panel: SplitPanePanel) {
  return (
    Number.isFinite(value) &&
    ((value === 0 && panel.collapsible === true) ||
      (value > 0 &&
        value >= (panel.minSize ?? 20) - tolerance &&
        value <= (panel.maxSize ?? 100) + tolerance))
  );
}
function validSizes(sizes: SplitPaneSizes, primary: SplitPanePanel, secondary: SplitPanePanel) {
  return (
    Array.isArray(sizes) &&
    sizes.length === 2 &&
    withinBounds(sizes[0], primary) &&
    withinBounds(sizes[1], secondary) &&
    Math.abs(sizes[0] + sizes[1] - 100) <= tolerance
  );
}
function validPanel(panel: SplitPanePanel) {
  const minimum = panel.minSize ?? 20,
    maximum = panel.maxSize ?? 100;
  return (
    typeof panel.id === 'string' &&
    /^[a-zA-Z0-9_-]{1,160}$/.test(panel.id) &&
    validName(panel.label) &&
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    minimum > 0 &&
    minimum <= maximum &&
    maximum <= 100 &&
    (panel.scroll === undefined || panel.scroll === 'host' || panel.scroll === 'auto')
  );
}

/** Optional resizable layout; import from @stackunseen/ui/layout. */
export function SplitPane({
  label,
  primary,
  secondary,
  sizes,
  onSizesChange,
  orientation = 'horizontal',
  presentation = 'responsive',
  stackAt = 640,
  disabled = false,
  resizeLabel,
  grip,
  className = '',
  onFocusCapture,
  onBlurCapture,
  ...props
}: SplitPaneProps) {
  const instance = `split${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const focusedPanel = useRef<'primary' | 'secondary' | null>(null);
  const frame = useRef<number | undefined>(undefined);
  const [narrow, setNarrow] = useState(false);
  const primaryId = `${instance}-${primary.id}`,
    secondaryId = `${instance}-${secondary.id}`;
  const latest = useRef({ sizes, primaryId, secondaryId });
  latest.current = { sizes, primaryId, secondaryId };
  const invalid =
    !validName(label) ||
    !validPanel(primary) ||
    !validPanel(secondary) ||
    primary.id === secondary.id ||
    !validSizes(sizes, primary, secondary) ||
    (primary.minSize ?? 20) + (secondary.minSize ?? 20) > 100 ||
    (primary.maxSize ?? 100) + (secondary.maxSize ?? 100) < 100 ||
    !['split', 'stacked', 'responsive'].includes(presentation) ||
    !['horizontal', 'vertical'].includes(orientation) ||
    !Number.isFinite(stackAt) ||
    stackAt < 240 ||
    stackAt > 2000 ||
    (resizeLabel !== undefined && !validName(resizeLabel));
  const axis =
    presentation === 'stacked' || (presentation === 'responsive' && narrow)
      ? 'vertical'
      : orientation;
  const locked = disabled || !onSizesChange;

  useEffect(() => {
    const container = containerRef.current;
    if (presentation !== 'responsive' || !container || typeof ResizeObserver === 'undefined')
      return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setNarrow(entry.contentRect.width < stackAt);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [presentation, stackAt, invalid]);

  function synchronize() {
    const current = latest.current,
      group = groupRef.current;
    if (!group) return;
    const actual = group.getLayout();
    if (
      Math.abs((actual[current.primaryId] ?? -1) - current.sizes[0]) <= tolerance &&
      Math.abs((actual[current.secondaryId] ?? -1) - current.sizes[1]) <= tolerance
    )
      return;
    group.setLayout({
      [current.primaryId]: current.sizes[0],
      [current.secondaryId]: current.sizes[1],
    });
  }

  useClientLayoutEffect(() => {
    if (!invalid) synchronize();
    const focused = focusedPanel.current;
    if (focused && (invalid || sizes[focused === 'primary' ? 0 : 1] === 0)) {
      const active = containerRef.current?.ownerDocument.activeElement;
      if (
        active === containerRef.current?.ownerDocument.body ||
        (active && containerRef.current?.contains(active))
      ) {
        (invalid || locked ? containerRef.current : separatorRef.current)?.focus();
      }
      focusedPanel.current = null;
    }
  }, [invalid, sizes[0], sizes[1], primaryId, secondaryId, axis, locked]);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function request(next: Layout, meta: LayoutChangedMeta) {
    if (locked || !meta.isUserInteraction) return;
    const candidate: SplitPaneSizes = [next[primaryId] ?? NaN, next[secondaryId] ?? NaN];
    if (validSizes(candidate, primary, secondary)) {
      onSizesChange?.(
        Object.freeze(candidate),
        Object.freeze({
          source: 'user',
          collapsedPanel: candidate[0] === 0 ? 'primary' : candidate[1] === 0 ? 'secondary' : null,
        }),
      );
    }
    // The primitive previews a drag locally; the host decides its committed layout.
    // A declined request returns to the latest controlled props after React commits.
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      synchronize();
    });
  }

  if (invalid)
    return (
      <div
        {...props}
        ref={containerRef}
        tabIndex={-1}
        className={`${s.root} ${className}`}
        role="group"
        aria-label="Split layout unavailable"
      >
        <p className={s.notice} role="status">
          Split layout unavailable: check names, sizes and panel bounds.
        </p>
      </div>
    );
  const descriptionId = `${instance}-instructions`;
  function panel(descriptor: SplitPanePanel, index: 0 | 1, panelId: string) {
    const collapsed = sizes[index] === 0;
    return (
      <Panel
        key={descriptor.id}
        id={panelId}
        minSize={`${descriptor.minSize ?? 20}%`}
        maxSize={`${descriptor.maxSize ?? 100}%`}
        defaultSize={`${sizes[index]}%`}
        collapsible={descriptor.collapsible}
        collapsedSize="0%"
        role={collapsed ? undefined : 'region'}
        aria-label={collapsed ? undefined : descriptor.label}
        aria-hidden={collapsed || undefined}
        className={s.pane}
        style={{ overflow: 'hidden' }}
      >
        {collapsed ? null : (
          <div className={s.content} data-scroll={descriptor.scroll ?? 'host'}>
            {descriptor.children}
          </div>
        )}
      </Panel>
    );
  }
  return (
    <div
      {...props}
      ref={containerRef}
      tabIndex={-1}
      className={`${s.root} ${className}`}
      role="group"
      aria-label={label}
      onFocusCapture={(event) => {
        const paneId = (event.target as Element).closest('[data-panel]')?.id;
        focusedPanel.current =
          paneId === primaryId ? 'primary' : paneId === secondaryId ? 'secondary' : null;
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          focusedPanel.current = null;
        onBlurCapture?.(event);
      }}
      data-part="split-pane"
      data-orientation={axis}
      data-presentation={presentation}
      data-disabled={locked || undefined}
    >
      <span id={descriptionId} className={s.srOnly}>
        {axis === 'horizontal'
          ? 'Use Left and Right arrow keys to resize.'
          : 'Use Up and Down arrow keys to resize.'}{' '}
        Home and End move to the allowed limits.
        {primary.collapsible && ' Enter toggles the primary adjacent collapsible pane.'}
      </span>
      <Group
        id={`${instance}-group`}
        groupRef={groupRef}
        orientation={axis}
        defaultLayout={{ [primaryId]: sizes[0], [secondaryId]: sizes[1] }}
        disabled={locked}
        resizeTargetMinimumSize={{ coarse: 44, fine: 16 }}
        onLayoutChanged={request}
        className={s.group}
      >
        {panel(primary, 0, primaryId)}
        <Separator
          id={`${instance}-separator`}
          elementRef={separatorRef}
          className={s.separator}
          disabled={locked}
          disableDoubleClick
          aria-label={resizeLabel ?? `Resize ${primary.label} and ${secondary.label}`}
          aria-describedby={descriptionId}
        >
          <span className={s.grip} aria-hidden="true">
            {grip ?? <span className={s.gripLine} />}
          </span>
        </Separator>
        {panel(secondary, 1, secondaryId)}
      </Group>
    </div>
  );
}
