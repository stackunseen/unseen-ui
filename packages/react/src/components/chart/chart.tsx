'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DataTable } from '../data-table/data-table.js';
import { Accordion } from '../accordion/accordion.js';
import { Button } from '../button/button.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { inspectChart, chartRuns } from './chart-model.js';
import type { ChartPoint, ChartSeries } from './chart-model.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import c from '../../shared/styles/coding.module.css';
import g from '../../shared/styles/structured.module.css';
import css from './chart.module.css';

export type { ChartPoint, ChartDatum, ChartSeries } from './chart-model.js';
export interface ChartProps extends VariantProps<'Chart'> {
  title: string;
  /** Supply points OR aligned series. Null samples in series are explicitly unreported. */
  points?: readonly ChartPoint[];
  series?: readonly ChartSeries[];
  unit: string;
  source: string;
  asOf?: string;
  state?:
    'ready' | 'streaming' | 'stale' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown';
  error?: string;
  locale?: string;
  numberFormat?: Intl.NumberFormatOptions;
  /** Trusted application callback returning bounded inert text. */
  formatValue?: (value: number) => string;
  hiddenSeries?: readonly string[];
  onSeriesVisibilityChange?: (hiddenIds: readonly string[]) => void;
  showLegend?: boolean;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
const colors = [
  'var(--ai-primary-text)',
  'var(--ai-secondary-text)',
  'var(--ai-text)',
  'var(--ai-muted)',
];
const dashes = ['', '8 4', '2 4', '8 3 2 3'];
const cues = ['solid / circle', 'striped / square', 'dotted / triangle', 'crossed / diamond'];
function marker(index: number, x: number, y: number, color: string) {
  const common = { fill: color, stroke: color, 'data-marker': index };
  if (index === 1) return <rect {...common} x={x - 4} y={y - 4} width={8} height={8} />;
  if (index === 2)
    return <path {...common} d={`M${x},${y - 5} L${x + 5},${y + 4} L${x - 5},${y + 4} Z`} />;
  if (index === 3)
    return <path {...common} d={`M${x},${y - 5} L${x + 5},${y} L${x},${y + 5} L${x - 5},${y} Z`} />;
  return <circle {...common} cx={x} cy={y} r={4} />;
}
function pattern(id: string, index: number, color: string) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={8} height={8}>
      <rect width={8} height={8} fill={color} opacity={index ? 0.12 : 1} />
      {index === 1 && <path d="M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6" stroke={color} />}
      {index === 2 && <circle cx={4} cy={4} r={1.5} fill={color} />}
      {index === 3 && <path d="M4,0 V8 M0,4 H8" stroke={color} />}
    </pattern>
  );
}
const clip = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
const readoutKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
function moveReadout(
  current: { series: number; category: number } | null,
  key: string,
  seriesIndexes: readonly number[],
  categoryCount: number,
) {
  const first = seriesIndexes[0];
  if (first === undefined || categoryCount < 1 || !readoutKeys.has(key)) return null;
  if (!current || !seriesIndexes.includes(current.series) || current.category >= categoryCount)
    return { series: first, category: key === 'End' ? categoryCount - 1 : 0 };
  const at = seriesIndexes.indexOf(current.series);
  if (key === 'ArrowRight')
    return { series: current.series, category: Math.min(categoryCount - 1, current.category + 1) };
  if (key === 'ArrowLeft')
    return { series: current.series, category: Math.max(0, current.category - 1) };
  if (key === 'Home') return { series: current.series, category: 0 };
  if (key === 'End') return { series: current.series, category: categoryCount - 1 };
  if (key === 'ArrowDown')
    return {
      series: seriesIndexes[Math.min(seriesIndexes.length - 1, at + 1)]!,
      category: current.category,
    };
  return { series: seriesIndexes[Math.max(0, at - 1)]!, category: current.category };
}
export function Chart({
  title,
  points,
  series,
  unit,
  source,
  asOf,
  state = 'ready',
  error,
  locale: localeProp,
  numberFormat,
  formatValue,
  hiddenSeries = [],
  onSeriesVisibilityChange,
  showLegend,
  variant = 'bar',
  className = '',
}: ChartProps) {
  const locale = useLocale(localeProp);
  const prefix = `chart-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // The plot is drawn at the width of its container, so it fills a card instead of scrolling
  // inside it. It scrolls only when the categories need more room than the container has.
  const [available, setAvailable] = useState<number | null>(null);
  const [readout, setReadout] = useState<{ series: number; category: number } | null>(null);
  const pointerReadout = useRef(false);
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const update = () => setAvailable(Math.floor(node.clientWidth) || null);
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  const heading = typeof title === 'string' ? title.slice(0, 2000) : 'Chart';
  const measurement =
    typeof unit === 'string' && unit.trim() ? unit.slice(0, 200) : 'Unit not supplied';
  const frame = (content: ReactNode) => (
    <div
      className={`${g.root} ${className}`}
      data-part="chart"
      data-variant={variant}
      data-state={state}
    >
      <strong>{heading}</strong>
      {content}
    </div>
  );
  if (state === 'loading') return frame(<LoadingIndicator label="Loading chart" />);
  if (!['ready', 'streaming', 'stale', 'denied', 'unavailable', 'error'].includes(state))
    return frame(
      <p role="status" className={g.error}>
        Chart data isn’t available. Try loading it again.
      </p>,
    );
  if (['denied', 'unavailable', 'error'].includes(state))
    return frame(
      <p role="status" className={g.error}>
        {state === 'denied'
          ? 'Chart access denied.'
          : state === 'unavailable'
            ? 'Chart unavailable.'
            : typeof error === 'string' && error.trim()
              ? error.slice(0, 1000)
              : 'Chart failed to load.'}
      </p>,
    );
  const model = inspectChart(points, series, measurement);
  if (!model)
    return frame(
      <p role="status" className={g.error}>
        Chart requires finite values, unique aligned categories and one dataset: up to four series,
        with no more than 60 points each.
      </p>,
    );
  if (
    !Array.isArray(hiddenSeries) ||
    hiddenSeries.length > 4 ||
    new Set(hiddenSeries).size !== hiddenSeries.length ||
    hiddenSeries.some((id) => !model.groups.some((group) => group.id === id))
  )
    return frame(
      <p role="status" className={g.error}>
        Chart series selection is invalid or obsolete.
      </p>,
    );
  let formattingFallback = false;
  let normal: Intl.NumberFormat, scientific: Intl.NumberFormat;
  try {
    if (!Intl.NumberFormat.supportedLocalesOf([locale]).length)
      throw new Error('Unsupported locale');
    normal = new Intl.NumberFormat(locale, numberFormat ?? { maximumSignificantDigits: 15 });
    scientific = new Intl.NumberFormat(locale, {
      maximumSignificantDigits: 15,
      ...numberFormat,
      notation: 'scientific',
    });
  } catch {
    formattingFallback = true;
    normal = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 15 });
    scientific = new Intl.NumberFormat('en-US', {
      maximumSignificantDigits: 15,
      notation: 'scientific',
    });
  }
  const middle = ((model.min / model.scale + model.max / model.scale) / 2) * model.scale;
  const ticks = [...new Set([model.min, middle, model.max])];
  const formatted = new Map<number, string>();
  for (const value of new Set([...model.values, ...ticks])) {
    let custom: string | undefined;
    if (formatValue) {
      try {
        const result = formatValue(value);
        if (typeof result === 'string' && result.trim() && result.length <= 2000) custom = result;
        else formattingFallback = true;
      } catch {
        formattingFallback = true;
      }
    }
    const extreme = value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e12);
    formatted.set(
      value,
      custom ?? (extreme && !numberFormat?.notation ? scientific : normal).format(value),
    );
  }
  const visible = model.groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => !hiddenSeries.includes(group.id));
  const needed = Math.max(
    320,
    model.categories.length * (variant === 'bar' ? visible.length * 14 + 30 : 36) + 112,
  );
  const width = available !== null && available > needed ? available : needed;
  const overflowing = available !== null && needed > available;
  const left = 84,
    right = width - 28,
    top = 24,
    bottom = 188;
  const range = model.max / model.scale - model.min / model.scale;
  const y = (value: number) =>
    range
      ? bottom - ((value / model.scale - model.min / model.scale) / range) * (bottom - top)
      : (bottom + top) / 2;
  const slot = (right - left) / Math.max(1, model.categories.length);
  const x = (index: number) => left + slot * (index + 0.5);
  const linePath = (run: ReturnType<typeof chartRuns>[number]) =>
    run
      .map(({ point, index: category }, n) => `${n ? 'L' : 'M'}${x(category)},${y(point.value)}`)
      .join(' ');
  const missing = model.groups.reduce(
    (total, group) => total + group.points.filter((point) => point.value === null).length,
    0,
  );
  const numericVisible = visible.some(({ group }) =>
    group.points.some((point) => point.value !== null),
  );
  const legend =
    showLegend ??
    (series !== undefined || Boolean(onSeriesVisibilityChange) || hiddenSeries.length > 0);
  const seriesIndexes = visible.map((item) => item.index);
  const activeGroup = readout ? visible.find((item) => item.index === readout.series) : undefined;
  const activePoint = activeGroup?.group.points[readout!.category];
  const readoutText =
    activeGroup && activePoint
      ? activePoint.value === null
        ? `${activePoint.label}: Not reported`
        : visible.length === 1
          ? `${activePoint.label}: ${formatted.get(activePoint.value)} ${measurement}`
          : `${activeGroup.group.label}, ${activePoint.label}: ${formatted.get(activePoint.value)} ${measurement}`
      : null;
  const mark = (seriesIndex: number, categoryIndex: number) => ({
    'data-point': `${seriesIndex}:${categoryIndex}`,
    'data-active':
      readout?.series === seriesIndex && readout.category === categoryIndex ? 'true' : undefined,
    onMouseEnter: () => {
      pointerReadout.current = true;
      setReadout({ series: seriesIndex, category: categoryIndex });
    },
    onClick: () => {
      pointerReadout.current = false;
      setReadout({ series: seriesIndex, category: categoryIndex });
    },
  });
  return frame(
    <>
      <p className={s.muted}>
        {measurement} · Source:{' '}
        {typeof source === 'string' && source.trim() ? source.slice(0, 2000) : 'Not supplied'}
        {typeof asOf === 'string' && asOf.trim() ? ` · As of: ${asOf.slice(0, 200)}` : ''}
      </p>
      {state === 'streaming' && (
        <p role="status" className={s.muted}>
          Receiving chart data. Values are provisional; series selection is paused.
        </p>
      )}
      {state === 'stale' && (
        <p role="status" className={s.muted}>
          Historical chart snapshot. Current values have not been confirmed.
        </p>
      )}
      {formattingFallback && (
        <p role="status" className={s.muted}>
          Chart formatting unavailable; default number formatting used for affected values.
        </p>
      )}
      {legend && (
        <ul className={css.legend} aria-label="Chart series">
          {model.groups.map((group, index) => {
            const hidden = hiddenSeries.includes(group.id);
            const swatch = (
              <svg className={css.swatch} viewBox="0 0 32 20" aria-hidden="true">
                <defs>{pattern(`${prefix}-legend-${index}`, index, colors[index]!)}</defs>
                {variant === 'bar' ? (
                  <rect
                    x={2}
                    y={3}
                    width={28}
                    height={14}
                    fill={`url(#${prefix}-legend-${index})`}
                    stroke={colors[index]}
                  />
                ) : (
                  <>
                    <line
                      x1={1}
                      y1={10}
                      x2={31}
                      y2={10}
                      stroke={colors[index]}
                      strokeWidth={2}
                      strokeDasharray={dashes[index]}
                    />
                    {marker(index, 16, 10, colors[index]!)}
                  </>
                )}
              </svg>
            );
            const label = (
              <>
                {swatch}
                <span>
                  {group.label} <span className={css.summary}>({cues[index]})</span>
                </span>
              </>
            );
            return (
              <li key={group.id}>
                {onSeriesVisibilityChange ? (
                  <Button
                    variant="ghost"
                    aria-pressed={!hidden}
                    disabled={state === 'streaming'}
                    onClick={() =>
                      onSeriesVisibilityChange(
                        hidden
                          ? hiddenSeries.filter((id) => id !== group.id)
                          : [...hiddenSeries, group.id],
                      )
                    }
                  >
                    {label}
                  </Button>
                ) : (
                  <>
                    {label}
                    {hidden && <span className={css.summary}>Hidden</span>}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!model.categories.length ? (
        <p className={s.muted}>No chart data reported.</p>
      ) : !visible.length ? (
        <p className={s.muted}>No series selected. Original values remain in Chart data.</p>
      ) : !numericVisible ? (
        <p className={s.muted}>No numeric chart values reported.</p>
      ) : (
        <div
          onMouseLeave={() => {
            if (!pointerReadout.current) return;
            pointerReadout.current = false;
            setReadout(null);
          }}
        >
          <div
            ref={measure}
            className={`${c.scroll} ${css.plotFrame}`}
            role="group"
            aria-label={`${heading} chart`}
            tabIndex={0}
            onKeyDown={(event) => {
              if (!readoutKeys.has(event.key)) return;
              event.preventDefault();
              const next = moveReadout(readout, event.key, seriesIndexes, model.categories.length);
              if (
                !next ||
                (readout && next.series === readout.series && next.category === readout.category)
              )
                return;
              pointerReadout.current = false;
              setReadout(next);
            }}
          >
            <svg
              className={css.plot}
              width={width}
              viewBox={`0 0 ${width} 280`}
              role="img"
              aria-label={`${heading}. ${measurement}. ${visible.length} visible series. Equivalent values are in the data table.`}
            >
              <defs>
                {visible.map(({ index }) => (
                  <g key={index}>{pattern(`${prefix}-plot-${index}`, index, colors[index]!)}</g>
                ))}
              </defs>
              {ticks.map((value) => (
                <g key={value}>
                  <line className={css.grid} x1={left} y1={y(value)} x2={right} y2={y(value)} />
                  <text x={left - 8} y={y(value) + 4} textAnchor="end">
                    <title>{formatted.get(value)}</title>
                    {clip(formatted.get(value)!, 11)}
                  </text>
                </g>
              ))}
              {variant === 'area' &&
                visible.map(({ group, index }) => (
                  <g key={group.id} data-series-area={group.id}>
                    {chartRuns(group.points).map((run, n) => (
                      <path
                        key={n}
                        d={`${linePath(run)} L${x(run.at(-1)!.index)},${y(0)} L${x(run[0]!.index)},${y(0)} Z`}
                        fill={`url(#${prefix}-plot-${index})`}
                        opacity={0.2}
                      />
                    ))}
                  </g>
                ))}
              <line className={css.baseline} x1={left} y1={y(0)} x2={right} y2={y(0)} />
              {visible.map(({ group, index }, position) => (
                <g key={group.id} data-series-id={group.id} data-encoding={cues[index]}>
                  {variant === 'bar'
                    ? group.points.map((point, category) => {
                        if (point.value === null) return null;
                        const barWidth = Math.max(3, (slot - 12) / visible.length - 3);
                        const barX =
                          left + slot * category + 6 + position * ((slot - 12) / visible.length);
                        return (
                          <g
                            key={model.key(point)}
                            data-value={point.value}
                            {...mark(index, category)}
                          >
                            <title>{`${group.label}, ${point.label}: ${formatted.get(point.value)} ${measurement}`}</title>
                            {point.value === 0 ? (
                              <line
                                x1={barX}
                                y1={y(0)}
                                x2={barX + barWidth}
                                y2={y(0)}
                                stroke={colors[index]}
                                strokeWidth={2}
                              />
                            ) : (
                              <rect
                                x={barX}
                                y={Math.min(y(0), y(point.value))}
                                width={barWidth}
                                height={Math.abs(y(point.value) - y(0))}
                                fill={`url(#${prefix}-plot-${index})`}
                                stroke={colors[index]}
                              />
                            )}
                          </g>
                        );
                      })
                    : chartRuns(group.points).map((run, runIndex) => {
                        const path = linePath(run);
                        return (
                          <g key={runIndex} data-run={runIndex}>
                            <path
                              data-line="true"
                              d={path}
                              fill="none"
                              stroke={colors[index]}
                              strokeWidth={2}
                              strokeDasharray={dashes[index]}
                            />
                            {run.map(({ point, index: category }) => (
                              <g
                                key={model.key(point)}
                                data-value={point.value}
                                {...mark(index, category)}
                              >
                                <title>{`${group.label}, ${point.label}: ${formatted.get(point.value)} ${measurement}`}</title>
                                {marker(index, x(category), y(point.value), colors[index]!)}
                              </g>
                            ))}
                          </g>
                        );
                      })}
                </g>
              ))}
              {model.categories.map((point, index) => (
                <text
                  key={model.key(point)}
                  x={x(index)}
                  y={210}
                  textAnchor="end"
                  transform={`rotate(-35 ${x(index)} 210)`}
                >
                  <title>{point.label}</title>
                  {clip(point.label, 16)}
                </text>
              ))}
            </svg>
            <span className={s.srOnly}>Arrow keys read one value at a time.</span>
          </div>
          {readoutText && (
            <p className={css.readout} aria-live="polite" data-part="chart-readout">
              {readoutText}
            </p>
          )}
        </div>
      )}
      {missing > 0 && (
        <p className={css.summary}>
          {missing} sample{missing === 1 ? '' : 's'} not reported. Gaps are not interpolated or
          treated as zero.
        </p>
      )}
      {(overflowing || hiddenSeries.length > 0) && (
        <p className={s.muted}>
          {overflowing ? 'Scroll sideways to see every value, or open Chart data.' : ''}
          {overflowing && hiddenSeries.length ? ' ' : ''}
          {hiddenSeries.length ? 'Legend selection affects the plot only.' : ''}
        </p>
      )}
      <Accordion
        region={false}
        type="single"
        collapsible
        items={[
          {
            value: 'data',
            title: 'Chart data',
            content: (
              <DataTable
                caption={`${heading}: ${measurement}`}
                columns={[
                  { id: 'label', label: 'Label' },
                  ...model.groups.map((group) => ({
                    id: `value-${group.id}`,
                    label: series === undefined ? measurement : `${group.label} (${measurement})`,
                  })),
                ]}
                rows={model.categories.map((point, index) => ({
                  id: model.key(point),
                  cells: {
                    label: point.label,
                    ...Object.fromEntries(
                      model.groups.map((group) => [
                        `value-${group.id}`,
                        group.points[index]!.value,
                      ]),
                    ),
                  },
                }))}
                formatCell={(value) =>
                  value === null
                    ? 'Not reported'
                    : typeof value === 'number'
                      ? formatted.get(value)!
                      : String(value)
                }
              />
            ),
          },
        ]}
      />
    </>,
  );
}
