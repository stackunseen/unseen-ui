# Theming

The theme API resolves brand colours and geometry into scoped CSS variables. Use AITheme in React, or the pure helpers to resolve and export CSS, TypeScript or versioned JSON.

## Configure a theme

Import AITheme from the root and pure theme helpers from `/theme`. Theme Studio includes composer, Select, dialog and loading previews. The `/design/` gallery page explains the visual rules.

```tsx
'use client';
import { useState } from 'react';
import { AITheme, PromptInput } from '@stackunseen/ui';
import { createTheme, updateTheme, exportTheme, importTheme } from '@stackunseen/ui/theme';
import '@stackunseen/ui/styles.css';

const theme = createTheme({
  primary: '#2563eb', secondary: '#7c3aed', accent: '#0f766e',
  radius: 10, controlRadius: 8, composerRadius: 16,
  borderStrength: 'strong', borderWidth: 1,
  fieldSurface: 'plain', elevation: 'soft',
  density: 'comfortable', motion: 'system',
});
const compact = updateTheme(theme, { density: 'compact' });
const restored = importTheme(exportTheme(compact));
export function ThemedPrompt({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <AITheme theme={restored} appearance="system">
      <PromptInput value={draft} onValueChange={setDraft} onSubmit={onSubmit} />
    </AITheme>
  );
}
```

| Option | Allowed values | Applies to |
| --- | --- | --- |
| primary / secondary / accent | Opaque six-digit hex | Resolved light/dark brand palette. A seed within 3:1 of the mode's surface is adjusted for that mode: neutral ink inverts to the text colour, other hues shift in lightness, so filled controls stay visible in both appearances |
| radius | Integer 0–24px | General panels and floating surfaces |
| controlRadius / composerRadius | Integer 0–24px | Inputs/selects and composers respectively |
| buttonRadius / pillRadius / cardRadius / tagRadius | Integers; button and card 0–24px, pill and tag 0–999px | Buttons (default controlRadius), chips and segmented controls (default 999), Card/LinkCard/Disclosure surfaces (default radius) and Tag labels (default 999). Emitted as `--ai-button-radius`, `--ai-radius-pill`, `--ai-radius-card` and `--ai-radius-tag` |
| borderStrength | subtle / balanced / strong | Field and outline-control boundary colour |
| borderWidth | 1 / 2px | Field/composer/outline-button thickness; decorative dividers stay fine |
| fieldSurface | plain / tinted | Input/composer/default Select fill; explicit filled/ghost variants retain their own treatment |
| elevation | flat / soft / lifted | Popover and dialog shadows; cards remain flat |
| density | comfortable / compact | Shared gaps, field gaps, panel padding and minimum control height; explicit compact variants retain their layout |
| motion | system / reduced | Follow OS preference or always disable animation; never override OS reduced motion |

CSS roles include `--ai-control-radius`, `--ai-composer-radius`, `--ai-border-width`, `--ai-field-background`, `--ai-shadow-popover`, `--ai-shadow-dialog`, `--ai-gap`, `--ai-field-gap`, `--ai-panel-padding`, and existing semantic colour variables. Icon selection remains an IconsProvider configuration, not a theme document field.

The default uses the Strong contrast boundary (`#71717a` light / `#a1a1aa` dark). Its token pairs meet 3:1 against both plain and tinted surfaces. Decorative separators retain their subtle border. Explicit Subtle/Balanced choices and imported resolved palettes remain available; diagnostics report shortfalls against both surface roles. A focus outline alone does not fix a low-contrast resting field. Token-pair diagnostics are not a full accessibility audit.

Measured on 2026-10-14 with the default palette: muted text (`#52525b` light, `#a1a1aa` dark) reaches at least 6.3:1 light and 5.8:1 dark on every surface role (surface, subtle, canvas and the primary, secondary, success, warning and danger soft tints), so secondary copy passes AA without a host override. Dimmed text no longer uses opacity on tinted rows: the count inside a pressed ToggleGroup option and the hint inside a selected CommandPalette row were at 3.3:1 and 3.6:1 light through 80% and 85% opacity and now inherit the full colour. Disabled controls use `--ai-disabled-opacity`, raised from 55% to 62%, which puts disabled body text at 4.9:1 light and 7.1:1 dark; disabled muted text stays near 3:1, which WCAG exempts, so keep muted copy out of disabled states. A host that substitutes its own muted colour must re-measure: a mid-grey such as `#63636b` on a tinted surface falls to about 4.5:1.

Default/compact geometry uses 36/32px control heights, 16/12px panel padding, 12/8px content gaps and 8/4px label gaps. Small buttons remain 32px; coarse-pointer controls and labelled choices use at least 44px. Imported colours stay unchanged; shared geometry follows these density rules.

Version 2 JSON imports only validated values. Legacy v1 files migrate with their resolved colours preserved and their single radius mapped to all three corner roles. `updateTheme` preserves custom colour overrides for geometry changes; a changed brand colour intentionally rebuilds the palette. Border-strength edits update only that boundary token. Exported CSS scopes every selector. No arbitrary shadow/CSS string is accepted in the configuration.

## Scope, typography and portals

AITheme accepts either a resolved `theme` or a flat `config: ThemeInput`. Its `appearance` is light, dark or system. Nested themes inherit effective settings unless `isolated` is true. `className`, `style` and other native div props apply to the wrapper. Changing theme props does not require remounting its children or a runtime/model provider.

There is no ThemeInput font field. Use `--ai-font-family` and `--ai-font-size` in application CSS. The rest of the scale is also variable-driven: `--ai-font-size-heading` (16px), `--ai-font-size-meta` (13px, for labels and secondary text), `--ai-font-size-caption` (12px, for badges, counts and timestamps) and `--ai-font-mono`. Motion uses `--ai-duration-fast` (120ms), `--ai-duration-base` (200ms) and `--ai-ease`. State transitions run only when the OS allows motion. [Design language](DESIGN-LANGUAGE.md) records when to use each step.

`primary-text` and `secondary-text` are resolved to reach 4.5:1 on both `surface-subtle` and their own soft tint, and diagnostics report both pairs. Before 2026-10-16 some brand seeds (rose, amber, green) fell to about 4.2:1 on the tint. Resolved configuration and appearance follow themed portals; arbitrary wrapper styles/classes and locally inherited CSS variables do not automatically copy to them. Put typography variables at an application-wide scope when they must reach body portals. See [minimal customization](CUSTOMIZATION.md).

Use `nonce` when the host CSP requires a nonce on generated style elements. For CSS-only use, call `themeToCSS(theme, scope, appearance)` and apply the matching `data-ai-theme` attribute. The resolver validates configuration values; raw CSS is not a theme-import format. A restrictive deployed CSP and host-specific token mapping still need integration checks.

Generated CSS Module names are private. Use semantic variables and the public element's className/style rather than copying those names. The library does not require a global reset or Tailwind. Runtime application code owns preference storage; AITheme does not read localStorage or change the document theme.

## Icons and component variants

IconsProvider configures semantic SVG roles separately from the theme document. It supports local SVGs and compatible external icon components, including nested overrides. Theme JSON does not serialize the gallery's Radix/Lucide preview selection. See [controls and icons](CONTROLS-AND-ICONS.md).

Theme density sets shared geometry. Component variants select the layouts or intents supported by that family; no universal size/variant prop exists. [Website components](WEBSITE-COMPONENTS.md) and [presentation variants](VARIANTS.md) describe the available choices.

## Contrast feedback

Diagnostics report foreground/background pairs and thresholds for the resolved palette. They do not establish accessibility for arbitrary host CSS, transparencies or composed content. The editor retains failed and unverified states rather than treating an unknown measurement as a pass.

Text, focus indicators and field boundaries require separate checks. Status labels and icons remain necessary when colours look similar. Preserve OS reduced motion and forced-colour behavior when adding application styles. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) describe the different criteria.
