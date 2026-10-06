'use client';
import type { Source } from '@stackunseen/ui-core';
import { safeUrl } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function SourceCard({
  variant = 'card',
  source,
  onOpen,
}: VariantProps<'SourceCard'> & {
  source: Source;
  onOpen?: (source: Source) => void;
}) {
  const url = source.access === 'available' ? safeUrl(source.url) : undefined;
  return (
    <Panel data-part="source" data-variant={variant} className={s.sourceCard}>
      <div className={s.row}>
        <span className={s.sourceIcon} aria-hidden="true">
          <AIIcon name="document" />
        </span>
        <div className={s.grow}>
          <strong>{source.title}</strong>
          <div className={s.muted}>
            {source.locator} · {source.version}
          </div>
        </div>
      </div>
      {source.access === 'available' ? (
        <>
          {source.excerpt && <blockquote className={s.quote}>{source.excerpt}</blockquote>}
          {onOpen ? (
            <div className={`${s.actions} ${s.trailingActions}`}>
              <Button
                size="sm"
                variant="outline"
                aria-label={`View source: ${source.title}`}
                onClick={() => onOpen(source)}
              >
                View source
              </Button>
            </div>
          ) : url ? (
            <div className={`${s.actions} ${s.trailingActions}`}>
              <a
                className={s.button}
                data-variant="outline"
                data-size="sm"
                href={url}
                aria-label={`Open source: ${source.title} (opens in a new tab)`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open source <AIIcon name="external" />
              </a>
            </div>
          ) : (
            <p className={s.muted}>No source URL supplied.</p>
          )}
        </>
      ) : (
        <p className={s.warning} role="status">
          Source {source.access}. Content unavailable.
        </p>
      )}
    </Panel>
  );
}
