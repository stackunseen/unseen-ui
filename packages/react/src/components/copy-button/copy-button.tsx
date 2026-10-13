'use client';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../button/button.js';
import type { ButtonProps } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip/tooltip.js';
import { useCopy } from '../../shared/copy.js';
import s from './copy-button.module.css';

export interface CopyButtonProps extends Omit<ButtonProps, 'value' | 'onCopy' | 'children'> {
  /** The text to copy. */
  value: string;
  /** The visible label, and the accessible name when iconOnly. */
  label?: string;
  copiedLabel?: string;
  /** Says what to do instead; the clipboard can be blocked. */
  failedLabel?: string;
  /** Icon only, with the label as a tooltip and accessible name. */
  iconOnly?: boolean;
  /** Receives the real outcome. */
  onCopy?: (ok: boolean) => void;
  /** How long the outcome stays announced and shown. */
  resetMs?: number;
  /** Replaces the visible label content; the accessible name still comes from label. */
  children?: ReactNode;
}

/**
 * Copies a value and reports what happened. The outcome is announced in a polite live
 * region and shown by the icon, while the button's accessible name stays the same.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  failedLabel = 'Copy unavailable. Select the text and copy it by hand.',
  iconOnly = false,
  onCopy,
  resetMs = 1800,
  variant = 'outline',
  size,
  className = '',
  children,
  ...props
}: CopyButtonProps) {
  const { copy, status, reset } = useCopy();
  const outcome = status?.key === value ? status.ok : undefined;
  const state = outcome === undefined ? 'idle' : outcome ? 'copied' : 'failed';
  useEffect(() => {
    if (outcome === undefined) return;
    const timer = setTimeout(reset, resetMs);
    return () => clearTimeout(timer);
  }, [outcome, reset, resetMs]);
  const button = (
    <Button
      {...props}
      variant={variant}
      size={size}
      aria-label={iconOnly ? label : undefined}
      data-part="copy-button"
      data-state={state}
      className={`${s.button} ${className}`}
      onClick={async (event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        const ok = await copy(value);
        onCopy?.(ok);
      }}
    >
      <AIIcon name={state === 'copied' ? 'check' : 'copy'} />
      {!iconOnly && <span>{children ?? label}</span>}
    </Button>
  );
  return (
    <span className={s.root} data-part="copy-button-root">
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <span role="status" aria-live="polite" className={s.status}>
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
      </span>
    </span>
  );
}
