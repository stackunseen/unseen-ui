'use client';
import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';

export function Panel({ className = '', ...props }: ComponentProps<'section'>) {
  return <section {...props} className={`${s.panel} ${className}`} />;
}
