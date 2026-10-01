import { z } from 'zod';
import { boundedData } from '../../shared/bounded-data.js';

export interface ChartPoint {
  id?: string;
  label: string;
  value: number;
}
export interface ChartDatum {
  id?: string;
  label: string;
  value: number | null;
}
export interface ChartSeries {
  id: string;
  label: string;
  points: readonly ChartDatum[];
}
const identifier = z
  .string()
  .max(80)
  .refine(
    (value) =>
      Boolean(value.trim()) &&
      !['__proto__', 'constructor', 'prototype'].includes(value) &&
      !/\p{Surrogate}/u.test(value),
  );
const label = z
  .string()
  .max(200)
  .refine((value) => Boolean(value.trim()));
export const chartPointSchema = z
  .object({ id: identifier.optional(), label, value: z.number().finite() })
  .strict();
export const chartDatumSchema = z
  .object({ id: identifier.optional(), label, value: z.number().finite().nullable() })
  .strict();
export const chartSeriesSchema = z
  .object({ id: identifier, label, points: z.array(chartDatumSchema).max(60) })
  .strict();
export function inspectChart(
  points: readonly ChartPoint[] | undefined,
  series: readonly ChartSeries[] | undefined,
  unit: string,
) {
  if ((points === undefined) === (series === undefined) || !boundedData({ points, series }))
    return undefined;
  const normalized =
    points !== undefined
      ? z.array(chartPointSchema).max(60).safeParse(points)
      : z.array(chartSeriesSchema).min(1).max(4).safeParse(series);
  if (!normalized.success) return undefined;
  const groups: ChartSeries[] =
    points !== undefined
      ? [{ id: 'legacy', label: unit || 'Value', points: normalized.data as ChartPoint[] }]
      : (normalized.data as ChartSeries[]);
  if (new Set(groups.map((group) => group.id)).size !== groups.length) return undefined;
  const categories = groups[0]!.points;
  const key = (point: ChartDatum) => point.id ?? point.label;
  if (
    new Set(categories.map(key)).size !== categories.length ||
    groups.some(
      (group) =>
        group.points.length !== categories.length ||
        group.points.some(
          (point, index) =>
            key(point) !== key(categories[index]!) || point.label !== categories[index]!.label,
        ),
    )
  )
    return undefined;
  const values = groups.flatMap((group) =>
    group.points.flatMap((point) => (point.value === null ? [] : [point.value])),
  );
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values),
    scale = Math.max(Math.abs(min), Math.abs(max)) || 1;
  return { groups, categories, values, min, max, scale, key };
}
/** Split missing samples, preserving their original category positions. */
export function chartRuns(points: readonly ChartDatum[]) {
  const runs: { index: number; point: ChartDatum & { value: number } }[][] = [];
  let current: (typeof runs)[number] = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) runs.push(current);
      current = [];
    } else current.push({ index, point: { ...point, value: point.value } });
  });
  if (current.length) runs.push(current);
  return runs;
}
