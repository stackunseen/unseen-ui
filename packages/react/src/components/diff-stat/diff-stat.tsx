import { useLocale } from '../../providers/locale/locale.js';
import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';
import css from './diff-stat.module.css';

export interface DiffStatProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Lines added, as the host counted them. */
  added: number;
  /** Lines removed. */
  removed: number;
  /** Files changed, when known. */
  files?: number;
  /** Five squares in proportion, as code hosts show beside a change. */
  blocks?: boolean;
}

const count = (value: number) => (Number.isFinite(value) && value >= 0 ? Math.round(value) : 0);
const plural = (n: number, one: string, many: string, locale: string) =>
  `${n.toLocaleString(locale)} ${n === 1 ? one : many}`;

/**
 * "+15 −1" for a change, coloured and readable without colour: the signs are in the text and a
 * screen reader hears "15 lines added, 1 removed".
 */
export function DiffStat({
  added,
  removed,
  files,
  blocks = false,
  className = '',
  ...props
}: DiffStatProps) {
  const locale = useLocale();
  const plus = count(added);
  const minus = count(removed);
  const total = plus + minus;
  const green = total ? Math.round((plus / total) * 5) : 0;
  const red = total ? Math.min(5 - green, Math.round((minus / total) * 5)) : 0;
  const spoken = [
    files === undefined ? undefined : plural(count(files), 'file', 'files', locale),
    `${plural(plus, 'line', 'lines', locale)} added`,
    `${minus.toLocaleString(locale)} removed`,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <span {...props} data-part="diff-stat" className={`${css.root} ${className}`}>
      <span className={s.srOnly}>{spoken}</span>
      <span aria-hidden="true" className={css.figures}>
        {files !== undefined && <span>{plural(count(files), 'file', 'files', locale)}</span>}
        <span className={css.added}>+{plus.toLocaleString(locale)}</span>
        <span className={css.removed}>−{minus.toLocaleString(locale)}</span>
        {blocks && (
          <span className={css.blocks}>
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                data-kind={index < green ? 'added' : index < green + red ? 'removed' : 'neutral'}
              />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
