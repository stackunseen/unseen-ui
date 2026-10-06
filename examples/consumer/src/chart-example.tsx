'use client';
import { useState } from 'react';
import { Chart, Button } from '@stackunseen/ui';
import type { ChartSeries } from '@stackunseen/ui';

const series: ChartSeries[] = [
  {
    id: 'main',
    label: 'Main branch',
    points: [
      { id: 'a', label: 'First', value: 41 },
      { id: 'b', label: 'Second', value: 18 },
      { id: 'c', label: 'Third', value: 32 },
    ],
  },
  {
    id: 'preview',
    label: 'Preview branch',
    points: [
      { id: 'a', label: 'First', value: 38 },
      { id: 'b', label: 'Second', value: null },
      { id: 'c', label: 'Third', value: 28 },
    ],
  },
];
export function ChartExample() {
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [denied, setDenied] = useState(false);
  return (
    <section aria-label="Controlled chart example">
      <Chart
        title="Packed chart comparison"
        unit="seconds"
        source="Synthetic CI snapshots"
        asOf="2026-09-30"
        variant="line"
        series={series}
        hiddenSeries={hidden}
        onSeriesVisibilityChange={setHidden}
        state={denied ? 'denied' : 'ready'}
      />
      <Button variant="outline" onClick={() => setDenied((value) => !value)}>
        {denied ? 'Restore example chart' : 'Revoke example chart'}
      </Button>
    </section>
  );
}
