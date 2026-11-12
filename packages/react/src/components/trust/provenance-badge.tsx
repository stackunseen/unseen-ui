'use client';
import type { ComponentProps } from 'react';
import { useLocale } from '../../providers/locale/locale.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { IconName } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { formatStamp } from './shared.js';

export type ProvenanceOrigin = 'model' | 'tool' | 'person' | 'imported';
/** A signature the host checked. The badge never verifies anything itself. */
export interface ProvenanceManifest {
  issuer: string;
  verifiedBy: 'host';
  at: string;
}
export interface ProvenanceBadgeProps
  extends VariantProps<'ProvenanceBadge'>, ComponentProps<'span'> {
  origin: ProvenanceOrigin;
  /** The model, tool, person or source behind the content. */
  source?: string;
  manifest?: ProvenanceManifest;
  locale?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const origins: Record<ProvenanceOrigin, { label: string; icon?: IconName }> = {
  model: { label: 'Model', icon: 'assistant' },
  tool: { label: 'Tool', icon: 'tool' },
  person: { label: 'Person', icon: 'user' },
  imported: { label: 'Imported', icon: 'document' },
};

/** Where content came from. "Signed" appears only when the host says it verified a manifest. */
export function ProvenanceBadge({
  origin,
  source,
  manifest,
  locale: localeProp,
  variant = 'soft',
  className = '',
  ...rest
}: ProvenanceBadgeProps) {
  const locale = useLocale(localeProp);
  const known = origins[origin];
  const signed = Boolean(manifest && manifest.verifiedBy === 'host' && manifest.issuer.trim());
  const label = known?.label ?? 'Unknown origin';
  const text = `${signed ? 'Signed' : 'Origin'}: ${label}${source?.trim() ? ` · ${source.trim().slice(0, 120)}` : ''}`;
  const detail = signed
    ? `Signature by ${manifest!.issuer.trim()} verified${manifest!.at ? ` on ${formatStamp(manifest!.at, locale)}` : ''}.`
    : manifest
      ? 'A signature was provided but hasn’t been verified.'
      : undefined;
  return (
    <span
      {...rest}
      className={`${s.badge} ${className}`}
      data-part="provenance"
      data-variant={variant}
      data-origin={known ? origin : 'unknown'}
      data-signed={signed}
      data-tone={signed ? 'success' : 'neutral'}
    >
      {signed ? (
        <AIIcon name="check" size={12} />
      ) : known?.icon ? (
        <AIIcon name={known.icon} size={12} />
      ) : null}
      <span>
        {text}
        {detail && <span className={s.srOnly}> {detail}</span>}
      </span>
    </span>
  );
}
