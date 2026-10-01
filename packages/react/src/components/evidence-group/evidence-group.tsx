'use client';
import type { Source } from '@ai-interaction/core';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { SourceCard } from '../source-card/source-card.js';
export function EvidenceGroup({
  variant = 'stack',
  sources,
  claim,
  relationships,
}: VariantProps<'EvidenceGroup'> & {
  sources: Source[];
  claim: string;
  relationships?: Record<string, 'supports' | 'contradicts' | 'related'>;
}) {
  return (
    <div role="group" aria-label="Evidence" className={s.evidenceGroup} data-variant={variant}>
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
                  {source.title} · {relationships?.[source.id] ?? 'related'}
                </span>
              ),
              content: <SourceCard source={source} />,
            }))}
          />
        ) : (
          <div className={s.collection}>
            {sources.map((source) => (
              <div key={source.id}>
                <span className={s.muted}>{relationships?.[source.id] ?? 'Related source'}</span>
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
