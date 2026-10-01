import { render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { ObservationTime } from './observation-time.js';

describe('context measurement semantics', () => {
  it('renders valid observation times in UTC and keeps impossible dates unknown', () => {
    const { rerender } = render(<ObservationTime value="2026-10-01T10:30:00+02:00" />);
    expect(screen.getByText('Oct 1, 2026, 8:30 AM UTC').tagName).toBe('TIME');
    rerender(<ObservationTime value="2026-02-30T12:00:00Z" />);
    expect(screen.getByText('Time unavailable')).toBeVisible();
  });
});
