import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTheme, exportTheme, importTheme, themeToCSS } from '@stackunseen/ui/theme';
import type { Appearance, ResolvedTheme } from '@stackunseen/ui/theme';
import { ThemeEditor } from './theme-editor';

const original = importTheme(
  JSON.stringify({
    ...createTheme({ primary: '#166534', density: 'compact' }),
    light: { ...createTheme().light, surface: '#fffefd' },
    dark: { ...createTheme().dark, surface: '#151518' },
  }),
);

function Editor({ initial = original }: { initial?: ResolvedTheme }) {
  const [theme, setTheme] = useState(initial);
  const [appearance, setAppearance] = useState<Appearance>('dark');
  const [iconSet, setIconSet] = useState<'default' | 'lucide'>('lucide');
  return (
    <>
      <ThemeEditor
        theme={theme}
        onChange={setTheme}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        iconSet={iconSet}
        onIconSetChange={setIconSet}
      />
      <output data-testid="settings">{JSON.stringify({ theme, appearance, iconSet })}</output>
    </>
  );
}

function settings() {
  return JSON.parse(screen.getByTestId('settings').textContent!);
}

describe('Theme Studio recovery and export', () => {
  it('keeps custom light and dark surfaces when editing a brand color', async () => {
    const user = userEvent.setup();
    render(<Editor />);
    const input = screen.getByRole('textbox', { name: 'Primary hex' });
    await user.clear(input);
    await user.type(input, '#92400e');
    expect(settings().theme.seeds.primary).toBe('#92400e');
    expect(settings().theme.light.surface).toBe(original.light.surface);
    expect(settings().theme.dark.surface).toBe(original.dark.surface);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(settings().theme).toEqual(original);
  });

  it('Undo restores both palettes, geometry, appearance and icons after Reset', async () => {
    const user = userEvent.setup();
    render(<Editor />);
    const before = settings();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(settings()).toEqual({ theme: createTheme(), appearance: 'light', iconSet: 'default' });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(settings()).toEqual(before);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('keeps reset semantics explicit and Undo recovers custom neutral palettes after a preset', async () => {
    const user = userEvent.setup();
    render(<Editor />);
    expect(screen.getByText(/Brand colors update both appearances/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cobalt' }));
    expect(settings().theme.light.surface).toBe('#ffffff');
    expect(settings().theme.dark.surface).toBe('#18181b');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(settings().theme).toEqual(original);
  });

  it('shows separate, accurate CSS/TypeScript/JSON fallbacks without overwriting an import draft', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    render(<Editor />);
    const importButton = screen.getByRole('button', { name: 'Import a theme' });
    await user.click(importButton);
    await user.type(screen.getByRole('textbox', { name: 'Theme JSON' }), 'Unfinished import');
    await user.click(importButton);
    await user.click(screen.getByRole('button', { name: 'Copy CSS' }));
    const css = await screen.findByRole('textbox', { name: 'CSS export' });
    expect(css).toBeVisible();
    expect(css).toHaveAttribute('readonly');
    expect(css).toHaveValue(themeToCSS(original, 'brand', 'dark'));
    expect(importButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(importButton);
    expect(screen.getByRole('textbox', { name: 'Theme JSON' })).toHaveValue('Unfinished import');
    await user.click(screen.getByRole('button', { name: 'Copy TypeScript' }));
    expect(await screen.findByRole('textbox', { name: 'TypeScript export' })).toHaveValue(
      `import { importTheme } from '@stackunseen/ui/theme';\n\nexport const theme = importTheme(${JSON.stringify(exportTheme(original))});`,
    );
    await user.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(await screen.findByRole('textbox', { name: 'JSON export' })).toHaveValue(
      exportTheme(original),
    );
    write.mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(screen.queryByRole('textbox', { name: 'JSON export' })).not.toBeInTheDocument();
    expect(screen.getByText('Copied JSON.', { exact: true })).toHaveAttribute('role', 'status');
  });

  it('rejects an invalid import without altering preferences and round-trips resolved palettes', async () => {
    const user = userEvent.setup();
    render(<Editor initial={createTheme()} />);
    const before = settings();
    await user.click(screen.getByRole('button', { name: 'Import a theme' }));
    const input = screen.getByRole('textbox', { name: 'Theme JSON' });
    await user.type(input, 'invalid');
    await user.click(screen.getByRole('button', { name: 'Import JSON' }));
    expect(settings()).toEqual(before);
    await user.clear(input);
    await user.click(input);
    await user.paste(exportTheme(original));
    await user.click(screen.getByRole('button', { name: 'Import JSON' }));
    expect(settings()).toEqual({ theme: original, appearance: 'dark', iconSet: 'lucide' });
    expect(screen.getByText('Theme imported.', { exact: true })).toHaveAttribute('role', 'status');
  });
});
