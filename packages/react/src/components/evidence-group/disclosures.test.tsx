import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Source } from '@ai-interaction/core';
import { EvidenceGroup } from './evidence-group.js';

const first: Source = {
  id: 'report',
  title: 'Annual report',
  kind: 'document',
  version: '2025',
  locator: 'Page 18',
  access: 'available',
  url: 'https://example.com/report.pdf',
  excerpt: 'Published annual revenue.',
};

const second: Source = { ...first, id: 'policy', title: 'Pricing policy', locator: 'Section 4.2' };

describe('repeated evidence and MCP disclosures', () => {
  it('gives each expanded evidence body its source/relationship name without adding landmarks', async () => {
    render(
      <EvidenceGroup
        variant="accordion"
        claim="Check the supplied source links."
        sources={[first, second]}
        relationships={{ report: 'supports', policy: 'contradicts' }}
      />,
    );
    const root = screen.getByRole('group', { name: 'Evidence' });
    await userEvent.click(within(root).getByRole('button', { name: 'Annual report · supports' }));
    await userEvent.click(
      within(root).getByRole('button', { name: 'Pricing policy · contradicts' }),
    );
    expect(within(root).queryByRole('region')).not.toBeInTheDocument();
    const report = within(root).getByRole('group', { name: 'Annual report · supports' });
    const policy = within(root).getByRole('group', { name: 'Pricing policy · contradicts' });
    expect(within(report).getByText('Page 18 · 2025')).toBeVisible();
    expect(within(policy).getByText('Section 4.2 · 2025')).toBeVisible();
    expect(within(report).getByRole('link')).toHaveAccessibleName(
      'Open source: Annual report (opens in a new tab)',
    );
  });
});
