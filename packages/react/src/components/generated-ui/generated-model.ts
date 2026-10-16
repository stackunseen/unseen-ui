import { boundedData as boundedGeneratedData } from '../../shared/bounded-data.js';
export { boundedData as boundedGeneratedData } from '../../shared/bounded-data.js';
import { z } from 'zod';
import { arraySchema, fieldSchema, inspectFormSchema, stepSchema } from '../ai-form/form-model.js';
import type { AIField, AIFieldArray, AIFormStep } from '../ai-form/form-model.js';
import { chartPointSchema, chartSeriesSchema, inspectChart } from '../chart/chart-model.js';
import type { ChartPoint, ChartSeries } from '../chart/chart-model.js';

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
const text = z.string().max(10000);
function httpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
    );
  } catch {
    return false;
  }
}
/** The image's origin, if the host listed it; generated images load from nowhere else. */
export function approvedImageOrigin(src: string, origins: readonly string[] | undefined) {
  if (!Array.isArray(origins) || origins.length > 64) return undefined;
  try {
    const origin = new URL(src).origin;
    return origins.some((item) => typeof item === 'string' && item === origin) ? origin : undefined;
  } catch {
    return undefined;
  }
}
export type GeneratedNode =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'metric'; label: string; value: string }
  | { id: string; type: 'action'; label: string; actionId: string; disabledReason?: string }
  | {
      id: string;
      type: 'table';
      caption: string;
      columns: { id: string; label: string }[];
      rows: { id: string; cells: Record<string, string | number | boolean | null> }[];
    }
  | {
      id: string;
      type: 'chart';
      title: string;
      unit: string;
      source: string;
      points?: ChartPoint[];
      series?: ChartSeries[];
      asOf?: string;
      locale?: string;
    }
  | {
      id: string;
      type: 'form';
      title: string;
      actionId: string;
      fields: AIField[];
      arrays?: AIFieldArray[];
      steps?: AIFormStep[];
    }
  | { id: string; type: 'list'; items: string[]; ordered?: boolean }
  | { id: string; type: 'callout'; tone: GeneratedCalloutTone; title: string; text?: string }
  | {
      id: string;
      type: 'options';
      label: string;
      actionId: string;
      choices: { value: string; label: string; description?: string }[];
      disabledReason?: string;
    }
  | {
      id: string;
      type: 'steps';
      title: string;
      steps: { id: string; label: string; state: 'done' | 'current' | 'upcoming' }[];
    }
  | { id: string; type: 'image'; src: string; alt: string; caption?: string }
  | { id: string; type: 'metricGroup'; title: string; metrics: { label: string; value: string }[] }
  | {
      id: string;
      type: 'section';
      title: string;
      description?: string;
      layout?: 'stack' | 'grid';
      nodes: GeneratedNode[];
    };
/** No success tone: a generated surface cannot report an outcome the host has not confirmed. */
export type GeneratedCalloutTone = 'info' | 'warning' | 'danger';
export interface GeneratedSurface {
  id: string;
  version: string;
  nodes: GeneratedNode[];
}

/** Trusted host styling; generated surface nodes cannot supply action emphasis. */
export interface GeneratedActionPresentation {
  surfaceId: string;
  version: string;
  actionId: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}
const actionPresentationSchema = z
  .object({
    surfaceId: identifier,
    version: identifier,
    actionId: identifier,
    variant: z.enum(['primary', 'secondary', 'outline', 'ghost', 'danger']),
  })
  .strict();

export function inspectGeneratedActionPresentations(
  value: unknown,
): GeneratedActionPresentation[] | undefined {
  if (!boundedGeneratedData(value)) return undefined;
  const parsed = z.array(actionPresentationSchema).max(64).safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

const nodeSchema: z.ZodType<GeneratedNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ id: identifier, type: z.literal('text'), text }).strict(),
    z
      .object({ id: identifier, type: z.literal('metric'), label, value: z.string().max(200) })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('action'),
        label,
        actionId: identifier,
        disabledReason: label.optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('table'),
        caption: label,
        columns: z
          .array(z.object({ id: identifier, label }).strict())
          .min(1)
          .max(20),
        rows: z
          .array(
            z
              .object({
                id: identifier,
                cells: z.record(
                  identifier,
                  z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.null()]),
                ),
              })
              .strict(),
          )
          .max(100),
      })
      .strict()
      .refine((table) => {
        const columns = new Set(table.columns.map((column) => column.id));
        return (
          columns.size === table.columns.length &&
          new Set(table.rows.map((row) => row.id)).size === table.rows.length &&
          table.rows.every((row) => Object.keys(row.cells).every((key) => columns.has(key)))
        );
      }),
    z
      .object({
        id: identifier,
        type: z.literal('chart'),
        title: label,
        unit: label,
        source: z.string().max(200),
        points: z.array(chartPointSchema).max(60).optional(),
        series: z.array(chartSeriesSchema).min(1).max(4).optional(),
        asOf: z.string().max(200).optional(),
        locale: z.string().max(80).optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('form'),
        title: label,
        actionId: identifier,
        fields: z.array(fieldSchema).max(50),
        arrays: z.array(arraySchema).max(10).optional(),
        steps: z.array(stepSchema).max(10).optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('list'),
        items: z.array(z.string().max(2000)).min(1).max(50),
        ordered: z.boolean().optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('callout'),
        tone: z.enum(['info', 'warning', 'danger']),
        title: label,
        text: z.string().max(2000).optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('options'),
        label,
        actionId: identifier,
        choices: z
          .array(
            z
              .object({ value: identifier, label, description: z.string().max(500).optional() })
              .strict(),
          )
          .min(2)
          .max(12)
          .refine(
            (choices) => new Set(choices.map((choice) => choice.value)).size === choices.length,
          ),
        disabledReason: label.optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('steps'),
        title: label,
        steps: z
          .array(
            z
              .object({
                id: identifier,
                label,
                state: z.enum(['done', 'current', 'upcoming']),
              })
              .strict(),
          )
          .min(1)
          .max(20)
          .refine(
            (steps) =>
              new Set(steps.map((step) => step.id)).size === steps.length &&
              steps.filter((step) => step.state === 'current').length <= 1,
          ),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('image'),
        src: z.string().max(2000).refine(httpUrl),
        alt: label,
        caption: z.string().max(500).optional(),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('metricGroup'),
        title: label,
        metrics: z
          .array(z.object({ label, value: z.string().max(200) }).strict())
          .min(1)
          .max(8),
      })
      .strict(),
    z
      .object({
        id: identifier,
        type: z.literal('section'),
        title: label,
        description: z.string().max(2000).optional(),
        layout: z.enum(['stack', 'grid']).optional(),
        nodes: z.array(nodeSchema).max(64),
      })
      .strict(),
  ]),
);
const surfaceSchema = z
  .object({ id: identifier, version: identifier, nodes: z.array(nodeSchema).max(64) })
  .strict();

export function inspectGeneratedSurface(value: unknown): GeneratedSurface | undefined {
  if (!boundedGeneratedData(value)) return undefined;
  const parsed = surfaceSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const surface = parsed.data;
  const ids = new Set<string>(),
    actions = new Set<string>();
  let nodes = 0,
    cells = 0,
    rows = 0,
    controls = 0,
    points = 0;
  function inspect(items: GeneratedNode[], depth: number): boolean {
    if (depth > 3) return false;
    return items.every((node) => {
      if (++nodes > 64 || ids.has(node.id)) return false;
      ids.add(node.id);
      if (node.type === 'action' || node.type === 'form' || node.type === 'options') {
        if (actions.has(node.actionId)) return false;
        actions.add(node.actionId);
      }
      if (node.type === 'section') return inspect(node.nodes, depth + 1);
      if (node.type === 'table') {
        rows += node.rows.length;
        cells += node.rows.length * node.columns.length;
        if (rows > 200 || cells > 2000) return false;
      }
      if (node.type === 'chart') {
        const chart = inspectChart(node.points, node.series, node.unit);
        if (!chart) return false;
        points += chart.groups.reduce((sum, group) => sum + group.points.length, 0);
        if (points > 120) return false;
      }
      if (node.type === 'form') {
        if (
          inspectFormSchema(node.fields, node.arrays ?? [], node.steps, {
            formId: node.id,
            schemaVersion: surface.version,
          })
        )
          return false;
        controls +=
          node.fields.length +
          (node.arrays ?? []).reduce(
            (sum, array) => sum + array.fields.length * (array.maxItems ?? 20),
            0,
          );
        if (controls > 200) return false;
      }
      return true;
    });
  }
  return inspect(surface.nodes, 0) ? surface : undefined;
}
