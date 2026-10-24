import { clampRgb, converter, formatHex, interpolate, wcagContrast } from 'culori';

export type Appearance = 'light' | 'dark' | 'system';
export interface ThemeInput {
  primary?: string;
  secondary?: string;
  accent?: string;
  /** Panels, menus and dialogs. */
  radius?: number;
  density?: 'comfortable' | 'compact';
  /** Inputs and selects. */
  controlRadius?: number;
  composerRadius?: number;
  /** Buttons; defaults to controlRadius. Use 999 for pills. */
  buttonRadius?: number;
  /** Chips and segmented controls (default 999). */
  pillRadius?: number;
  /** Card and Stat surfaces; defaults to radius. */
  cardRadius?: number;
  /** Tag labels (default 999). */
  tagRadius?: number;
  borderStrength?: 'subtle' | 'balanced' | 'strong';
  borderWidth?: 1 | 2;
  fieldSurface?: 'plain' | 'tinted';
  elevation?: 'flat' | 'soft' | 'lifted';
  motion?: 'system' | 'reduced';
}
export const tokenNames = [
  'canvas',
  'surface',
  'surface-subtle',
  'text',
  'muted',
  'border',
  'control-border',
  'primary',
  'primary-hover',
  'primary-foreground',
  'primary-soft',
  'primary-text',
  'secondary',
  'secondary-hover',
  'secondary-foreground',
  'secondary-soft',
  'secondary-text',
  'accent',
  'accent-foreground',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'focus',
] as const;
export type TokenName = (typeof tokenNames)[number];
export type ThemeTokens = Record<TokenName, string>;
export interface ContrastDiagnostic {
  mode: 'light' | 'dark';
  role: string;
  ratio: number;
  minimum: number;
  passes: boolean;
}
export interface ResolvedTheme {
  schemaVersion: 2;
  resolverVersion: 2;
  seeds: Required<ThemeInput>;
  light: ThemeTokens;
  dark: ThemeTokens;
  diagnostics: ContrastDiagnostic[];
}
const hexPattern = /^#[\da-fA-F]{6}$/;
const toOklch = converter('oklch');
function hex(value: string) {
  if (!hexPattern.test(value))
    throw new Error('Use an opaque six-digit hex colour, such as #2563eb.');
  return value.toLowerCase();
}
function shade(seed: string, lightness: number, chromaScale = 1): string {
  const c = toOklch(seed)!;
  return formatHex(clampRgb({ mode: 'oklch', l: lightness, c: c.c * chromaScale, h: c.h ?? 0 }))!;
}
function foreground(background: string): string {
  return wcagContrast(background, '#ffffff') >= wcagContrast(background, '#0b1220')
    ? '#ffffff'
    : '#0b1220';
}
function readable(seed: string, background: string, dark: boolean, minimum = 4.5): string {
  if (wcagContrast(seed, background) >= minimum) return seed;
  for (let i = 0; i <= 100; i++) {
    const candidate = shade(seed, dark ? i / 100 : 1 - i / 100);
    if (wcagContrast(candidate, background) >= minimum) return candidate;
  }
  return foreground(background);
}
/**
 * A brand colour too close to the mode's surface (a near-black "ink" primary in dark mode)
 * would render filled controls invisible. Neutral ink inverts to the mode's text colour;
 * other hues move in lightness until the fill stands 3:1 from the surface.
 */
function distinct(seed: string, surface: string, dark: boolean): string {
  if (wcagContrast(seed, surface) >= 3) return seed;
  const chroma = toOklch(seed)!.c;
  if (chroma < 0.03) return dark ? '#fafafa' : '#18181b';
  return readable(seed, surface, dark, 3);
}
function palette(seeds: Required<ThemeInput>, dark: boolean): ThemeTokens {
  const surface = dark ? '#18181b' : '#ffffff';
  const subtle = dark ? '#27272a' : '#f4f4f5';
  const primary = distinct(seeds.primary, surface, dark);
  const secondary = distinct(seeds.secondary, surface, dark);
  const accent = distinct(seeds.accent, surface, dark);
  const p = toOklch(primary)!;
  const s = toOklch(secondary)!;
  const primarySoft = shade(primary, dark ? 0.26 : 0.96, 0.22);
  const secondarySoft = shade(secondary, dark ? 0.26 : 0.96, 0.22);
  // Text tokens sit on the subtle surface and on their own soft fill (selected rows, badges).
  const onSoft = (seed: string, soft: string) => readable(readable(seed, subtle, dark), soft, dark);
  return {
    canvas: dark ? '#09090b' : '#fafafa',
    surface,
    'surface-subtle': subtle,
    text: dark ? '#fafafa' : '#18181b',
    muted: dark ? '#a1a1aa' : '#52525b',
    border: dark ? '#2e2e33' : '#e4e4e7',
    'control-border': {
      subtle: dark ? '#52525b' : '#d4d4d8',
      balanced: dark ? '#71717a' : '#a1a1aa',
      strong: dark ? '#7c7c85' : '#71717a',
    }[seeds.borderStrength],
    primary,
    'primary-hover': shade(
      primary,
      Math.max(0, Math.min(1, p.l + (foreground(primary) === '#ffffff' ? -0.035 : 0.035))),
    ),
    'primary-foreground': foreground(primary),
    'primary-soft': primarySoft,
    'primary-text': onSoft(primary, primarySoft),
    secondary,
    'secondary-hover': shade(
      secondary,
      Math.max(0, Math.min(1, s.l + (foreground(secondary) === '#ffffff' ? -0.035 : 0.035))),
    ),
    'secondary-foreground': foreground(secondary),
    'secondary-soft': secondarySoft,
    'secondary-text': onSoft(secondary, secondarySoft),
    accent,
    'accent-foreground': foreground(accent),
    success: dark ? '#86efac' : '#166534',
    'success-soft': dark ? '#052e16' : '#dcfce7',
    warning: dark ? '#fcd34d' : '#92400e',
    'warning-soft': dark ? '#451a03' : '#fef3c7',
    danger: dark ? '#fca5a5' : '#991b1b',
    'danger-soft': dark ? '#450a0a' : '#fee2e2',
    focus: readable(primary, subtle, dark, 3),
  };
}
function diagnose(light: ThemeTokens, dark: ThemeTokens): ContrastDiagnostic[] {
  const pairs: [TokenName, TokenName, number][] = [
    ['text', 'surface', 4.5],
    ['muted', 'surface', 4.5],
    ['primary-foreground', 'primary', 4.5],
    ['primary-foreground', 'primary-hover', 4.5],
    ['secondary-foreground', 'secondary', 4.5],
    ['secondary-foreground', 'secondary-hover', 4.5],
    ['accent-foreground', 'accent', 4.5],
    ['primary-text', 'surface', 4.5],
    ['secondary-text', 'surface', 4.5],
    ['primary-text', 'surface-subtle', 4.5],
    ['secondary-text', 'surface-subtle', 4.5],
    ['primary-text', 'primary-soft', 4.5],
    ['secondary-text', 'secondary-soft', 4.5],
    ['focus', 'surface-subtle', 3],
    ['success', 'success-soft', 4.5],
    ['warning', 'warning-soft', 4.5],
    ['danger', 'danger-soft', 4.5],
    ['focus', 'surface', 3],
    ['primary', 'surface', 3],
    ['secondary', 'surface', 3],
    ['control-border', 'surface', 3],
    ['control-border', 'surface-subtle', 3],
  ];
  return (['light', 'dark'] as const).flatMap((mode) =>
    pairs.map(([fg, bg, minimum]) => {
      const t = mode === 'light' ? light : dark;
      const ratio = wcagContrast(t[fg], t[bg]);
      return { mode, role: `${fg} / ${bg}`, ratio, minimum, passes: ratio >= minimum };
    }),
  );
}
export function createTheme(input: ThemeInput = {}): ResolvedTheme {
  if (
    Object.keys(input).some(
      (k) =>
        ![
          'primary',
          'secondary',
          'accent',
          'radius',
          'density',
          'controlRadius',
          'composerRadius',
          'buttonRadius',
          'pillRadius',
          'cardRadius',
          'tagRadius',
          'borderStrength',
          'borderWidth',
          'fieldSurface',
          'elevation',
          'motion',
        ].includes(k),
    )
  )
    throw new Error('Unknown theme option.');
  const seeds: Required<ThemeInput> = {
    primary: hex(input.primary ?? '#171717'),
    secondary: hex(input.secondary ?? '#7c3aed'),
    accent: hex(input.accent ?? '#0f766e'),
    radius: input.radius ?? 12,
    density: input.density ?? 'comfortable',
    controlRadius: input.controlRadius ?? 10,
    composerRadius: input.composerRadius ?? 16,
    buttonRadius: input.buttonRadius ?? input.controlRadius ?? 10,
    pillRadius: input.pillRadius ?? 999,
    cardRadius: input.cardRadius ?? input.radius ?? 12,
    tagRadius: input.tagRadius ?? 999,
    borderStrength: input.borderStrength ?? 'strong',
    borderWidth: input.borderWidth ?? 1,
    fieldSurface: input.fieldSurface ?? 'plain',
    elevation: input.elevation ?? 'soft',
    motion: input.motion ?? 'system',
  };
  if (
    [seeds.radius, seeds.controlRadius, seeds.composerRadius, seeds.cardRadius].some(
      (n) => !Number.isInteger(n) || n < 0 || n > 24,
    ) ||
    [seeds.buttonRadius, seeds.pillRadius, seeds.tagRadius].some(
      (n) => !Number.isInteger(n) || n < 0 || n > 999,
    ) ||
    !['comfortable', 'compact'].includes(seeds.density) ||
    !['subtle', 'balanced', 'strong'].includes(seeds.borderStrength) ||
    ![1, 2].includes(seeds.borderWidth) ||
    !['plain', 'tinted'].includes(seeds.fieldSurface) ||
    !['flat', 'soft', 'lifted'].includes(seeds.elevation) ||
    !['system', 'reduced'].includes(seeds.motion)
  )
    throw new Error('Invalid theme geometry or appearance option.');
  const light = palette(seeds, false);
  const dark = palette(seeds, true);
  return {
    schemaVersion: 2,
    resolverVersion: 2,
    seeds,
    light,
    dark,
    diagnostics: diagnose(light, dark),
  };
}
export const defaultTheme = createTheme();
/** Geometry edits preserve resolved colour overrides; brand edits intentionally regenerate the palette. */
export function updateTheme(theme: ResolvedTheme, input: ThemeInput): ResolvedTheme {
  const current = importTheme(JSON.stringify(theme));
  const seeds: ThemeInput = { ...current.seeds, ...input };
  // A per-role radius keeps following its base radius until it is set on its own.
  if (
    input.controlRadius !== undefined &&
    input.buttonRadius === undefined &&
    current.seeds.buttonRadius === current.seeds.controlRadius
  )
    seeds.buttonRadius = input.controlRadius;
  if (
    input.radius !== undefined &&
    input.cardRadius === undefined &&
    current.seeds.cardRadius === current.seeds.radius
  )
    seeds.cardRadius = input.radius;
  const next = createTheme(seeds);
  if (
    !(['primary', 'secondary', 'accent'] as const).some(
      (key) => input[key] !== undefined && input[key] !== current.seeds[key],
    )
  ) {
    for (const mode of ['light', 'dark'] as const) {
      const border = next[mode]['control-border'];
      next[mode] = { ...current[mode] };
      if (
        input.borderStrength !== undefined &&
        input.borderStrength !== current.seeds.borderStrength
      )
        next[mode]['control-border'] = border;
    }
    next.diagnostics = diagnose(next.light, next.dark);
  }
  return next;
}
/**
 * The Matrix fill level at which the primary foreground reads better than body text on the
 * primary fill over the subtle surface. The fill ramps from 8% to 100% primary across levels.
 */
function matrixFlip(tokens: ThemeTokens): number {
  const fill = interpolate([tokens['surface-subtle'], tokens.primary], 'rgb');
  for (let step = 0; step <= 100; step++) {
    const level = step / 100;
    const colour = formatHex(fill(0.08 + level * 0.92));
    if (wcagContrast(tokens['primary-foreground'], colour) >= wcagContrast(tokens.text, colour))
      return level;
  }
  return 2;
}
export function themeToCSS(
  theme: ResolvedTheme,
  scope = 'brand',
  appearance: Appearance = 'system',
): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(scope)) throw new Error('Invalid theme scope identifier.');
  if (!['light', 'dark', 'system'].includes(appearance))
    throw new Error('Invalid theme appearance.');
  const checked = importTheme(JSON.stringify(theme));
  const selector = `[data-ai-theme="${scope}"]`;
  const s = checked.seeds;
  const shadows = {
    flat: ['none', 'none'],
    soft: ['0 4px 16px rgb(0 0 0 / .1)', '0 12px 40px rgb(0 0 0 / .16)'],
    lifted: ['0 8px 28px rgb(0 0 0 / .18)', '0 20px 70px rgb(0 0 0 / .24)'],
  }[s.elevation];
  const geometry = `--ai-radius:${s.radius}px;--ai-control-radius:${s.controlRadius}px;--ai-composer-radius:${s.composerRadius}px;--ai-button-radius:${s.buttonRadius}px;--ai-radius-pill:${s.pillRadius}px;--ai-radius-card:${s.cardRadius}px;--ai-radius-tag:${s.tagRadius}px;--ai-border-width:${s.borderWidth}px;--ai-field-background:var(--ai-${s.fieldSurface === 'tinted' ? 'surface-subtle' : 'surface'});--ai-shadow-popover:${shadows[0]};--ai-shadow-dialog:${shadows[1]};--ai-control-height:${s.density === 'compact' ? 32 : 36}px;`;
  const spacing = `--ai-gap:${s.density === 'compact' ? 8 : 12}px;--ai-field-gap:${s.density === 'compact' ? 4 : 8}px;--ai-panel-padding:${s.density === 'compact' ? 12 : 16}px;`;
  const block = (mode: 'light' | 'dark') =>
    `${selector}{${tokenNames.map((key) => `--ai-${key}:${checked[mode][key]};`).join('')}${geometry}${spacing}--ai-matrix-flip:${matrixFlip(checked[mode])};color-scheme:${mode};}`;
  const css =
    appearance === 'system'
      ? `${block('light')}\n@media(prefers-color-scheme:dark){${block('dark')}}`
      : block(appearance);
  return (
    css +
    (s.motion === 'reduced'
      ? `\n${selector} *,${selector} *::before,${selector} *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}`
      : '')
  );
}
export function exportTheme(theme: ResolvedTheme): string {
  return JSON.stringify(importTheme(JSON.stringify(theme)), null, 2);
}
export function importTheme(json: string): ResolvedTheme {
  if (json.length > 32_000) throw new Error('Theme file exceeds 32 KB.');
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid theme document.');
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) =>
        !['schemaVersion', 'resolverVersion', 'seeds', 'light', 'dark', 'diagnostics'].includes(k),
    ) ||
    !(
      (v.schemaVersion === 1 && v.resolverVersion === 1) ||
      (v.schemaVersion === 2 && v.resolverVersion === 2)
    ) ||
    !v.seeds ||
    typeof v.seeds !== 'object' ||
    Array.isArray(v.seeds)
  )
    throw new Error('Unsupported theme document.');
  const legacy = v.schemaVersion === 1;
  if (
    legacy &&
    Object.keys(v.seeds).some(
      (k) => !['primary', 'secondary', 'accent', 'radius', 'density'].includes(k),
    )
  )
    throw new Error('Invalid legacy theme options.');
  const seeds = v.seeds as ThemeInput;
  const base = createTheme(
    legacy
      ? {
          ...seeds,
          controlRadius: seeds.radius ?? 10,
          composerRadius: seeds.radius ?? 10,
          borderStrength: 'strong',
          elevation: 'lifted',
        }
      : seeds,
  );
  for (const mode of ['light', 'dark'] as const) {
    const tokens = v[mode];
    if (
      !tokens ||
      typeof tokens !== 'object' ||
      Array.isArray(tokens) ||
      Object.keys(tokens).length !== tokenNames.length ||
      Object.keys(tokens).some((k) => !tokenNames.includes(k as TokenName))
    )
      throw new Error('Invalid theme tokens.');
    for (const key of tokenNames) {
      const color = (tokens as Record<string, unknown>)[key];
      if (typeof color !== 'string') throw new Error('Invalid theme colour.');
      base[mode][key] = hex(color);
    }
  }
  base.diagnostics = diagnose(base.light, base.dark);
  return base;
}

// Presentation options per component; also exported from the root entry. This entry has no
// client directive, so server code can read them.
export { componentVariants, resolveVariant } from './shared/variants.js';
export type { ComponentVariant, VariantComponent } from './shared/variants.js';
