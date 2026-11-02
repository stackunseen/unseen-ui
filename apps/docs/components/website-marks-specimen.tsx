'use client';
import { BarList, Card, DonutChart, Sparkline, Stat, Tracker } from '@stackunseen/ui';
import type { TrackerSegment } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

// Fixed local figures, so screenshots and tests repeat.
const latency = [212, 198, 230, 245, 221, 190, 176, 182, 169, 158, 166, 149, 141, 152].map(
  (value, index) => ({ label: `Oct ${index + 1}`, value }),
);
const withGap = latency.map((point, index) =>
  index === 6 || index === 7 ? { ...point, value: null } : point,
);
const runs: TrackerSegment[] = Array.from({ length: 30 }, (_, index) => {
  const status = [11, 23].includes(index)
    ? 'failed'
    : [5, 17, 18].includes(index)
      ? 'degraded'
      : 'ok';
  return {
    label: `Day ${index + 1}`,
    status,
    detail:
      status === 'failed'
        ? 'Nightly eval run failed'
        : status === 'degraded'
          ? 'Some tool calls retried'
          : undefined,
  };
});
const tools = [
  { id: 'search', label: 'search_docs', value: 1240, display: '1,240' },
  { id: 'read', label: 'read_file', value: 860, display: '860' },
  { id: 'sql', label: 'run_query', value: 412, display: '412' },
  { id: 'mail', label: 'send_email', value: 96, display: '96' },
  { id: 'deploy', label: 'deploy_preview', value: 31, display: '31' },
];
const spend = [
  { id: 'atlas', label: 'atlas-pro', value: 742 },
  { id: 'fast', label: 'atlas-fast', value: 318 },
  { id: 'embed', label: 'embeddings', value: 164 },
  { id: 'other', label: 'Other', value: 60 },
];

export function WebsiteMarksSpecimen({ name, state }: WebsiteSpecimenProps) {
  if (name === 'Sparkline') {
    if (state === 'In a stat')
      return (
        <Card style={{ maxWidth: 300 }}>
          <Card.Section>
            <Stat variant="plain" label="p95 latency" value="152 ms" delta="-28%" />
            <Sparkline
              label="p95 latency, last 14 days"
              unit="ms"
              data={latency}
              variant="area"
              tone="positive"
              markLast
              style={{ marginTop: 12 }}
            />
          </Card.Section>
        </Card>
      );
    return (
      <div style={{ display: 'grid', gap: 20, width: 'min(100%, 320px)' }}>
        <Sparkline
          label="p95 latency, last 14 days"
          unit="ms"
          data={state === 'Gap' ? withGap : latency}
          variant={state === 'Bars' ? 'bar' : state === 'Area' ? 'area' : 'line'}
          markLast={state !== 'Bars'}
        />
      </div>
    );
  }
  if (name === 'BarList')
    return (
      <Card style={{ width: 'min(100%, 380px)' }}>
        <Card.Header>
          <Card.Title>Tool calls</Card.Title>
          <Card.Description>Last 7 days, all agents</Card.Description>
        </Card.Header>
        <Card.Section>
          <BarList
            label="Tool calls by tool"
            headings={state === 'Headings' ? ['Tool', 'Calls'] : undefined}
            items={state === 'Empty' ? [] : tools}
          />
          {state === 'Empty' && (
            <p style={{ margin: 0, color: 'var(--ai-muted)' }}>No calls yet.</p>
          )}
        </Card.Section>
      </Card>
    );
  if (name === 'Tracker')
    return (
      <Card style={{ width: 'min(100%, 420px)' }}>
        <Card.Header>
          <Card.Title>Nightly evals</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
        </Card.Header>
        <Card.Section>
          <Tracker
            label="Nightly eval runs, last 30 days"
            segments={
              state === 'No data'
                ? runs.map((run, index) => (index < 12 ? { ...run, status: 'unknown' } : run))
                : runs
            }
            summary={state === 'No data' ? '18 runs reported' : '28 of 30 runs passed'}
            axis={['30 days ago', 'Today']}
          />
        </Card.Section>
      </Card>
    );
  return (
    <Card style={{ width: 'min(100%, 380px)' }}>
      <Card.Header>
        <Card.Title>Spend by model</Card.Title>
        <Card.Description>October, estimated from token counts</Card.Description>
      </Card.Header>
      <Card.Section>
        <DonutChart
          label="Spend by model, October"
          unit="USD"
          data={state === 'Single slice' ? spend.slice(0, 1) : spend}
          value={state === 'Single slice' ? '$742' : '$1,284'}
          caption="this month"
          legend={state !== 'No legend'}
        />
      </Card.Section>
    </Card>
  );
}
