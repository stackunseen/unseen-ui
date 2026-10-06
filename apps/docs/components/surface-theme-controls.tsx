'use client';
import { useState } from 'react';
import { Accordion, Button, Select } from '@stackunseen/ui';
import { importTheme } from '@stackunseen/ui/theme';
import type { ResolvedTheme, ThemeTokens } from '@stackunseen/ui/theme';
import { surfaceColorRoles } from '../lib/showcase-theme';
const neutral = {
  light: {
    canvas: '#fafafa',
    surface: '#ffffff',
    'surface-subtle': '#f4f4f5',
    text: '#18181b',
    muted: '#52525b',
    border: '#e4e4e7',
    'control-border': '#71717a',
  },
  dark: {
    canvas: '#09090b',
    surface: '#18181b',
    'surface-subtle': '#27272a',
    text: '#fafafa',
    muted: '#d4d4d8',
    border: '#3f3f46',
    'control-border': '#a1a1aa',
  },
};
export function withSurfaceTokens(
  theme: ResolvedTheme,
  mode: 'light' | 'dark',
  tokens: Partial<ThemeTokens>,
) {
  return importTheme(JSON.stringify({ ...theme, [mode]: { ...theme[mode], ...tokens } }));
}
export function SurfaceThemeControls({
  theme,
  onChange,
}: {
  theme: ResolvedTheme;
  onChange: (value: ResolvedTheme) => void;
}) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  return (
    <Accordion
      type="single"
      collapsible
      headingLevel={3}
      region={false}
      items={[
        {
          value: 'surfaces',
          title: 'Backgrounds and text',
          content: (
            <div className="surface-theme-controls">
              <p className="theme-note">
                Choose each appearance separately. Defaults use neutral charcoal and soft grays;
                primary color controls actions and focus.
              </p>
              <label className="editor-label">
                Edit palette
                <Select
                  value={mode}
                  onValueChange={(value) => setMode(value as 'light' | 'dark')}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange(withSurfaceTokens(theme, mode, neutral[mode]))}
              >
                Use neutral {mode} palette
              </Button>
              {surfaceColorRoles.map(([role, label]) => (
                <label className="surface-color-field" key={`${mode}-${role}`}>
                  <span>{label}</span>
                  <input
                    type="color"
                    aria-label={`${mode} ${label.toLowerCase()}`}
                    value={theme[mode][role]}
                    onChange={(event) =>
                      onChange(withSurfaceTokens(theme, mode, { [role]: event.target.value }))
                    }
                  />
                  <code>{theme[mode][role]}</code>
                </label>
              ))}
              <p className="theme-note">
                Set Appearance to {mode} to inspect it. Export includes both palettes. Check
                contrast after changing colors.
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
