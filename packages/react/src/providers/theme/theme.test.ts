import { describe, expect, it } from 'vitest';
import { wcagContrast } from 'culori';
import {
  createTheme,
  exportTheme,
  importTheme,
  themeToCSS,
  updateTheme,
} from '@stackunseen/ui/theme';

describe('theme resolver', () => {
  it('keeps neutral surfaces readable and required controls distinguishable in both appearances', () => {
    const theme = createTheme();
    for (const mode of ['light', 'dark'] as const) {
      const palette = theme[mode];
      for (const surface of ['canvas', 'surface', 'surface-subtle'] as const) {
        expect(wcagContrast(palette.text, palette[surface])).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrast(palette.muted, palette[surface])).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrast(palette.focus, palette[surface])).toBeGreaterThanOrEqual(3);
      }
      expect(palette.surface).not.toBe(palette['surface-subtle']);
      expect(palette.canvas).not.toBe(palette.surface);
    }
    expect(theme.dark.canvas).toBe('#09090b');
    expect(theme.dark.surface).toBe('#18181b');
    expect(theme.light.canvas).toBe('#fafafa');
    expect(theme.seeds.primary).toBe('#2563eb');
    expect(theme.light.success).toBe('#166534');
    expect(theme.dark.danger).toBe('#fca5a5');
  });
  it('preserves imported colour overrides during geometry edits and updates only the requested boundary', () => {
    const theme = createTheme();
    theme.light.surface = '#fffefd';
    theme.dark.text = '#fafafa';
    expect(updateTheme(theme, { radius: 12 }).light).toEqual(theme.light);
    const next = updateTheme(theme, { borderStrength: 'strong' });
    expect(next.light.surface).toBe('#fffefd');
    expect(next.dark.text).toBe('#fafafa');
    expect(next.light['control-border']).toBe('#71717a');
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

describe('brand fills against the surface', () => {
  it('inverts a neutral ink primary in dark mode and keeps chromatic primaries visible', () => {
    const ink = createTheme({ primary: '#0a0a0b', secondary: '#3f3f46', accent: '#3f3f46' });
    expect(ink.light.primary).toBe('#0a0a0b');
    expect(ink.dark.primary).toBe('#fafafa');
    expect(wcagContrast(ink.dark['primary-foreground'], ink.dark.primary)).toBeGreaterThanOrEqual(
      4.5,
    );
    for (const mode of ['light', 'dark'] as const) {
      expect(wcagContrast(ink[mode].primary, ink[mode].surface)).toBeGreaterThanOrEqual(3);
      expect(wcagContrast(ink[mode].secondary, ink[mode].surface)).toBeGreaterThanOrEqual(3);
    }
    const navy = createTheme({ primary: '#101c3a' });
    expect(navy.light.primary).toBe('#101c3a');
    expect(navy.dark.primary).not.toBe('#101c3a');
    expect(wcagContrast(navy.dark.primary, navy.dark.surface)).toBeGreaterThanOrEqual(3);
    expect(ink.diagnostics.filter((item) => !item.passes)).toEqual([]);
  });
});

describe('per-role radius seeds', () => {
  it('emits button, pill, card and tag radii with sensible defaults and validation', () => {
    const defaults = createTheme();
    expect(defaults.seeds.buttonRadius).toBe(8);
    expect(defaults.seeds.pillRadius).toBe(999);
    expect(defaults.seeds.cardRadius).toBe(10);
    expect(defaults.seeds.tagRadius).toBe(999);
    const pills = createTheme({ radius: 12, controlRadius: 10, buttonRadius: 999, cardRadius: 14 });
    expect(pills.seeds.cardRadius).toBe(14);
    const css = themeToCSS(pills, 'brand', 'light');
    expect(css).toContain('--ai-button-radius:999px;');
    expect(css).toContain('--ai-radius-pill:999px;');
    expect(css).toContain('--ai-radius-card:14px;');
    expect(css).toContain('--ai-radius-tag:999px;');
    expect(css).toContain('--ai-control-radius:10px;');
    expect(() => createTheme({ cardRadius: 40 })).toThrow();
    expect(() => createTheme({ pillRadius: 1000 })).toThrow();
    const roundTrip = importTheme(exportTheme(pills));
    expect(roundTrip.seeds.buttonRadius).toBe(999);
  });
});
