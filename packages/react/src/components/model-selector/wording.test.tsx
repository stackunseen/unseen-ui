import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AILocale } from '../../providers/locale/locale.js';
import { ContextBar } from '../context-bar/context-bar.js';
import { DiffStat } from '../diff-stat/diff-stat.js';
import { MemoryPanel } from '../memory-panel/memory-panel.js';
import { Sources } from '../sources/sources.js';
import { ModelSelector } from './model-selector.js';

const usage = { used: 12500, limit: 200000, kind: 'measured', model: 'm', measuredAt: 't' };

describe('AILocale', () => {
  it('formats numbers as en-US without a provider, and by the provider inside one', () => {
    const { rerender } = render(<ContextBar items={[]} usage={usage as never} />);
    expect(screen.getByText('12,500 / 200,000 tokens')).toBeVisible();
    rerender(
      <AILocale locale="de-DE">
        <ContextBar items={[]} usage={usage as never} />
        <DiffStat added={1500} removed={2} />
      </AILocale>,
    );
    expect(screen.getByText('12.500 / 200.000 tokens')).toBeVisible();
    expect(screen.getByText('+1.500')).toBeVisible();
  });

  it("lets a component's own locale prop win over the provider", () => {
    const entry = {
      id: 'm1',
      text: 'Prefers metric units',
      scope: 'user' as const,
      source: { kind: 'person' as const, label: 'Settings', at: '2026-10-01T09:00:00Z' },
    };
    const props = { entries: [entry], query: '', onQueryChange: () => {}, onRequest: () => {} };
    const { container, rerender } = render(
      <AILocale locale="de-DE">
        <MemoryPanel {...props} />
      </AILocale>,
    );
    expect(container).toHaveTextContent('01.10.2026');
    rerender(
      <AILocale locale="de-DE">
        <MemoryPanel {...props} locale="en-US" />
      </AILocale>,
    );
    expect(container).toHaveTextContent('Oct 1, 2026');
  });
});

describe('labels', () => {
  it('replaces only the wording that is passed and keeps the rest', () => {
    render(
      <>
        <Sources sources={[]} labels={{ none: 'Keine Quellen' }} />
        <Sources sources={[{ id: '1', title: 'A' }]} labels={{ none: 'Keine Quellen' }} />
        <ModelSelector
          models={[]}
          value=""
          onValueChange={() => {}}
          label="Modell"
          labels={{ placeholder: 'Modell wählen', noneSelected: 'keins gewählt' }}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Keine Quellen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Used 1 source' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Modell: keins gewählt' })).toHaveTextContent(
      'Modell wählen',
    );
  });
});
