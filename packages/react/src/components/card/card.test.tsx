import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './card.js';

describe('website surface composition', () => {
  it('preserves caller-selected heading hierarchy, native button behavior and refs', async () => {
    const ref = createRef<HTMLElement>();
    const save = vi.fn();
    render(
      <Card ref={ref} aria-labelledby="profile-title">
        <Card.Header>
          <Card.Title as="h2" id="profile-title">
            Profile
          </Card.Title>
          <Card.Description>Your public details.</Card.Description>
        </Card.Header>
        <Card.Content>
          <a href="/profile">Review profile</a>
        </Card.Content>
        <Card.Footer>
          <button type="button" onClick={save}>
            Save
          </button>
        </Card.Footer>
      </Card>,
    );
    expect(ref.current).toBe(screen.getByRole('region', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: 'Profile', level: 2 })).toBeVisible();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Review profile' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
