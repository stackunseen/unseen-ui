# Charts

`Chart` supports **bar**, **line** and **area** presentations, with grouped bars, patterned fills, dashed lines and four marker shapes. It reuses scoped theme tokens, the canonical DataTable and accessible Accordion; no additional chart dependency is required.

```tsx
import { Chart } from '@ai-interaction/react';
import type { ChartSeries } from '@ai-interaction/react';

const series: ChartSeries[] = [
  { id: 'main', label: 'Main', points: [
    { id: 'a', label: 'First', value: 41 },
    { id: 'b', label: 'Second', value: 18 },
  ] },
  { id: 'preview', label: 'Preview', points: [
    { id: 'a', label: 'First', value: 38 },
    { id: 'b', label: 'Second', value: null },
  ] },
];
// hidden belongs to the host; requestSelection does not imply acknowledgement.
<Chart title="Build duration" series={series} unit="seconds"
  source="CI history" asOf="Run snapshot 42" variant="line"
  hiddenSeries={hidden} onSeriesVisibilityChange={requestSelection} />;
```

Supply exactly one of legacy `points: readonly ChartPoint[]` or `series: readonly ChartSeries[]`. Legacy numeric points remain compatible. Optional category IDs permit repeated display labels; otherwise labels are category identities. Series IDs and category identities must be unique. Every series must have the same category identities, order and labels; the host aligns data before rendering. One shared unit/domain applies to all series. No secondary axis, stacking, arbitrary time scale or inferred category joining is exposed.

Bounds: up to four series of 60 points each, finite numeric samples, labels up to 200 characters and IDs up to 80. The shared plain-data preflight rejects accessors, cycles, executable values and nonplain objects before schema traversal. It is not proxy isolation or a hard CPU/memory deadline. Invalid data hides the entire plot and table; it is never silently truncated. Generated chart nodes reuse this model and retain the **120 samples across the entire generated surface** limit, including nulls.

`null` means **not reported**; it is not zero, permission denial or confidence. Lines/areas split at gaps without interpolation. Bars omit missing samples; an actual zero is a baseline mark. All missing/all hidden/empty views retain equivalent original tabular data. Domain includes zero and every supplied numeric value, including hidden series, so filtering keeps the scale stable. Scaled arithmetic handles tiny and extreme finite magnitudes without treating tiny numbers as zero. Values with extreme magnitude use scientific notation unless the host explicitly chooses a notation.

Series selection is controlled by `hiddenSeries` and `onSeriesVisibilityChange`. Clicking a legend emits the next hidden-ID list; only changed props alter the plot. Obsolete/duplicate selections are rejected. Streaming pauses selection. All original columns/values remain in Chart data; hiding a series is a presentation preference, never access control. Static legends also work; `showLegend` can explicitly choose whether to display one. Series colors and pattern/shape assignments follow supplied series order, which hosts should keep stable. Labels wrap and controls reuse theme focus styles. Category labels are abbreviated in the plot with full SVG titles and table labels; plots keep readable intrinsic width with local keyboard scrolling.

`state` defaults to `ready`. `loading`, `denied`, `unavailable`, `error` and `unknown` hide samples, provenance, legend and table before data inspection or formatter calls. Unexpected runtime state values use the unknown fallback. `streaming` displays provisional values explicitly; `stale` displays an explicitly historical snapshot. Host owns authorization and data freshness; the component does not fetch, execute or reconcile data. Revocation cannot retract data copied or inspected earlier. `asOf` and `source` are host-supplied inert text, not independently verified provenance. Source absence and absent units are explicitly labeled. All area fills paint before the series lines/markers to avoid covering earlier series cues.

`locale` defaults to deterministic `en-US`. `numberFormat` supplies Intl.NumberFormat options; `formatValue` is a trusted application callback returning nonempty inert text up to 2,000 characters. Formatting is computed once per distinct sample/tick, shared by SVG titles and table values. Invalid locale/options or rejected/throwing callbacks produce a visible fallback notice. Generated nodes accept only bounded locale/asOf strings, never callbacks, formatter expressions or executable renderer choices. There is no raw HTML or custom SVG input.
