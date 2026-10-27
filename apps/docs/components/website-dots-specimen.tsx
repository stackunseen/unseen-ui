'use client';
import {
  Card,
  DotBars,
  DotRing,
  HeatKeys,
  Numeric,
  Stat,
  StatGroup,
  WeekStrip,
} from '@stackunseen/ui';
import type { HeatKeyRow } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

// Fixed local figures: a deterministic shape, not random, so screenshots and tests repeat.
const hours = Array.from({ length: 24 }, (_, hour) => ({
  label: `${String(hour).padStart(2, '0')}:00`,
  value:
    [1, 0, 0, 0, 0, 1, 3, 8, 14, 18, 16, 12, 9, 13, 17, 15, 11, 7, 4, 3, 2, 2, 1, 1][hour] ?? 0,
}));
const sparse = hours.map((hour, index) => ({ ...hour, value: index % 6 === 0 ? 4 : 0 }));
const october = Array.from({ length: 31 }, (_, day) => ({
  label: `Oct ${day + 1}`,
  value:
    [
      12, 14, 11, 9, 16, 4, 3, 22, 26, 31, 28, 24, 6, 5, 30, 34, 29, 38, 41, 36, 9, 7, 33, 35, 32,
      30, 27, 8, 6, 25, 23,
    ][day] ?? 0,
}));
const week = [
  { label: 'M', values: { summarize: 3, rewrite: 2, other: 1 } },
  { label: 'T', values: { summarize: 4, rewrite: 1, other: 2 } },
  { label: 'W', values: { summarize: 5, rewrite: 3, other: 1 } },
  { label: 'T', values: { summarize: 6, rewrite: 4, other: 2 } },
  { label: 'F', values: { summarize: 7, rewrite: 3, other: 3 } },
  { label: 'S', values: { summarize: 1, rewrite: 0, other: 0 } },
  { label: 'S', values: { summarize: 2, rewrite: 1, other: 0 } },
];
const series = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'rewrite', label: 'Rewrite', swatch: 'var(--ai-secondary)' },
  { id: 'other', label: 'Other', swatch: 'var(--ai-muted)' },
];
const row = (letters: string, counts: number[], offset?: number): HeatKeyRow => ({
  offset,
  keys: [...letters].map((letter, index) => ({
    id: letter,
    label: letter.toUpperCase(),
    value: counts[index] ?? 0,
  })),
});
const keyboard: HeatKeyRow[] = [
  row('qwertyuiop', [0, 9, 6, 11, 10, 0, 0, 0, 0, 0]),
  row('asdfghjkl', [5, 14, 7, 8, 0, 0, 0, 9, 0], 0.5),
  row('zxcvbnm', [0, 8, 6, 0, 0, 0, 10], 1),
  {
    offset: 1.5,
    keys: [
      { id: 'cmd', label: '⌘', value: 12 },
      { id: 'space', label: 'space', value: 3, span: 4 },
      { id: 'alt', label: '⌥', value: 11 },
    ],
  },
];
const grid: HeatKeyRow[] = Array.from({ length: 4 }, (_, r) => ({
  keys: Array.from({ length: 8 }, (_, c) => ({
    id: `${r}-${c}`,
    label: String(r * 8 + c + 1),
    value: ((r * 3 + c * 5) % 11) + (r === 2 ? 6 : 0),
  })),
}));

export function WebsiteDotsSpecimen({ name, state }: WebsiteSpecimenProps) {
  if (name === 'DotRing')
    return (
      <Card style={{ maxWidth: 300 }}>
        <Card.Header>
          <Card.Title>Time saved</Card.Title>
          <Card.Description>When tool calls save you time</Card.Description>
        </Card.Header>
        <Card.Content>
          <DotRing
            label="Runs by hour"
            data={
              state === 'Empty'
                ? hours.map((h) => ({ ...h, value: 0 }))
                : state === 'Sparse'
                  ? sparse
                  : hours
            }
            value={state === 'Empty' ? '—' : '32 s'}
            caption="per run"
            unit="runs"
            ticks={[
              { at: 0, label: '00' },
              { at: 6, label: '06' },
              { at: 12, label: '12' },
              { at: 18, label: '18' },
            ]}
          />
        </Card.Content>
      </Card>
    );
  if (name === 'DotBars')
    return (
      <Card style={{ maxWidth: 420 }}>
        <Card.Header>
          <Card.Title>Your runs</Card.Title>
          <Card.Description>Which days you reach for tools</Card.Description>
        </Card.Header>
        <Card.Content>
          <Numeric size="lg" value="1,284" qualifier="runs in October" />
        </Card.Content>
        <Card.Content>
          <DotBars
            label="Runs in October"
            data={state === 'Empty' ? october.map((d) => ({ ...d, value: 0 })) : october}
            unit="runs"
            axis={['Oct 1', 'Oct 31']}
            range={state === 'Range' || state === 'Default' ? { start: 6, end: 19 } : undefined}
            rangeLabel={
              state === 'Range' || state === 'Default' ? 'Oct 7 – 20 · 642 runs' : undefined
            }
            outliers={state === 'Outlier' ? [18] : []}
          />
        </Card.Content>
      </Card>
    );
  if (name === 'WeekStrip')
    return (
      <Card style={{ maxWidth: 360 }}>
        <Card.Header>
          <Card.Title>{state === 'Goal' ? 'Weekly goal' : 'This week'}</Card.Title>
          <Card.Description>
            {state === 'Goal' ? '2.6 of 3 h · 2 days left' : '214 runs'}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <WeekStrip
            label={state === 'Goal' ? 'Hours toward the weekly goal' : 'Runs this week'}
            days={
              state === 'Goal'
                ? week.map((day) => ({
                    label: day.label,
                    values: { hours: day.values.summarize / 10 },
                  }))
                : week
            }
            series={
              state === 'Default'
                ? series
                : [
                    {
                      id: state === 'Goal' ? 'hours' : 'summarize',
                      label: state === 'Goal' ? 'Hours' : 'Summarize',
                    },
                  ]
            }
            max={state === 'Goal' ? 0.6 : undefined}
            current={4}
            unit={state === 'Goal' ? 'h' : 'runs'}
          />
        </Card.Content>
        {state === 'Default' && (
          <Card.Section>
            <StatGroup aria-label="Most used">
              <Stat variant="plain" label="Avg answer" value="1.4 s" />
              <Stat variant="plain" label="Most used" value="⌥ S" />
              <Stat variant="plain" label="Streak" value="12 days" />
            </StatGroup>
          </Card.Section>
        )}
      </Card>
    );
  if (name === 'HeatKeys')
    return (
      <Card style={{ maxWidth: 440 }}>
        <Card.Header>
          <Card.Title>{state === 'Grid' ? 'Cells used' : 'Your keyboard'}</Card.Title>
          <Card.Description>
            {state === 'Grid' ? 'By position in the grid' : 'Which shortcuts you reach for'}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <HeatKeys
            label={state === 'Grid' ? 'Cells used' : 'Keys you reach for'}
            rows={
              state === 'Grid'
                ? grid
                : state === 'Empty'
                  ? keyboard.map((r) => ({ ...r, keys: r.keys.map((k) => ({ ...k, value: 0 })) }))
                  : keyboard
            }
            scale={['Fewer', 'More']}
            unit="presses"
          />
        </Card.Content>
      </Card>
    );
  return null;
}
