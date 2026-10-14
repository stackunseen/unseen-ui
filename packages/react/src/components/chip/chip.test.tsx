import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chip, ChipGroup } from './chip.js';
import { Kbd } from '../kbd/kbd.js';
import { SkipLink } from '../skip-link/skip-link.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.js';

afterEach(cleanup);

describe('Chip', () => {
  it('toggles with aria-pressed and shows a decorative swatch', async () => {
    const onPressedChange = vi.fn();
    const { container } = render(
      <Chip pressed={false} onPressedChange={onPressedChange} swatch="var(--hue-agents)">
        Agents
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Agents', pressed: false });
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({
      background: 'var(--hue-agents)',
    });
    await userEvent.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it('renders a link chip with aria-current when active', () => {
    render(
      <ChipGroup label="Disciplines" overflow="scroll">
        <Chip href="/journal/?discipline=rag" active>
          RAG
        </Chip>
        <Chip href="/journal/?discipline=evals">Evals</Chip>
      </ChipGroup>,
    );
    const group = screen.getByRole('group', { name: 'Disciplines' });
    expect(group).toHaveAttribute('data-overflow', 'scroll');
    expect(screen.getByRole('link', { name: 'RAG' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Evals' })).not.toHaveAttribute('aria-current');
  });

  it('removes with the labelled button, Backspace or Delete', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<Chip onRemove={onRemove}>Stack: Next.js</Chip>);
    const remove = screen.getByRole('button', { name: 'Remove Stack: Next.js' });
    await user.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    remove.focus();
    await user.keyboard('{Backspace}');
    await user.keyboard('{Delete}');
    expect(onRemove).toHaveBeenCalledTimes(3);
  });

  it('keeps a disabled removable chip inert and renders a static chip without a control', () => {
    const onRemove = vi.fn();
    render(
      <>
        <Chip onRemove={onRemove} disabled removeLabel="Clear stack">
          Stack
        </Chip>
        <Chip>Static</Chip>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Clear stack' })).toBeDisabled();
    expect(screen.getByText('Static').closest('[data-part="chip"]')?.tagName).toBe('SPAN');
  });
});

describe('small primitives', () => {
  it('render Kbd, SkipLink and VisuallyHidden with native semantics', async () => {
    render(
      <>
        <SkipLink href="#main" />
        <main id="main" tabIndex={-1}>
          Press <Kbd>Esc</Kbd> to close.
          <VisuallyHidden>Extra context</VisuallyHidden>
        </main>
      </>,
    );
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByText('Esc').tagName).toBe('KBD');
    expect(screen.getByText('Extra context')).toHaveClass(/srOnly/);
    await userEvent.tab();
    expect(skip).toHaveFocus();
  });
});

describe('Chip link props', () => {
  it('passes anchor props through, defaults aria-current to true and lets the host choose', () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { rerender } = render(
      <Chip href="/lens/agents" active title="Why agents?" onClick={onClick} data-scroll="false">
        Agents
      </Chip>,
    );
    const link = screen.getByRole('link', { name: 'Agents' });
    expect(link).toHaveAttribute('title', 'Why agents?');
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(link).toHaveAttribute('data-scroll', 'false');
    link.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Chip href="/journal/" active current="page">
        Journal
      </Chip>,
    );
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('aria-current', 'page');
  });
});
