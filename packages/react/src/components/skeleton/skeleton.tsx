'use client';

import type { ComponentProps } from 'react';

import type { VariantProps } from '../../shared/variants.js';

import s from '../../shared/styles/styles.module.css';

export interface SkeletonProps
  extends Omit<ComponentProps<'div'>, 'children'>, VariantProps<'Skeleton'> {
  label?: string;
  lines?: number;
  shape?: 'text' | 'card' | 'avatar';
}

export function Skeleton({
  variant = 'shimmer',
  label = 'Loading content',
  lines = 3,
  shape = 'text',
  className = '',
  ...props
}: SkeletonProps) {
  const count = Number.isFinite(lines) ? Math.max(1, Math.min(8, Math.floor(lines))) : 3;
  return (
    <div
      {...props}
      role="status"
      className={`${s.skeleton} ${className}`}
      data-variant={variant}
      data-shape={shape}
    >
      <span className={s.srOnly}>{label}</span>
      <div aria-hidden="true" className={s.skeletonLayout}>
        {shape !== 'text' && <span className={s.skeletonAvatar} />}
        <div className={s.skeletonLines}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className={s.skeletonLine} />
          ))}
        </div>
      </div>
    </div>
  );
}
