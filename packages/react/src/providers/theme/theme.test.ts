import { describe, expect, it } from 'vitest';
import {
  createTheme,
  exportTheme,
  importTheme,
  themeToCSS,
  updateTheme,
} from '@ai-interaction/react/theme';

describe('theme resolver', () => {
  it('preserves imported colour overrides during geometry edits and updates only the requested boundary', () => {
    const theme = createTheme();
    theme.light.surface = '#fffefd';
    theme.dark.text = '#fafafa';
    expect(updateTheme(theme, { radius: 12 }).light).toEqual(theme.light);
    const next = updateTheme(theme, { borderStrength: 'strong' });
    expect(next.light.surface).toBe('#fffefd');
    expect(next.dark.text).toBe('#fafafa');
    expect(next.light['control-border']).toBe('#64748b');
    expect(updateTheme(theme, { primary: '#166534' }).light.surface).toBe('#ffffff');
  });
  it.each(['#ffff00', '#000000', '#ffffff', '#ff00ff', '#2563eb', '#808080'])(
    'validates derived pairs for seed %s in both modes',
    (primary) => {
      const theme = createTheme({
        primary,
        secondary: primary,
        accent: primary,
        borderStrength: 'strong',
      });
      expect(theme.diagnostics.filter((d) => !d.passes)).toEqual([]);
      expect(theme.seeds.primary).toBe(primary);
    },
  );
  it('preserves resolved tokens on export/import and recomputes diagnostics', () => {
    const theme = createTheme();
    theme.light['primary-foreground'] = theme.light.primary;
    const copy = importTheme(exportTheme(theme));
    expect(copy.light).toEqual(theme.light);
    expect(copy.diagnostics.some((d) => !d.passes)).toBe(true);
  });
  it('rejects malformed inputs, executable CSS and unknown tokens', () => {
    expect(() => createTheme({ primary: 'red;}' })).toThrow();
    expect(() => createTheme({ radius: -1 })).toThrow();
    expect(() => themeToCSS(createTheme(), 'x"]{body')).toThrow();
    expect(() => importTheme('{"__proto__":{}}')).toThrow();
    const theme = createTheme();
    expect(() =>
      importTheme(JSON.stringify({ ...theme, light: { ...theme.light, hack: '#ffffff' } })),
    ).toThrow();
  });
  it('generates scoped light/dark CSS without global selectors', () => {
    const css = themeToCSS(createTheme(), 'tenant-one', 'system');
    expect(css).toContain('[data-ai-theme="tenant-one"]');
    expect(css).toContain('prefers-color-scheme:dark');
    expect(css).not.toContain(':root');
  });
  it('uses a visible default boundary on plain and tinted surfaces in both modes', () => {
    expect(createTheme().seeds.borderStrength).toBe('strong');
    expect(createTheme().diagnostics.filter((d) => !d.passes)).toEqual([]);
    expect(createTheme({ fieldSurface: 'tinted' }).diagnostics.filter((d) => !d.passes)).toEqual(
      [],
    );
  });
  it('reports an explicitly selected subtle boundary without hiding its contrast shortfall', () => {
    expect(
      createTheme({ borderStrength: 'subtle' })
        .diagnostics.filter((d) => !d.passes)
        .map((d) => `${d.mode}:${d.role}`),
    ).toEqual([
      'light:control-border / surface',
      'light:control-border / surface-subtle',
      'dark:control-border / surface',
      'dark:control-border / surface-subtle',
    ]);
    expect(
      createTheme()
        .diagnostics.filter((d) => d.role.startsWith('focus'))
        .every((d) => d.passes),
    ).toBe(true);
  });
  it('round trips geometry, surfaces, elevation and reduced motion', () => {
    const theme = createTheme({
      controlRadius: 4,
      composerRadius: 20,
      radius: 12,
      borderWidth: 2,
      borderStrength: 'balanced',
      fieldSurface: 'tinted',
      elevation: 'flat',
      motion: 'reduced',
    });
    expect(importTheme(exportTheme(theme))).toEqual(theme);
    const css = themeToCSS(theme, 'custom');
    expect(css).toContain('--ai-control-radius:4px');
    expect(css).toContain('--ai-composer-radius:20px');
    expect(css).toContain('--ai-border-width:2px');
    expect(css).toContain('--ai-field-background:var(--ai-surface-subtle)');
    expect(css).toContain('--ai-shadow-popover:none');
    expect(css).toContain('[data-ai-theme="custom"] *');
    expect(css).toContain('animation:none!important');
  });
  it('migrates v1 exports while preserving custom colours and legacy corners', () => {
    const source = createTheme();
    source.light['control-border'] = '#123456';
    const imported = importTheme(
      JSON.stringify({
        ...source,
        schemaVersion: 1,
        resolverVersion: 1,
        seeds: {
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#0f766e',
          radius: 6,
          density: 'compact',
        },
      }),
    );
    expect(imported.schemaVersion).toBe(2);
    expect(imported.light).toEqual(source.light);
    expect(imported.seeds).toMatchObject({
      radius: 6,
      controlRadius: 6,
      composerRadius: 6,
      borderStrength: 'strong',
    });
  });
  it('rejects unbounded geometry and CSS injection in new options', () => {
    for (const options of [
      { borderWidth: 0 },
      { controlRadius: 25 },
      { composerRadius: 1.5 },
      { elevation: 'none;}' },
      { motion: 'fast' },
      { fieldSurface: 'url(x)' },
      { borderStrength: 'invisible' },
    ]) {
      expect(() => createTheme(options as Parameters<typeof createTheme>[0])).toThrow();
    }
  });
});
