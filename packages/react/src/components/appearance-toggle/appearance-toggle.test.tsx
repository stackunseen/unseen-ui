import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppearanceToggle } from './appearance-toggle.js';
import {
  appearanceInitScript,
  useResolvedAppearance,
  useStoredAppearance,
} from './use-stored-appearance.js';
import type { Appearance } from '../../theme.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AppearanceToggle', () => {
  it('cycles light, dark and system with a name that says the mode and what a press does', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<AppearanceToggle value="light" onValueChange={onValueChange} />);
    const button = screen.getByRole('button', { name: 'Light mode. Switch to dark mode' });
    expect(button).toHaveAttribute('data-appearance', 'light');
    await user.click(button);
    expect(onValueChange).toHaveBeenCalledWith('dark');
    rerender(<AppearanceToggle value="dark" onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Dark mode. Switch to system mode' }));
    expect(onValueChange).toHaveBeenLastCalledWith('system');
    rerender(<AppearanceToggle value="system" onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'System mode. Switch to light mode' }));
    expect(onValueChange).toHaveBeenLastCalledWith('light');
  });

  it('offers the segmented variant as a radiogroup', async () => {
    const onValueChange = vi.fn();
    render(<AppearanceToggle variant="segmented" value="system" onValueChange={onValueChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Appearance' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(onValueChange).toHaveBeenCalledWith('dark');
  });

  it('renders a neutral mark on the server so the first paint shows no mode', () => {
    const html = renderToString(<AppearanceToggle value="dark" onValueChange={() => {}} />);
    expect(html).toContain('aria-label="Appearance"');
    expect(html).not.toContain('data-appearance="dark"');
  });
});

describe('useStoredAppearance', () => {
  it('reads, writes and follows other tabs, with a system server snapshot', () => {
    localStorage.setItem('site:theme', 'dark');
    const { result } = renderHook(() => useStoredAppearance({ storageKey: 'site:theme' }));
    expect(result.current[0]).toBe('dark');
    act(() => result.current[1]('light'));
    expect(result.current[0]).toBe('light');
    expect(localStorage.getItem('site:theme')).toBe('light');
    act(() => {
      localStorage.setItem('site:theme', 'system');
      window.dispatchEvent(new StorageEvent('storage', { key: 'site:theme' }));
    });
    expect(result.current[0]).toBe('system');
    localStorage.setItem('site:theme', 'nonsense');
    const { result: invalid } = renderHook(() =>
      useStoredAppearance({ storageKey: 'site:theme', defaultValue: 'light' }),
    );
    expect(invalid.current[0]).toBe('light');
    const server = renderToString(<Probe />);
    expect(server).toContain('system');
  });

  it('survives blocked storage and keeps the choice for the page view', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', blocked);
    const { result } = renderHook(() => useStoredAppearance({ storageKey: 'blocked:key' }));
    expect(result.current[0]).toBe('system');
    act(() => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
  });

  it('resolves system through matchMedia and builds a safe init script', () => {
    let dark = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return dark;
        },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      })),
    );
    const { result } = renderHook(({ appearance }) => useResolvedAppearance(appearance), {
      initialProps: { appearance: 'system' as Appearance },
    });
    expect(result.current).toBe('light');
    act(() => {
      dark = true;
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toBe('dark');
    const script = appearanceInitScript({ storageKey: 'site":theme', attribute: 'data-theme' });
    expect(script).toContain('localStorage.getItem("site\\":theme")');
    expect(script).toContain('setAttribute("data-theme",v)');
    expect(script).toContain('removeAttribute("data-theme")');
    expect(script).toContain('catch');
  });
});

function Probe() {
  const [appearance] = useStoredAppearance({ storageKey: 'site:theme' });
  return <span>{appearance}</span>;
}
