import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Chart, GeneratedUI } from '@stackunseen/ui';
import type { ChartSeries, ChartProps, GeneratedSurface } from '@stackunseen/ui';

const series: ChartSeries[] = ['Main', 'Preview', 'Baseline', 'Canary'].map((label, index) => ({
  id: label.toLowerCase(),
  label,
  points: [
    { id: 'a', label: 'First', value: 12 + index },
    { id: 'b', label: 'Middle', value: index === 1 ? null : 0 },
    { id: 'c', label: 'Last', value: -6 - index },
  ],
}));
const props = { title: 'Build duration', unit: 'seconds', source: 'Synthetic CI' };
async function data() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Chart data' }));
  return screen.getByRole('table');
}
describe('bounded chart semantics and controlled series', () => {
  it.each(['bar', 'line', 'area'] as const)(
    'renders four series with non-color cues and equivalent data in %s',
    async (variant) => {
      const { container } = render(<Chart {...props} series={series} variant={variant} />);
      const plot = screen.getByRole('img');
      expect(plot.querySelectorAll('[data-series-id]')).toHaveLength(4);
      expect(
        within(screen.getByRole('list', { name: 'Chart series' })).getAllByRole('listitem'),
      ).toHaveLength(4);
      expect(container.querySelectorAll('pattern')).toHaveLength(8);
      if (variant !== 'bar') {
        expect(plot.querySelectorAll('[data-series-id="preview"] [data-line]')).toHaveLength(2);
        expect(plot.querySelector('[data-series-id="preview"] [data-line]')).toHaveAttribute(
          'stroke-dasharray',
          '8 4',
        );
        expect(plot.querySelector('[data-series-id="canary"] [data-marker]')).toHaveAttribute(
          'data-marker',
          '3',
        );
      }
      const table = await data();
      if (variant === 'area')
        expect(
          plot
            .querySelector('[data-series-area="canary"]')!
            .compareDocumentPosition(plot.querySelector('[data-series-id="main"]')!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      expect(screen.queryByRole('region')).toBeNull();
      expect(screen.getByRole('group', { name: 'Chart data' })).toContainElement(table);
      expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
      expect(within(table).getByText('Not reported')).toBeVisible();
      expect(table).toHaveTextContent('Preview (seconds)');
      expect(table).toHaveTextContent('-9');
      expect(plot.querySelectorAll('text')).toHaveLength(6);
    },
  );
  it('draws explicit zero as a baseline mark; never draws missing data as zero', () => {
    render(<Chart {...props} series={series} />);
    const plot = screen.getByRole('img');
    expect(plot.querySelector('[data-series-id="main"] [data-value="0"] line')).not.toBeNull();
    expect(plot.querySelector('[data-series-id="main"] [data-value="0"] rect')).toBeNull();
    expect(plot.querySelectorAll('[data-series-id="preview"] [data-value]')).toHaveLength(2);
    expect(screen.getByText(/1 sample not reported/)).toBeVisible();
  });
  it('keeps every original value in the table when all samples are missing', async () => {
    render(
      <Chart
        {...props}
        series={[
          { ...series[0]!, points: series[0]!.points.map((point) => ({ ...point, value: null })) },
        ]}
      />,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('No numeric chart values reported.')).toBeVisible();
    expect(within(await data()).getAllByText('Not reported')).toHaveLength(3);
  });
  it.each(['bar', 'line', 'area'] as const)(
    'retains finite geometry for extreme and tiny magnitudes in %s',
    (variant) => {
      const { rerender } = render(
        <Chart
          {...props}
          variant={variant}
          points={[
            { label: 'A', value: 1e308 },
            { label: 'B', value: -1e308 },
          ]}
        />,
      );
      expect(screen.getByRole('img').outerHTML).not.toMatch(/NaN|Infinity/);
      rerender(
        <Chart
          {...props}
          variant={variant}
          points={[
            { label: 'A', value: 1e-200 },
            { label: 'B', value: 2e-200 },
          ]}
        />,
      );
      const plot = screen.getByRole('img');
      expect(plot.outerHTML).not.toMatch(/NaN|Infinity/);
      if (variant === 'bar')
        expect(
          Number(plot.querySelector('[data-value="2e-200"] rect')?.getAttribute('height')),
        ).toBe(164);
      expect(plot.textContent).toContain('E-200');
    },
  );
  it('emits legend intent without an optimistic change and retains all table columns', async () => {
    const request = vi.fn();
    const { rerender } = render(
      <Chart {...props} series={series} hiddenSeries={[]} onSeriesVisibilityChange={request} />,
    );
    const button = screen.getByRole('button', { name: /Main \(solid/ });
    await userEvent.setup().click(button);
    expect(request).toHaveBeenCalledWith(['main']);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img').querySelector('[data-series-id="main"]')).not.toBeNull();
    rerender(
      <Chart
        {...props}
        series={series}
        hiddenSeries={['main']}
        onSeriesVisibilityChange={request}
      />,
    );
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveFocus();
    expect(screen.getByRole('img').querySelector('[data-series-id="main"]')).toBeNull();
    expect(within(await data()).getByText('Main (seconds)')).toBeVisible();
  });
  it('works with acknowledged host filtering and all-hidden fallback', async () => {
    function Host() {
      const [hidden, setHidden] = useState<readonly string[]>([]);
      return (
        <Chart
          {...props}
          series={series.slice(0, 1)}
          hiddenSeries={hidden}
          onSeriesVisibilityChange={setHidden}
        />
      );
    }
    render(<Host />);
    await userEvent.setup().click(screen.getByRole('button', { name: /Main \(solid/ }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/No series selected/)).toBeVisible();
    expect(within(await data()).getByText('12')).toBeVisible();
  });
  it('pauses filtering while streaming and explicitly describes stale data', () => {
    const request = vi.fn();
    const { rerender } = render(
      <Chart {...props} series={series} state="streaming" onSeriesVisibilityChange={request} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('provisional');
    expect(screen.getByRole('button', { name: /Main \(solid/ })).toBeDisabled();
    rerender(<Chart {...props} series={series} state="stale" asOf="2026-09-30" />);
    expect(screen.getByRole('status')).toHaveTextContent('Historical');
    expect(screen.getByText(/As of: 2026-09-30/)).toBeVisible();
  });
  it.each(['loading', 'denied', 'unavailable', 'error', 'unknown'] as const)(
    'does not read samples or format values in %s',
    (state) => {
      const value = vi.fn(() => 12),
        formatValue = vi.fn(() => 'secret');
      const point = {
        label: 'Secret',
        get value() {
          return value();
        },
      };
      render(<Chart {...props} points={[point]} state={state} formatValue={formatValue} />);
      expect(value).not.toHaveBeenCalled();
      expect(formatValue).not.toHaveBeenCalled();
      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Secret')).toBeNull();
    },
  );
  it.each([
    'both',
    'neither',
    'duplicate-series',
    'duplicate-category',
    'misaligned',
    'different-label',
    'nan',
    'oversized',
    'accessor',
    'too-many-series',
    'invalid-id',
    'obsolete-selection',
  ] as const)('rejects %s without a partial plot', (scenario) => {
    const p: ChartProps = { ...props, series };
    const read = vi.fn(() => 20);
    if (scenario === 'both') p.points = [{ label: 'First', value: 1 }];
    if (scenario === 'neither') p.series = undefined;
    if (scenario === 'duplicate-series') p.series = [series[0]!, series[0]!];
    if (scenario === 'duplicate-category')
      p.series = [{ ...series[0]!, points: [series[0]!.points[0]!, series[0]!.points[0]!] }];
    if (scenario === 'misaligned')
      p.series = [series[0]!, { ...series[1]!, points: series[1]!.points.slice(1) }];
    if (scenario === 'different-label')
      p.series = [
        series[0]!,
        {
          ...series[1]!,
          points: series[1]!.points.map((point) => ({ ...point, label: 'Different' })),
        },
      ];
    if (scenario === 'nan') p.series = [{ ...series[0]!, points: [{ label: 'A', value: NaN }] }];
    if (scenario === 'oversized')
      p.series = [
        {
          ...series[0]!,
          points: Array.from({ length: 61 }, (_, index) => ({
            label: String(index),
            get value() {
              return read();
            },
          })),
        },
      ];
    if (scenario === 'accessor')
      p.series = [
        {
          ...series[0]!,
          points: [
            {
              label: 'A',
              get value() {
                return read();
              },
            },
          ],
        },
      ];
    if (scenario === 'too-many-series') p.series = [...series, { ...series[0]!, id: 'fifth' }];
    if (scenario === 'invalid-id') p.series = [{ ...series[0]!, id: '__proto__' }];
    if (scenario === 'obsolete-selection') p.hiddenSeries = ['missing'];
    render(<Chart {...p} />);
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
  it('supports duplicate display labels when stable category IDs differ', async () => {
    render(
      <Chart
        {...props}
        points={[
          { id: 'first', label: 'Build', value: 1 },
          { id: 'second', label: 'Build', value: 2 },
        ]}
      />,
    );
    expect(within(await data()).getAllByText('Build')).toHaveLength(2);
  });
  it('uses explicit locale/currency consistently in titles and the data table', async () => {
    render(
      <Chart
        {...props}
        points={[{ label: 'A', value: 1234.5 }]}
        locale="de-DE"
        numberFormat={{ style: 'currency', currency: 'EUR' }}
      />,
    );
    const value = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
      1234.5,
    );
    expect(screen.getByRole('img').textContent).toContain(value);
    expect(
      within(await data()).getByText(
        (_text, element) => element?.tagName === 'TD' && element.textContent === value,
      ),
    ).toBeVisible();
  });
  it.each(['locale', 'callback', 'length', 'empty'] as const)(
    'falls back explicitly for invalid %s formatting',
    async (scenario) => {
      render(
        <Chart
          {...props}
          points={[{ label: 'A', value: 12 }]}
          locale={scenario === 'locale' ? 'invalid_locale' : undefined}
          formatValue={
            scenario === 'callback'
              ? () => {
                  throw new Error('Bad formatter');
                }
              : scenario === 'length'
                ? () => 'x'.repeat(2001)
                : scenario === 'empty'
                  ? () => ''
                  : undefined
          }
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent('formatting unavailable');
      expect(within(await data()).getByText('12')).toBeVisible();
    },
  );
  it('renders labels, attribution and trusted formatter output as inert text', async () => {
    const text = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <Chart
        {...props}
        source={text}
        points={[{ label: text, value: 1 }]}
        formatValue={() => text}
      />,
    );
    expect(container.querySelector('img,script')).toBeNull();
    expect((await data()).textContent).toContain(text);
  });
  it('keeps SVG pattern identities unique across server-rendered instances', () => {
    const markup = renderToStaticMarkup(
      <>
        <Chart {...props} series={series} />
        <Chart {...props} series={series} />
      </>,
    );
    const ids = [...markup.matchAll(/<pattern id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('reuses series validation inside generated surfaces and counts missing samples toward the shared limit', async () => {
    const surface: GeneratedSurface = {
      id: 'surface',
      version: '1',
      nodes: [{ id: 'chart', type: 'chart', ...props, series, locale: 'en-US' }],
    };
    const { rerender } = render(
      <GeneratedUI surface={surface} state="streaming" onAction={() => {}} />,
    );
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.getByText(/Values are provisional/)).toBeVisible();
    expect(within(await data()).getAllByRole('columnheader')).toHaveLength(5);
    const large = series.map((group) => ({
      ...group,
      points: Array.from({ length: 31 }, (_, index) => ({ label: String(index), value: null })),
    }));
    rerender(
      <GeneratedUI
        surface={{ ...surface, nodes: [{ id: 'chart', type: 'chart', ...props, series: large }] }}
        state="ready"
        onAction={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
