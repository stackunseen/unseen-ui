'use client';
import { useState } from 'react';
import type { Source, MessagePart } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Modal } from '../modal/modal.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './citation.module.css';
import { SourceCard } from '../source-card/source-card.js';
export type CitationReference = Pick<
  Extract<MessagePart, { type: 'source' }>,
  'sourceId' | 'version' | 'locator'
>;

export type CitationProps = VariantProps<'Citation'> & { number: number } & (
    | { source: Source; reference?: CitationReference }
    | { source?: Source; reference: CitationReference }
  );

export function Citation({ source, reference, number, variant = 'chip' }: CitationProps) {
  const [open, setOpen] = useState(false);
  const [openedReference, setOpenedReference] = useState<CitationReference>();
  const currentReference = reference ?? {
    sourceId: source!.id,
    version: source!.version,
    locator: source!.locator,
  };
  const expected = open && openedReference ? openedReference : currentReference;
  const matched =
    source?.id === expected.sourceId &&
    source.version === expected.version &&
    source.locator === expected.locator
      ? source
      : undefined;
  const title = matched?.title ?? 'Source unavailable';
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next) setOpenedReference({ ...currentReference });
        setOpen(next);
      }}
      title={title}
      description={`${expected.locator} · ${expected.version}`}
      trigger={
        <Button
          variant={variant === 'inline' ? 'ghost' : 'outline'}
          className={own.citation}
          data-presentation={variant}
          aria-label={`Source ${number}: ${title}`}
        >
          [{number}]{variant !== 'number' && <> {title}</>}
        </Button>
      }
    >
      {matched ? (
        <SourceCard source={matched} />
      ) : (
        <p role="status" className={s.warning}>
          This source’s version or location isn’t available.
        </p>
      )}
    </Modal>
  );
}
