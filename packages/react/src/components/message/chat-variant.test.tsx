import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Message } from './message.js';

describe('Message chat variant', () => {
  it('keeps the speaker for assistive technology and puts actions after the bubble', () => {
    render(
      <Message value={{ role: 'user', text: 'Plan a trip' }} variant="chat">
        <button type="button">Edit</button>
      </Message>,
    );
    const article = screen.getByRole('article', { name: 'user message' });
    expect(article.dataset.variant).toBe('chat');
    expect(article.textContent).toContain('You');
    const body = screen.getByText('Plan a trip').closest('article > div:not([aria-hidden])');
    expect(body?.contains(screen.getByRole('button', { name: 'Edit' }))).toBe(false);
    expect(article.lastElementChild).toBe(screen.getByRole('button', { name: 'Edit' }));
  });

  it('keeps actions inside the body for the other variants', () => {
    render(
      <Message value={{ role: 'assistant', text: 'Sure.' }} variant="plain">
        <button type="button">Copy</button>
      </Message>,
    );
    const article = screen.getByRole('article', { name: 'assistant message' });
    expect(article.lastElementChild?.contains(screen.getByRole('button', { name: 'Copy' }))).toBe(
      true,
    );
    expect(article.lastElementChild).not.toBe(screen.getByRole('button', { name: 'Copy' }));
  });

  it('names other people in a group chat and keeps yours as You', () => {
    render(
      <>
        <Message
          value={{ role: 'user', text: 'Lunch?', author: { id: 'b', name: 'Ben' } }}
          variant="chat"
        />
        <Message
          value={{ role: 'user', text: 'Sure', author: { id: 'a', name: 'Ana', you: true } }}
          variant="chat"
        />
      </>,
    );
    const ben = screen.getByRole('article', { name: 'Message from Ben' });
    expect(ben.dataset.author).toBe('other');
    expect(ben.textContent).toContain('Ben');
    const mine = screen.getByRole('article', { name: 'user message' });
    expect(mine.dataset.author).toBe('you');
    expect(mine.textContent).toContain('You');
  });
});
