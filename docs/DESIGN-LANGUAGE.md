# Design language

The rules every Unseen UI component follows. [Theming](THEMING.md) covers the `AITheme` API; this page covers the decisions behind the defaults and the standards a new or changed component must meet.

## Principles

1. **State before decoration.** Colour, weight and motion exist to say what is interactive, selected, changed or blocked. If an effect doesn't carry state, leave it out.
2. **One signal colour.** The brand primary marks actions, focus and selection. Semantic colours (success, warning, danger) mark outcomes only. Everything else is neutral.
3. **Flat by default, elevated when floating.** Reading surfaces use a border or spacing, never a shadow. Only menus, popovers, toasts and dialogs cast shadows, because only they sit above the page.
4. **Dense but legible.** The product serves people scanning runs, tables and tool output for hours. Default to compact rhythm with a 12px minimum for any text.
5. **The host is the authority.** Components show host state, including unknown and stale. A rendered status never implies success the host didn't report.
6. **Tasks choose the shape.** A tool call is a record, an approval is a decision and a run is a row on a board. Only conversation turns look like messages.

## Colour

Colours resolve from three seeds (`primary`, `secondary`, `accent`) into the role tokens listed in [theming](THEMING.md). The neutral ramp is fixed so every brand sits on the same graphite base.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `#fafafa` | `#09090b` | Application background behind surfaces |
| `surface` | `#ffffff` | `#18181b` | Panels, cards, fields, menus |
| `surface-subtle` | `#f4f4f5` | `#27272a` | Hover fills, code, quiet groupings |
| `border` | `#e4e4e7` | `#2e2e33` | Decorative separators and surface edges |
| `control-border` | `#71717a` | `#a1a1aa` | Required field and control boundaries (3:1) |
| `text` | `#18181b` | `#fafafa` | Body and headings |
| `muted` | `#52525b` | `#a1a1aa` | Secondary text; still 4.5:1 |

Rules:

- `primary` fills one action per region, and draws focus rings and selected indicators. Don't use it for headings, icons-as-decoration or large fills.
- `primary-soft` with `primary-text` is the selected/informational pair, used for selected rows, the primary badge tone and active filters. The resolver guarantees 4.5:1 for this pair in both appearances.
- Semantic soft/strong pairs (`success-soft` + `success`, and so on) are for status only, and always come with a label or icon. Colour alone never carries meaning.
- No gradients, glass or tinted shadows in components.
- Component CSS falls back to the default light palette (`var(--ai-muted, #52525b)`), so unwrapped markup matches the resolved default theme.

## Typography

One family (`--ai-font-family`, system stack by default), four sizes, three weights.

| Token | Default | Weight | Use |
| --- | --- | --- | --- |
| `--ai-font-size-heading` | 16px | 600 | Component titles (card, panel, dialog headings) |
| `--ai-font-size` | 14px | 400 | Body, prose, field values |
| `--ai-font-size-meta` | 13px | 400 / 500 | Secondary text, field labels, button and menu labels |
| `--ai-font-size-caption` | 12px | 500 | Badges, counts, timestamps, column headers, helper text |

- Weights are 400, 500 and 600 only. Intermediate weights (550, 650) render inconsistently across fallback fonts.
- Line height: 1.5 for UI text, 1.6 to 1.65 for prose, 1.4 for headings and single-line controls.
- Uppercase is reserved for short group labels (board columns, table group headers) at caption size, weight 600, `0.04em` tracking (Select and CommandPalette groups, Checklist eyebrow, TableOfContents title).
- Page and section headings belong to the host. Components start at `heading` size.
- Code uses `--ai-font-mono` at 12 to 13px.

## Spacing and density

A 4px grid: `2 4 8 12 16 24 32 48`. Half steps (6, 10) are allowed only for optical alignment inside controls.

| Token | Comfortable | Compact | Use |
| --- | --- | --- | --- |
| `--ai-gap` | 12px | 8px | Between sibling blocks in a component |
| `--ai-field-gap` | 8px | 4px | Label to control, control to hint |
| `--ai-panel-padding` | 16px | 12px | Surface inset |
| `--ai-control-height` | 36px | 32px | Buttons, inputs, selects; 32px for `size="sm"`; 44px on coarse pointers |

Use spacing and separators before adding another bordered container. A card inside a card needs a reason.

## Shape and elevation

| Token | Default | Applies to |
| --- | --- | --- |
| `--ai-control-radius` | 8px | Inputs, selects, buttons (via `--ai-button-radius`) |
| `--ai-radius` | 10px | Panels, menus, dialogs |
| `--ai-radius-card` | 10px | Card, LinkCard, Disclosure |
| `--ai-composer-radius` | 16px | Prompt composer |
| `--ai-radius-pill` / `--ai-radius-tag` | 999px | Chips, segmented controls, tags |
| 6px / 4px | fixed | Icon tiles, inline code, small markers |

Elevation has three levels: flat (surfaces, `none`), popover (`--ai-shadow-popover`) and dialog (`--ai-shadow-dialog`). Nothing else casts a shadow.

Layering order: backdrop 100, dialog and sheet 101, menu, popover and select 110, tooltip and toast 120, skip link 200.

## Motion

| Token | Default | Use |
| --- | --- | --- |
| `--ai-duration-fast` | 120ms | Hover, press and colour changes |
| `--ai-duration-base` | 200ms | Disclosure, overlays entering |
| `--ai-ease` | `cubic-bezier(0.2, 0, 0, 1)` | All UI transitions |

- Transitions apply only under `prefers-reduced-motion: no-preference`. `AITheme` `motion="reduced"` removes them regardless.
- Animate colour, opacity and transform. Never animate layout (height, width, top) on streaming content.
- Looping animation is for genuine activity (running, streaming, recording) and stops when the host reports a terminal state.

## Focus

- Buttons, links and rows get a 2px `--ai-focus` outline at a 3px offset.
- Text fields and the composer put the ring on the border (`-1px` offset) with a 3px halo at 22% focus colour.
- Focus is never removed without a visible replacement, and is visible in forced-colours mode.

## Component standards

Every component documents and tests these where they apply. Don't add states a component can't actually reach.

| Concern | Standard |
| --- | --- |
| Anatomy | Named parts exposed as `data-part`; root accepts `className` and `style` |
| Interaction states | hover, focus-visible, active/pressed, selected (`aria-selected`/`aria-pressed`/`aria-current`), disabled (`--ai-disabled-opacity`, no hover feedback) |
| Async states | idle, pending (request sent, no receipt), confirmed (host receipt), failed, unknown, stale |
| Content states | empty (says why, offers the next step), loading (skeleton the shape, not a spinner in a big box), error (what happened plus a recovery action) |
| Overflow | Long words wrap (`overflow-wrap: anywhere`), tables scroll inside a labelled region, no horizontal page scroll at 320px |
| Touch | 44px minimum target on coarse pointers; artwork may stay smaller |
| Themes | Verified in light, dark and forced colours; no colour-only meaning |
| API | Controlled value plus explicit callbacks; host-authoritative state is never local |

### Status tones

`StatusBadge` and the shared badge use one treatment: soft fill, strong text, no border, icon plus label.

| Tone | Pair | States |
| --- | --- | --- |
| neutral | `surface-subtle` / `muted` | queued, idle, cancelled, unknown |
| primary | `primary-soft` / `primary-text` | running, streaming, active |
| warning | `warning-soft` / `warning` | needs review, waiting, stale |
| success | `success-soft` / `success` | complete, passed, approved |
| danger | `danger-soft` / `danger` | failed, denied, error |

### AI surfaces

- User turns are right-aligned on `surface-subtle`. Assistant turns are unframed prose with a role label. System and status lines are caption-size and muted.
- Tool activity is a record (name, state, input/output disclosure), not a chat bubble.
- Approvals show the action, scope, risk and version before the buttons. The approving button is the region's single primary action, and rejecting is always available.
- Long-running work shows elapsed or host-reported progress, never invented percentages. Unknown duration is labelled as such.
- Raw payloads, logs and metadata sit behind a disclosure. The summary line must make sense to someone who never opens it.
