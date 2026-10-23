import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppearanceToggle } from './appearance-toggle.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function systemPrefers(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: dark,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

describe('AppearanceToggle two-option variants', () => {
  it('switch offers only light and dark, starting from the system choice', async () => {
    systemPrefers(true);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<AppearanceToggle variant="switch" value="system" onValueChange={onValueChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Appearance' });
    const radios = screen.getAllByRole('radio');
    expect(group).toBeInTheDocument();
    expect(radios.map((radio) => radio.textContent)).toEqual(['Light', 'Dark']);
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(onValueChange).toHaveBeenCalledWith('light');
  });

  it('subtle is one quiet button with a stable name and a pressed state', async () => {
    systemPrefers(false);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <AppearanceToggle variant="subtle" value="light" onValueChange={onValueChange} />,
    );
    const button = screen.getByRole('button', { name: 'Dark mode' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(onValueChange).toHaveBeenCalledWith('dark');
    rerender(<AppearanceToggle variant="subtle" value="dark" onValueChange={onValueChange} />);
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(onValueChange).toHaveBeenLastCalledWith('light');
  });
});
