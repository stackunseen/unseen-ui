# Shared controls and icons

Default fields use the Strong contrast boundary. Small buttons have 32px desktop targets; ordinary controls use 40px (36px compact), and coarse-pointer controls and labelled choices use at least 44px. Theme density sets shared spacing. Field errors use a danger boundary and associated text.

Import these controls from `@stackunseen/ui`. See [website components](WEBSITE-COMPONENTS.md) for native form controls, overlays and menus, or [customization](CUSTOMIZATION.md) for themes and styling.

## Select

`Select` wraps Radix Select. It accepts a controlled `value`, `onValueChange`, and `options` with unique non-empty values, text labels and optional disabled flags. Use `value=""` for the placeholder. Give the trigger an enclosing label, an explicit `id`/`htmlFor`, or `aria-label`. Trigger DOM props/ref, `name`, `required`, `disabled` and `dir` are supported. A disabled option cannot be chosen. This is a single-choice control; searchable multi-select is outside this API.

The popup uses the originating theme through `ThemeSurface`, including nested themes and portals inside dialogs. The trigger, selected text, highlighted option, border and focus ring consume semantic variables. Radix owns keyboard navigation, typeahead, focus restoration, collision positioning and the hidden native form control. That hidden form control is intentional; visible dropdowns use the custom popup.

```tsx
<label>
  Appearance
  <Select
    value={appearance}
    onValueChange={setAppearance}
    options={[
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ]}
  />
</label>
```

## Accordion

`Accordion` wraps Radix Accordion with typed `single` and `multiple` modes. Each item has a stable value, title, content and optional disabled flag. Single mode accepts `collapsible`; controlled `value`/`onValueChange` and local `defaultValue` follow their respective mode types. `headingLevel` defaults to 3 and can be 2–6. Supply plain text or non-interactive title content: the title is already inside a button. Arrow keys, Home and End move between enabled triggers; Enter/Space toggles a panel.

```tsx
<Accordion
  type="multiple"
  defaultValue={['input']}
  items={[
    { value: 'input', title: 'Input', content: <ToolArguments /> },
    { value: 'output', title: 'Output', content: <ToolOutput /> },
  ]}
/>
```

Tool arguments, step details, integration notes, contrast details, theme import and recovery scenarios use accordions. Approval system, impact, scope and expiry remain visible metadata. Their description-list semantics are intentional: a description list is not a disclosure interaction, and decision-critical facts should not require expansion.

Accordion disclosure is local UI state, separate from host execution state. Content unmounts on collapse by default. Set an item's `keepMounted: true` to preserve local form drafts; closed content remains hidden and outside keyboard navigation. Keep execution state in your app. Changing a disclosure never authorizes or retries an action.

## Button and IconButton

`Button` accepts `size="sm"` for a 32px desktop secondary control. Primary decisions keep the default density. `IconButton` reuses Button and AIIcon, takes a required `label` and semantic `icon`, and keeps native button keyboard/disabled semantics. Its desktop hit box is 32px; coarse-pointer hit boxes are 44px. A primary icon action follows the theme control height with a 36px minimum. The accessible name remains the required `label`; actions are visible without hovering.

IconButton displays a non-interactive themed hint on visible keyboard focus or non-touch pointer hover. The pointer can cross into the hint; Escape, activation or blur dismisses it without swallowing the enclosing dialog's Escape behavior. `title` optionally supplies different hint text and an associated accessible description; it is not forwarded as a native browser title. A repeated label is not redundantly announced. Existing `aria-describedby` IDs remain composed with a distinct hint description. The visual hint follows the originating theme through its portal and stays within the measured viewport; disabled/hidden buttons and touch hover do not show it. This is an IconButton behavior, not a standalone public tooltip API.

```tsx
<IconButton icon="edit" label="Edit message 1" onClick={openDraftEditor} />
<IconButton icon="delete" label="Remove message 1" disabled={pending} onClick={requestRemoval} />
<Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel edit</Button>
```

Keep row actions beside their content. Inline editors support Escape and return focus when the opening control still exists. Selection, order, removal and saved text change only when the host supplies replacement data. A `null` icon override reveals the action label.

Additional semantic roles are `archive`, `delete`, `search`, `moveUp`, `moveDown`, `helpful`, `unhelpful` and `microphone`. Less common glyphs use `AIIcon.fallbackIcon`; provider and explicit instance overrides take precedence.

### Decision placement

Decision controls use a labelled, trailing action group with wrapping and at least 8px separation. Secondary/cancel precedes primary in DOM and keyboard order. Button, Select, Accordion and Tabs retain 44px coarse-pointer targets. Keep decision-critical scope, impact and expiry visible.

## Icon providers

Default icons are named imports from `@radix-ui/react-icons` and render inline SVG. Lucide is an optional choice used by the gallery, not a dependency consumers must install. The microphone's local SVG fallback also passes through AIIcon. There is no remote image or icon-font request for these defaults.

Import IconsProvider and AIIcon from the package root. An explicit AIIcon `icon` wins over the provider; the provider wins over built-in defaults; `fallbackIcon` applies only to a role with no built-in default. Instance sizes, including internal component sizes, win over provider size. IconButton accepts a role name, so use a nested provider to replace one button's glyph. Runtime replacement does not remove the built-in registry from the bundle. Menu check/radio indicators and navigation chevrons currently remain outside this provider.

`IconsProvider` overrides semantic icon roles across a subtree. Nested providers merge only the supplied roles and inherit size. `null` hides a decorative icon. Defaults reuse `@radix-ui/react-icons`; consumers can supply Lucide, another SVG library or their own SVG component. SVG components must forward standard SVG props and use `currentColor` to follow theme/status colours. Icons stay decorative; keep the control's text or accessible name.

```tsx
import { IconsProvider, PromptInput } from '@stackunseen/ui';
import { Send, ChevronDown, Check } from 'lucide-react';

<IconsProvider icons={{ send: Send, expand: ChevronDown, check: Check }} size={18}>
  <PromptInput value={draft} onValueChange={setDraft} onSubmit={send} />
</IconsProvider>;
```

Built-in status/common roles: `expand`, `collapse`, `check`, `close`, `send`, `stop`, `assistant`, `user`, `info`, `tool`, `document`, `warning`, `external`, `retry`, `copy`, `edit`, `idle`, `pending`, `running`, `paused`, `unknown`. Additional action roles are listed above. `AIIcon` also accepts an instance `icon` override, `fallbackIcon`, `size` and `className`. Compact status/step indicators specify 12px locally. For a single component, wrap just that component in a nested provider. Provider scope follows React portals.

Theme Studio previews Radix and Lucide sets. Icon component code is not serialized into theme JSON.

Underlying APIs: [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) and [Radix Accordion](https://www.radix-ui.com/primitives/docs/components/accordion).
