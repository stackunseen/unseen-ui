'use client';
import { forwardRef, useId } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import s from '../../shared/styles/site-navigation.module.css';

export interface PaginationLabels {
  previous: string;
  next: string;
  page: (page: number) => string;
  summary: (page: number, pageCount: number) => string;
  unknownSummary: (page: number) => string;
  empty: string;
  invalid: string;
  morePages: string;
}

interface PaginationBaseProps extends Omit<
  ComponentPropsWithoutRef<'nav'>,
  'children' | 'onChange'
> {
  /** One-based, host-controlled page. Invalid host values are not silently clamped. */
  page: number;
  label?: string;
  labels?: Partial<PaginationLabels>;
  disabled?: boolean;
  /** Numbered neighbours; rendering stays bounded even for very large totals. */
  siblingCount?: 0 | 1 | 2;
}

type PaginationTotal =
  | { pageCount: number; hasNextPage?: never }
  | {
      pageCount?: undefined;
      /** Only explicit true enables Next when the total is unknown. */ hasNextPage?: boolean;
    };

type PaginationRouting =
  | {
      /** Real URLs retain native browser and modified-click behaviour. */ getPageHref: (
        page: number,
      ) => string;
      onPageChange?: never;
    }
  | {
      getPageHref?: never;
      /** A request only; the current page changes when the host updates page. */ onPageChange?: (
        page: number,
      ) => void;
    };

export type PaginationProps = PaginationBaseProps & PaginationTotal & PaginationRouting;

const defaultLabels: PaginationLabels = {
  previous: 'Previous page',
  next: 'Next page',
  page: (page) => `Page ${page}`,
  summary: (page, count) => `Page ${page} of ${count}`,
  unknownSummary: (page) => `Page ${page} · Total pages unknown`,
  empty: 'No pages',
  invalid: 'Page unavailable',
  morePages: 'More pages',
};

function pageItems(page: number, count: number, siblings: number) {
  const visible = new Set([1, count]);
  for (let n = Math.max(1, page - siblings); n <= Math.min(count, page + siblings); n++)
    visible.add(n);
  const sorted = [...visible].sort((a, b) => a - b);
  const items: Array<number | string> = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) items.push(`gap-${previous}`);
    items.push(n);
  });
  return items;
}

/** Small, controlled page navigation. Does not fetch, infer totals or own routing. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    page,
    pageCount,
    hasNextPage,
    label = 'Pagination',
    labels,
    disabled = false,
    siblingCount = 1,
    getPageHref,
    onPageChange,
    className = '',
    ...props
  },
  ref,
) {
  const statusId = useId();
  const text = { ...defaultLabels, ...labels };
  const known = pageCount !== undefined;
  const countValid = !known || (Number.isSafeInteger(pageCount) && pageCount >= 0);
  const empty = countValid && pageCount === 0;
  const valid =
    countValid &&
    Number.isSafeInteger(page) &&
    page >= 1 &&
    (empty ? page === 1 : !known || page <= pageCount);
  const enabled = valid && !empty && !disabled && !!(getPageHref || onPageChange);
  const siblings = siblingCount === 0 || siblingCount === 2 ? siblingCount : 1;
  const items = valid && !empty && known ? pageItems(page, pageCount, siblings) : [];
  const previousEnabled = enabled && page > 1;
  const nextEnabled =
    enabled && page < Number.MAX_SAFE_INTEGER && (known ? page < pageCount : hasNextPage === true);
  const summary = !valid
    ? text.invalid
    : empty
      ? text.empty
      : known
        ? text.summary(page, pageCount)
        : text.unknownSummary(page);

  function control(
    target: number,
    name: string,
    available: boolean,
    current = false,
    children: string | number = name,
  ) {
    const common = {
      className: s.pageControl,
      'aria-label': name,
      'aria-current': current ? ('page' as const) : undefined,
    };
    if (getPageHref) {
      return (
        <a
          {...common}
          href={available ? getPageHref(target) : undefined}
          role="link"
          aria-disabled={!available || undefined}
          tabIndex={available ? undefined : -1}
          onClick={(event) => {
            if (!available) event.preventDefault();
          }}
        >
          {children}
        </a>
      );
    }
    return (
      <button
        {...common}
        type="button"
        disabled={!available}
        onClick={() => {
          if (available && !current) onPageChange?.(target);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <nav
      {...props}
      ref={ref}
      aria-label={props['aria-label'] ?? label}
      aria-describedby={[props['aria-describedby'], statusId].filter(Boolean).join(' ')}
      className={`${s.root} ${s.pagination} ${className}`}
      data-part="pagination"
    >
      <p id={statusId} role="status" aria-atomic="true" className={s.pageSummary}>
        {summary}
      </p>
      <ul className={s.pages}>
        <li>{control(page - 1, text.previous, previousEnabled)}</li>
        {items.map((item) => (
          <li key={item}>
            {typeof item === 'number' ? (
              control(item, text.page(item), enabled, item === page, item)
            ) : (
              <span className={s.gap}>
                <span aria-hidden="true">…</span>
                <span className={s.srOnly}>{text.morePages}</span>
              </span>
            )}
          </li>
        ))}
        <li>{control(page + 1, text.next, nextEnabled)}</li>
      </ul>
    </nav>
  );
});
