'use client';
import type { ReactNode } from 'react';
import type { Artifact } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Modal } from '../modal/modal.js';
import { Skeleton } from '../skeleton/skeleton.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { ArtifactPreview } from '../artifact-preview/artifact-preview.js';
export interface ArtifactPanelProps extends VariantProps<'ArtifactPanel'> {
  artifact: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string;
  /** Trusted host control: one element that forwards Radix props/ref, with an accessible name. */
  trigger?: ReactNode;
  /** Trusted host content, shown only when the selected artifact is available. */
  body?: ReactNode;
  /** Trusted host actions, kept outside the scrolling body and hidden on loading/error. */
  actions?: ReactNode;
}

export function ArtifactPanel({
  variant = 'dialog',
  artifact,
  open,
  onOpenChange,
  loading = false,
  error,
  trigger,
  body,
  actions,
}: ArtifactPanelProps) {
  return (
    <Modal
      layout={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={artifact?.title ?? 'Artifact'}
      description={
        artifact
          ? `Generated content · version ${artifact.version}`
          : 'Generated content appears here.'
      }
      trigger={
        trigger ?? (
          <Button variant="outline">{artifact ? `Open ${artifact.title}` : 'Open artifact'}</Button>
        )
      }
      footer={!loading && !error && artifact ? actions : undefined}
    >
      {loading ? (
        <Skeleton shape="card" label="Loading artifact" lines={5} />
      ) : error ? (
        <p role="alert" className={s.error}>
          {error}
        </p>
      ) : artifact ? (
        body === undefined ? (
          <ArtifactPreview artifact={artifact} />
        ) : (
          body
        )
      ) : (
        <p>No artifact selected.</p>
      )}
    </Modal>
  );
}
