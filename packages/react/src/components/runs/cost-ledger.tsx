'use client';
import type { Measurement } from '@stackunseen/ui-core';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatMoney } from './shared.js';
import type { Money } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface CostLedgerRow {
  id: string;
  /** The run or step the cost belongs to. */
  title: string;
  agent?: string;
  model?: string;
  tokens?: Measurement<number>;
  cost: Measurement<Money>;
  href?: string;
}
export interface CostLedgerProps extends VariantProps<'CostLedger'> {
  rows: readonly CostLedgerRow[];
  /**
   * The host's own total, when it has one from billing. Without it the ledger adds up only the
   * measured rows and says how many rows were estimated or unknown instead of guessing.
   */
  total?: Measurement<Money>;
  /** The period or scope the rows cover, such as "Today" or "This run". */
  period?: string;
  onOpen?: (row: CostLedgerRow) => void;
  locale?: string;
  label?: string;
}

function sumMeasured(rows: readonly CostLedgerRow[], locale: string) {
  let amount = 0;
  let currency: string | undefined;
  let measured = 0;
  let estimated = 0;
  let unknown = 0;
  let mixed = false;
  for (const row of rows) {
    if (row.cost.kind === 'unknown') unknown += 1;
    else if (row.cost.kind === 'estimated') estimated += 1;
    else {
      measured += 1;
      if (currency && currency !== row.cost.value.currency) mixed = true;
      currency ??= row.cost.value.currency;
      amount += row.cost.value.amount;
    }
  }
  const text =
    measured && currency && !mixed ? formatMoney({ amount, currency }, locale) : undefined;
  return { text, measured, estimated, unknown, mixed };
}

/**
 * Where the money went, run by run, with each number's meaning kept. Measured and estimated
 * costs are never added together: the footer shows the measured sum and counts the rest, or the
 * host's own total when it supplies one.
 */
export function CostLedger({
  variant = 'table',
  rows,
  total,
  period,
  onOpen,
  locale = 'en-US',
  label = 'Cost ledger',
}: CostLedgerProps) {
  const sum = sumMeasured(rows, locale);
  const footer = total ? (
    <>
      <MeasuredText measurement={total} format={(value) => formatMoney(value, locale)} />
      <span className={s.muted}> reported by your billing</span>
    </>
  ) : sum.mixed ? (
    <span className={s.muted}>Rows use more than one currency; no total.</span>
  ) : (
    <>
      {sum.text ? (
        <>
          <span className={r.measure} data-meaning="measured">
            {sum.text}
          </span>
          <span className={s.muted}> measured across {sum.measured} of {rows.length}</span>
        </>
      ) : (
        <span className={s.muted}>Nothing measured yet</span>
      )}
      {(sum.estimated > 0 || sum.unknown > 0) && (
        <span className={s.muted}>
          {' · '}
          {[
            sum.estimated > 0 && `${sum.estimated} estimated`,
            sum.unknown > 0 && `${sum.unknown} unknown`,
          ]
            .filter(Boolean)
            .join(', ')}{' '}
          not included
        </span>
      )}
    </>
  );
  const title = (row: CostLedgerRow) =>
    onOpen ? (
      <button type="button" className={r.opener} onClick={() => onOpen(row)}>
        {row.title}
      </button>
    ) : row.href ? (
      <a href={row.href}>{row.title}</a>
    ) : (
      row.title
    );
  if (variant === 'compact')
    return (
      <section className={r.ledger} data-part="cost-ledger" data-variant={variant} aria-label={label}>
        <ul className={r.ledgerList}>
          {rows.map((row) => (
            <li key={row.id} className={r.ledgerRow}>
              <span className={r.ledgerTitle}>{title(row)}</span>
              <MeasuredText measurement={row.cost} format={(value) => formatMoney(value, locale)} />
            </li>
          ))}
        </ul>
        <p className={r.ledgerFooter}>{footer}</p>
      </section>
    );
  return (
    <section className={r.ledger} data-part="cost-ledger" data-variant={variant} aria-label={label}>
      <table className={r.compareTable}>
        <caption className={s.srOnly}>
          {label}
          {period ? `, ${period}` : ''}
        </caption>
        <thead>
          <tr>
            <th scope="col">Run</th>
            <th scope="col">Agent</th>
            <th scope="col">Model</th>
            <th scope="col" className={r.ledgerNumber}>
              Tokens
            </th>
            <th scope="col" className={r.ledgerNumber}>
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{title(row)}</th>
              <td>{row.agent ?? '—'}</td>
              <td>{row.model ?? '—'}</td>
              <td className={r.ledgerNumber}>
                <MeasuredText
                  measurement={row.tokens}
                  format={(value) => value.toLocaleString(locale)}
                  unknownLabel="—"
                />
              </td>
              <td className={r.ledgerNumber}>
                <MeasuredText measurement={row.cost} format={(value) => formatMoney(value, locale)} />
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className={s.muted}>
                No runs in this period.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4}>
              {period ? `Total, ${period}` : 'Total'}
            </th>
            <td className={r.ledgerNumber}>{footer}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
