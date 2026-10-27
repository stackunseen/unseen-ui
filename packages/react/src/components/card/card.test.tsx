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
  it('keeps an icon tile decorative and gives a section its own surface step', () => {
    render(
      <Card>
        <Card.Header
          icon={<svg data-testid="icon" />}
          actions={<button type="button">Edit</button>}
        >
          <Card.Title>Time saved</Card.Title>
          <Card.Description>When tool calls save you time</Card.Description>
        </Card.Header>
        <Card.Section>By tool</Card.Section>
      </Card>,
    );
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: 'Time saved' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Card actions' })).toBeVisible();
    expect(screen.getByText('By tool')).toHaveAttribute('data-part', 'card-section');
  });
});
