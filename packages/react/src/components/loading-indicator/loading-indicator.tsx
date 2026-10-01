'use client';

import type { ComponentProps } from 'react';

import type { VariantProps } from '../../shared/variants.js';

import s from '../../shared/styles/styles.module.css';

import labels from '../../shared/styles/presentation-labels.module.css';

export interface LoadingIndicatorProps
  extends Omit<ComponentProps<'span'>, 'children'>, VariantProps<'LoadingIndicator'> {
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export function LoadingIndicator({
  variant = 'spinner',
  label = 'Loading',
  size = 'medium',
  className = '',
  ...props
}: LoadingIndicatorProps) {
  return (
    <span
      {...props}
      role="status"
      className={`${s.loading} ${labels.loading} ${className}`}
      data-variant={variant}
      data-size={size}
    >
      <span className={s.loadingVisual} aria-hidden="true">
        {variant === 'spinner' ? (
          <span className={s.loadingSpinner} />
        ) : (
          [0, 1, 2].map((i) => <span key={i} className={s.loadingMark} />)
        )}
      </span>
      <span>{label}</span>
    </span>
  );
}
