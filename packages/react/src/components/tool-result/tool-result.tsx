'use client';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';
import css from '../tool-call/tools.module.css';

export function ToolResult({
  variant = 'code',
  text,
  error,
  onRetry,
  maxCharacters = 4000,
  label = 'Tool output preview',
}: VariantProps<'ToolResult'> & {
  text?: string;
  error?: string;
  onRetry?: () => void;
  maxCharacters?: number;
  /** Names the bounded, keyboard-scrollable preview when several tools are visible. */
  label?: string;
}) {
  const limit = Math.max(
    1,
    Math.min(20_000, Number.isFinite(maxCharacters) ? maxCharacters : 4000),
  );
  return (
    <div data-part="tool-result" data-variant={variant} className={s.toolResult}>
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : variant === 'expandable' ? (
        <Accordion
          region={false}
          type="single"
          collapsible
          items={[
            {
              value: 'result',
              title: 'Inspect tool output',
              content: (
                <pre
                  className={`${s.code} ${css.preview}`}
                  tabIndex={0}
                  role="group"
                  aria-label={label}
                >
                  {text ? text.slice(0, limit) : 'No output returned.'}
                </pre>
              ),
            },
          ]}
        />
      ) : (
        <pre className={`${s.code} ${css.preview}`} tabIndex={0} role="group" aria-label={label}>
          {text ? text.slice(0, limit) : 'No output returned.'}
        </pre>
      )}
      {text && text.length > limit && (
        <p className={s.muted}>
          Preview truncated at {limit.toLocaleString('en-US')} characters. Full output remains with
          the host.
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
