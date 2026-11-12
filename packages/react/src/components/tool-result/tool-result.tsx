'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { Measurement } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';
import css from '../tool-call/tools.module.css';

/** A structured tool result the host already validated; the renderer registry picks how to show it. */
export interface ToolResultData {
  toolName: string;
  mediaType?: string;
  data: unknown;
}
export type ToolResultRenderer = ComponentType<{ result: ToolResultData; label: string }>;
export interface ToolResultRegistry {
  /** The key of the renderer for this result, or undefined to fall back to the bounded text view. */
  match: (result: ToolResultData) => string | undefined;
  renderers: Record<string, ToolResultRenderer>;
}
/** Bytes, rows or items received so far, as the host measured them. */
export interface ToolResultPartial {
  received: Measurement<number>;
  expected?: Measurement<number>;
  /** What is being counted, for example "rows". Defaults to "items". */
  unit?: string;
}

const RegistryContext = createContext<ToolResultRegistry | null>(null);
/** Host-registered renderers keyed by the host's own match function. The model never chooses one. */
export function ToolResultRegistryProvider({
  registry,
  children,
}: {
  registry: ToolResultRegistry;
  children: ReactNode;
}) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}
export function useToolResultRegistry() {
  return useContext(RegistryContext);
}

function textOf(result: ToolResultData | undefined, text: string | undefined) {
  if (text !== undefined) return text;
  if (!result) return undefined;
  if (typeof result.data === 'string') return result.data;
  if (result.data === undefined) return undefined;
  try {
    return JSON.stringify(result.data, null, 2);
  } catch {
    return undefined;
  }
}
function count(measurement: Measurement<number> | undefined) {
  if (!measurement || measurement.kind === 'unknown') return undefined;
  return Number.isFinite(measurement.value) ? measurement.value : undefined;
}

export function ToolResult({
  variant = 'code',
  text,
  result,
  partial,
  error,
  onRetry,
  maxCharacters = 4000,
  label = 'Tool output preview',
  className = '',
}: VariantProps<'ToolResult'> & {
  text?: string;
  /** A structured result; a registered renderer shows it, otherwise it is printed as bounded text. */
  result?: ToolResultData;
  /** Present while the tool is still returning output. */
  partial?: ToolResultPartial;
  error?: string;
  onRetry?: () => void;
  maxCharacters?: number;
  /** Names the bounded, keyboard-scrollable preview when several tools are visible. */
  label?: string;
} & { className?: string }) {
  const locale = useLocale();
  const registry = useToolResultRegistry();
  const limit = Math.max(
    1,
    Math.min(20_000, Number.isFinite(maxCharacters) ? maxCharacters : 4000),
  );
  const key = result && registry ? registry.match(result) : undefined;
  const Renderer = key ? registry?.renderers[key] : undefined;
  const shown = textOf(result, text);
  const received = count(partial?.received);
  const expected = count(partial?.expected);
  const unit = partial?.unit ?? 'items';
  const progress =
    partial &&
    (received === undefined
      ? `Receiving; count ${partial.received.kind === 'unknown' ? 'unknown' : 'unavailable'}.`
      : expected === undefined
        ? `${received.toLocaleString(locale)} ${unit} received so far${partial.expected ? '; total unknown' : ''}.`
        : `${received.toLocaleString(locale)} of ${expected.toLocaleString(locale)} ${unit} received.`);
  const preview = (
    <pre className={`${s.code} ${css.preview}`} tabIndex={0} role="group" aria-label={label}>
      {shown ? shown.slice(0, limit) : partial ? 'Waiting for output…' : 'No output returned.'}
    </pre>
  );
  return (
    <div
      data-part="tool-result"
      data-variant={variant}
      data-renderer={key}
      data-partial={partial ? 'true' : undefined}
      aria-busy={partial ? true : undefined}
      className={`${s.toolResult} ${className}`}
    >
      {partial && !error && (
        <div className={s.row} role="status">
          <StatusBadge state="running" label="Partial" />
          <span className={s.muted}>{progress}</span>
        </div>
      )}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : Renderer && result ? (
        <Renderer result={result} label={label} />
      ) : variant === 'expandable' ? (
        <Accordion
          region={false}
          type="single"
          collapsible
          items={[{ value: 'result', title: 'Inspect tool output', content: preview }]}
        />
      ) : (
        preview
      )}
      {!Renderer && shown && shown.length > limit && (
        <p className={s.muted}>
          Preview truncated at {limit.toLocaleString(locale)} characters. The full output is kept by
          the app.
        </p>
      )}
      {error && onRetry && (
        <Button size="sm" className={a.local} variant="outline" onClick={onRetry}>
          <AIIcon name="retry" /> Request retry
        </Button>
      )}
    </div>
  );
}
