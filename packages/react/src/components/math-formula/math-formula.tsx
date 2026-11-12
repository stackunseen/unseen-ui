'use client';
import { useMemo } from 'react';
import katex from 'katex';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/rich-markdown.module.css';

export interface MathFormulaProps extends VariantProps<'MathFormula'> {
  formula: string;
  label?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
export function MathFormula({
  formula,
  label,
  variant = 'block',
  className = '',
}: MathFormulaProps) {
  const result = useMemo(() => {
    if (formula.length > 10000)
      return { error: 'Formula exceeds the 10,000-character preview limit.' };
    try {
      return {
        html: katex.renderToString(formula, {
          displayMode: variant !== 'inline',
          throwOnError: true,
          trust: false,
          strict: 'error',
          maxExpand: 500,
          maxSize: 10,
          output: 'htmlAndMathml',
        }),
      };
    } catch {
      return { error: 'Unable to render this formula.' };
    }
  }, [formula, variant]);
  if (result.error)
    return (
      <span
        className={`${s.formulaError} ${className}`}
        data-part="math-formula"
        data-variant={variant}
      >
        <span className={s.error} role="status">
          {result.error}
        </span>
        <code className={s.formulaSource} role="group" aria-label="Formula source" tabIndex={0}>
          {formula.slice(0, 2000)}
        </code>
        {formula.length > 2000 && (
          <span className={s.muted}>Source preview limited to 2,000 characters.</span>
        )}
      </span>
    );
  return (
    <span
      className={`${s.formula} ${className}`}
      data-part="math-formula"
      data-variant={variant}
      style={{ display: variant === 'inline' ? 'inline-block' : 'block' }}
      tabIndex={0}
      role="group"
      aria-label={label ?? 'Mathematical formula'}
      dangerouslySetInnerHTML={{ __html: result.html! }}
    />
  );
}
