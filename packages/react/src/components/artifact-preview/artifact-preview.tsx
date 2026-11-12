'use client';
import type { Artifact } from '@stackunseen/ui-core';
import type { ComponentProps } from 'react';
import type { VariantProps } from '../../shared/variants.js';
import type { WithRoot } from '../../shared/with-root.js';
import s from '../../shared/styles/styles.module.css';

export function ArtifactPreview({
  artifact,
  variant = 'document',
  tableLabel,
  className = '',
  ...rest
}: WithRoot<
  VariantProps<'ArtifactPreview'> & { artifact: Artifact; tableLabel?: string } & {
    className?: string;
  },
  'div'
>) {
  if (artifact.kind === 'unsupported')
    return (
      <p {...(rest as ComponentProps<'p'>)} className={className || undefined}>
        Preview unavailable for this artifact type.
      </p>
    );
  if (artifact.kind === 'table') {
    try {
      const data: unknown = JSON.parse(artifact.content);
      if (
        !Array.isArray(data) ||
        data.length > 200 ||
        !data.every(
          (row) =>
            Array.isArray(row) &&
            row.length <= 20 &&
            row.every((cell) => typeof cell === 'string' || typeof cell === 'number'),
        )
      )
        throw new Error('Invalid table');
      const rows = data as (string | number)[][];
      return (
        <div
          className={s.tableScroll}
          data-variant={variant}
          tabIndex={0}
          role="region"
          aria-label={tableLabel ?? `${artifact.title} table`}
        >
          <table className={s.table}>
            <caption>
              {artifact.title} · version {artifact.version}
            </caption>
            <thead>
              <tr>
                {rows[0]?.map((cell, i) => (
                  <th scope="col" key={i}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } catch {
      return <p className={s.error}>This table is invalid or exceeds preview limits.</p>;
    }
  }
  return (
    <div {...rest} className={`${s.artifactPreview} ${className}`} data-variant={variant}>
      <p className={s.muted}>Version {artifact.version}</p>
      <pre className={s.document}>{artifact.content.slice(0, 20_000)}</pre>
      {artifact.content.length > 20_000 && <p className={s.muted}>Preview truncated.</p>}
    </div>
  );
}
