import type { ComponentProps, ReactNode } from 'react';
import css from './data-marks.module.css';

export interface BarListItem {
  id: string;
  /** The row's name: a tool, a model, a page. */
  label: ReactNode;
  /** A measured, non-negative value. */
  value: number;
  /** The value as your app formats it, such as "1.2 M tokens". Defaults to the number. */
  display?: ReactNode;
}

export interface BarListProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Names the list for assistive technology. */
  label: string;
  /** Rows in the order to show them; sort them in your app. */
  items: readonly BarListItem[];
  /** The value that fills a bar; defaults to the largest value present. */
  max?: number;
  /** Optional column headings, such as ['Tool', 'Calls']. */
  headings?: readonly [ReactNode, ReactNode];
}

/**
 * Ranked rows with a bar behind each name, for where the tokens went or which tools ran most.
 * The bar repeats the printed value; it never stands in for it.
 */
export function BarList({ label, items, max, headings, className = '', ...props }: BarListProps) {
  const clean = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);
  const top =
    max !== undefined && Number.isFinite(max) && max > 0
      ? max
      : Math.max(1, ...items.map((item) => clean(item.value)));
  return (
    <div {...props} data-part="bar-list" className={`${css.barList} ${className}`}>
      {headings && (
        <div className={css.barListHead} aria-hidden="true">
          <span>{headings[0]}</span>
          <span>{headings[1]}</span>
        </div>
      )}
      <ul aria-label={label}>
        {items.map((item) => (
          <li key={item.id}>
            <span className={css.barListTrack}>
              <span
                className={css.barListFill}
                aria-hidden="true"
                data-fill=""
                style={{ inlineSize: `${Math.min(100, (clean(item.value) / top) * 100)}%` }}
              />
              <span className={css.barListLabel}>{item.label}</span>
            </span>
            <span className={css.barListValue}>
              {item.display ?? clean(item.value).toLocaleString('en-US')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
