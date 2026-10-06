import { createTheme, importTheme, updateTheme } from '@stackunseen/ui/theme';
import type { ResolvedTheme, ThemeInput } from '@stackunseen/ui/theme';

export const surfaceColorRoles = [
  ['canvas', 'Page background'],
  ['surface', 'Surface'],
  ['surface-subtle', 'Subtle surface'],
  ['text', 'Text'],
  ['muted', 'Secondary text'],
  ['border', 'Divider'],
  ['control-border', 'Control border'],
] as const;

/** The showcase keeps individually edited surface colours when changing its brand. */
export function updateShowcaseTheme(theme: ResolvedTheme, input: ThemeInput): ResolvedTheme {
  const next = updateTheme(theme, input);
  const changesBrand = (['primary', 'secondary', 'accent'] as const).some(
    (role) => input[role] !== undefined && input[role] !== theme.seeds[role],
  );
  if (!changesBrand) return next;
  const generated = createTheme(theme.seeds);
  for (const mode of ['light', 'dark'] as const) {
    for (const [role] of surfaceColorRoles) {
      if (
        role === 'control-border' &&
        input.borderStrength !== undefined &&
        input.borderStrength !== theme.seeds.borderStrength
      )
        continue;
      if (theme[mode][role] !== generated[mode][role]) next[mode][role] = theme[mode][role];
    }
  }
  return importTheme(JSON.stringify(next));
}
