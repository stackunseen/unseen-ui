import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfidenceNote,
  FeedbackCapture,
  ProvenanceBadge,
  UsageMeter,
  emptyFeedbackDraft,
} from '@stackunseen/ui';
import type { FeedbackDraft } from '@stackunseen/ui';
import { estimated, measured, unknownMeasurement } from '@stackunseen/ui-core';

describe('UsageMeter', () => {
  it('shows a percentage only when the host reported a limit', () => {
    const { rerender, container } = render(
      <UsageMeter label="Context" value={measured({ used: 12400, limit: 32000 })} />,
    );
    expect(container.textContent).toContain('12,400 of 32,000 tokens (39%)');
    expect(container.textContent).toContain('Measured');
    rerender(<UsageMeter label="Context" value={measured({ used: 12400 })} />);
    expect(container.textContent).toContain('12,400 tokens so far');
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).toContain('Limit not reported');
  });

  it('says why a measurement is unknown and names an estimate basis', () => {
    const { rerender, container } = render(
      <UsageMeter
        label="Cost"
        unit="currency"
        value={unknownMeasurement('the provider bills monthly')}
      />,
    );
    expect(container.textContent).toContain('Cost: Not measured');
    expect(container.textContent).toContain('the provider bills monthly');
    rerender(
      <UsageMeter
        label="Cost"
        unit="currency"
        variant="detail"
        value={estimated({ used: 1.25, limit: 5 }, 'list prices')}
      />,
    );
    expect(container.textContent).toContain('$1.25 of $5.00 (25%)');
    expect(container.textContent).toContain('Estimated from list prices');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '$1.25 of $5.00 (25%)',
    );
  });

  it('marks the badge as a warning near the limit and danger at it', () => {
    const { rerender, container } = render(
      <UsageMeter
        label="Context"
        variant="badge"
        value={measured({ used: 27000, limit: 32000 })}
      />,
    );
    const badge = () => container.querySelector('[data-part="usage-meter"]')!;
    expect(badge()).toHaveAttribute('data-tone', 'warning');
    expect(badge().textContent).toContain('Context · 84%');
    rerender(
      <UsageMeter
        label="Context"
        variant="badge"
        value={measured({ used: 32000, limit: 32000 })}
      />,
    );
    expect(badge()).toHaveAttribute('data-tone', 'danger');
    rerender(
      <UsageMeter
        label="Context"
        variant="badge"
        value={measured({ used: Number.NaN, limit: 32000 })}
      />,
    );
    expect(badge().textContent).toContain('Not measured');
  });
});

describe('ProvenanceBadge', () => {
  it('reads Signed only when the host verified a manifest', () => {
    const { rerender, container } = render(<ProvenanceBadge origin="model" source="demo-model" />);
    const badge = () => container.querySelector('[data-part="provenance"]')!;
    expect(badge().textContent).toContain('Origin: Model · demo-model');
    expect(badge()).toHaveAttribute('data-signed', 'false');
    rerender(
      <ProvenanceBadge
        origin="tool"
        source="search_accounts"
        manifest={{ issuer: 'Example CA', verifiedBy: 'host', at: '2026-10-16T09:00:00Z' }}
      />,
    );
    expect(badge().textContent).toContain('Signed: Tool · search_accounts');
    expect(badge().textContent).toContain('verified');
    expect(badge()).toHaveAttribute('data-tone', 'success');
    rerender(
      <ProvenanceBadge
        origin="imported"
        manifest={{
          issuer: 'Example CA',
          verifiedBy: 'issuer' as 'host',
          at: '2026-10-16T09:00:00Z',
        }}
      />,
    );
    expect(badge().textContent).toContain('Origin: Imported');
    expect(badge().textContent).toContain('hasn’t been verified');
  });

  it('labels an unexpected origin as unknown', () => {
    const { container } = render(<ProvenanceBadge origin={'oracle' as 'model'} />);
    expect(container.textContent).toContain('Origin: Unknown origin');
  });
});

describe('ConfidenceNote', () => {
  it('renders nothing for unknown or out-of-range scores and never a bare number', () => {
    const { container, rerender } = render(
      <ConfidenceNote
        score={unknownMeasurement()}
        scope="of claims matched a source"
        method="eval"
      />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<ConfidenceNote score={measured(1.2)} scope="of claims" method="eval" />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <ConfidenceNote
        score={measured(0.82, '2026-10-16T09:00:00Z')}
        scope="of claims matched a source"
        method="eval pass rate over 40 runs"
      />,
    );
    expect(container.textContent).toBe(
      'Confidence: 82% of claims matched a source · eval pass rate over 40 runs · Oct 16, 2026, 9:00 AM',
    );
    rerender(
      <ConfidenceNote
        variant="inline"
        score={estimated(0.6, 'a sample of 5 runs')}
        scope="of answers were accepted"
        method="reviewer sampling"
      />,
    );
    expect(container.textContent).toContain('About 60% of answers were accepted');
    expect(container.textContent).toContain('(estimated from a sample of 5 runs)');
  });
});

describe('FeedbackCapture', () => {
  function Harness({
    submission,
    onSubmit,
  }: {
    submission?: 'idle' | 'submitting' | 'acknowledged' | 'failed' | 'outcome-unknown';
    onSubmit: (value: unknown) => void;
  }) {
    const [value, setValue] = useState<FeedbackDraft>(emptyFeedbackDraft);
    return (
      <FeedbackCapture
        target={{ messageId: 'm1', revision: 3 }}
        value={value}
        onValueChange={setValue}
        onSubmit={onSubmit}
        submission={submission}
      />
    );
  }

  it('binds thumbs, reasons and a correction to the message revision', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Not helpful' }));
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Incomplete' }));
    await user.type(screen.getByRole('textbox'), '  Mention the two archived accounts.  ');
    await user.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      target: { messageId: 'm1', revision: 3 },
      helpful: false,
      reasons: ['incomplete'],
      correction: 'Mention the two archived accounts.',
    });
  });

  it('clears reasons when the reader switches to helpful and locks while the host answers', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness onSubmit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Not helpful' }));
    await user.click(screen.getByRole('checkbox', { name: 'Inaccurate' }));
    await user.click(screen.getByRole('button', { name: 'Helpful' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
    rerender(<Harness onSubmit={() => {}} submission="acknowledged" />);
    expect(screen.getByRole('status')).toHaveTextContent('Feedback saved.');
    expect(screen.getByRole('button', { name: 'Helpful' })).toBeDisabled();
  });
});
