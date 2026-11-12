'use client';
import type { WithRoot } from '../../shared/with-root.js';
import type { Source } from '@stackunseen/ui-core';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { SourceCard } from '../source-card/source-card.js';
import { stateLabel } from '../../shared/labels.js';
export function EvidenceGroup({
  variant = 'stack',
  sources,
  claim,
  relationships,
  className = '',
  ...rest
}: WithRoot<
  VariantProps<'EvidenceGroup'> & {
    sources: Source[];
    claim: string;
    relationships?: Record<string, 'supports' | 'contradicts' | 'related'>;
  } & { className?: string },
  'div'
>) {
  return (
    <div
      {...rest}
      role="group"
      aria-label="Evidence"
      className={`${s.evidenceGroup} ${className}`}
      data-variant={variant}
    >
      <p className={s.muted}>{claim}</p>
      {sources.length ? (
        variant === 'accordion' ? (
          <Accordion
            type="multiple"
            region={false}
            items={sources.map((source) => ({
              value: source.id,
              title: (
                <span>
                  {source.title} · {stateLabel(relationships?.[source.id] ?? 'related')}
                </span>
              ),
              content: <SourceCard source={source} />,
            }))}
          />
        ) : (
          <div className={s.collection}>
            {sources.map((source) => (
              <div key={source.id}>
                <span className={s.muted}>
                  {stateLabel(relationships?.[source.id] ?? 'related')}
                </span>
                <SourceCard source={source} />
              </div>
            ))}
          </div>
        )
      ) : (
        <p>No supporting sources provided.</p>
      )}
    </div>
  );
}
