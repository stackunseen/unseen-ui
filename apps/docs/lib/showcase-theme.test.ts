import { describe, expect, it } from 'vitest';
import { createTheme, exportTheme, importTheme, updateTheme } from '@stackunseen/ui/theme';
import { surfaceColorRoles, updateShowcaseTheme } from './showcase-theme';

describe('showcase theme edits', () => {
  it('keeps individually edited colors in each appearance when changing the brand', () => {
    const original = createTheme();
    const custom = importTheme(
      JSON.stringify({
        ...original,
        light: { ...original.light, canvas: '#f8faf5', surface: '#fffefd' },
        dark: { ...original.dark, canvas: '#101510', text: '#eef6ee' },
      }),
    );
    const before = exportTheme(custom);
    const next = updateShowcaseTheme(custom, { primary: '#166534' });
    expect(next.light.canvas).toBe('#f8faf5');
    expect(next.light.surface).toBe('#fffefd');
    expect(next.dark.canvas).toBe('#101510');
    expect(next.dark.text).toBe('#eef6ee');
    expect(next.seeds.primary).toBe('#166534');
    expect(next.light.primary).toBe(createTheme({ primary: '#166534' }).light.primary);
    expect(next.dark.primary).not.toBe(custom.dark.primary);
    expect(next).toEqual(importTheme(exportTheme(next)));
    expect(exportTheme(custom)).toBe(before);
  });

  it('uses the generated palette for neutral colors that were not individually edited', () => {
    const next = updateShowcaseTheme(createTheme(), { primary: '#166534', accent: '#92400e' });
    expect(next).toEqual(createTheme({ primary: '#166534', accent: '#92400e' }));
  });

  it('preserves all surface colors during geometry and density edits', () => {
    const original = createTheme();
    const custom = importTheme(
      JSON.stringify({ ...original, light: { ...original.light, surface: '#fffefd' } }),
    );
    const next = updateShowcaseTheme(custom, {
      density: 'compact',
      controlRadius: 0,
      radius: 20,
      borderWidth: 2,
    });
    for (const mode of ['light', 'dark'] as const)
      for (const [role] of surfaceColorRoles) expect(next[mode][role]).toBe(custom[mode][role]);
    expect(next.seeds).toMatchObject({
      density: 'compact',
      controlRadius: 0,
      radius: 20,
      borderWidth: 2,
    });
  });

  it('honors an explicit border strength edit while retaining custom backgrounds', () => {
    const original = createTheme({ borderStrength: 'balanced' });
    const custom = importTheme(
      JSON.stringify({
        ...original,
        light: { ...original.light, surface: '#fffefd', 'control-border': '#555555' },
      }),
    );
    const next = updateShowcaseTheme(custom, { borderStrength: 'strong' });
    expect(next.light.surface).toBe('#fffefd');
    expect(next.light['control-border']).toBe(
      updateTheme(custom, { borderStrength: 'strong' }).light['control-border'],
    );
    expect(next.light['control-border']).not.toBe('#555555');
    const withBrand = updateShowcaseTheme(custom, { primary: '#166534', borderStrength: 'strong' });
    expect(withBrand.light.surface).toBe('#fffefd');
    expect(withBrand.light['control-border']).toBe(
      createTheme({ ...custom.seeds, primary: '#166534', borderStrength: 'strong' }).light[
        'control-border'
      ],
    );
  });
});
