import { render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { ObservationTime } from './observation-time.js';

describe('context measurement semantics', () => {
  it('renders valid observation times in the viewer zone and keeps impossible dates unknown', () => {
    const { rerender, container } = render(<ObservationTime value="2026-10-01T10:30:00+02:00" />);
    // Tests run with TZ=UTC; the date order follows the machine's locale, so only the parts are checked.
    const time = container.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-10-01T10:30:00+02:00');
    expect(time.textContent).toMatch(/2026/);
    expect(time.textContent).toMatch(/8:30\s?(AM|am)/);
    expect(time.textContent).toMatch(/UTC$/);
    rerender(<ObservationTime value="2026-02-30T12:00:00Z" />);
    expect(screen.getByText('Time unavailable')).toBeVisible();
  });
});
