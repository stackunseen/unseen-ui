# Minimal customization

Start with Unseen UI's theme defaults, then use the component's supported variants, content slots and root styling. Follow [Getting Started](GETTING-STARTED.md) to build the private workspace packages and import the shared stylesheet first. The options below use the existing `@stackunseen/ui` API and require no new configuration package.

## Theme defaults

`AITheme` supports primary/secondary/accent brand seeds, light/dark/system appearance, radius and comfortable/compact density. It also exposes the implemented corner, border, field-surface, elevation and motion choices described in [theming](THEMING.md). Nested themes inherit their parent; `isolated` starts from defaults.

Font family and font size use CSS variables rather than ThemeInput fields:

```css
:root {
  --ai-font-family: Arial, sans-serif;
  --ai-font-size: 14px;
}
```

These application-wide variables also reach body portals. Variables set only on an AITheme root inherit through that DOM subtree; ThemeSurface does not copy arbitrary root styles or classes to a portal. Resolved theme configuration and appearance do follow portals. Import the library stylesheet once, followed by application CSS.

## Size and variant

Use options that the component actually exposes. Button supports `size="default" | "sm"` and primary, secondary, outline, ghost and danger variants. LoadingIndicator has small, medium and large sizes. AI families have the presentations listed in [the variant guide](VARIANTS.md). Other controls use theme density and their own documented props; there is no universal size/variant contract.

## Content and icons

The library's default icons are inline SVG components from `@radix-ui/react-icons`. The gallery's alternative preview uses Lucide; consumers do not need Lucide unless their application imports it. A locally authored SVG needs no icon package.

```tsx
'use client';
import {
  AIIcon,
  Button,
  IconsProvider,
  type IconComponent,
} from '@stackunseen/ui';

const SendIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="m5 12 14-7-5 14-2-5-7-2Z" />
  </svg>
);

export function SendAction({ onSend }: { onSend: () => void }) {
  return (
    <IconsProvider icons={{ send: SendIcon }}>
      <Button onClick={onSend}>
        <AIIcon name="send" />
        Send
      </Button>
    </IconsProvider>
  );
}
```

Provider overrides apply by semantic role, including through React portals. Nested providers merge roles. An explicit `<AIIcon name="send" icon={SendIcon} />` wins over the provider; `null` hides a decorative icon. Instance size wins over provider size, including sizes set inside a component. `fallbackIcon` is used only when neither a provider role nor a built-in default supplies the icon.

IconButton accepts a semantic role name, not an SVG component. Wrap a single IconButton in a provider for a local replacement, or compose Button with custom children. Keep the accessible label when replacing icons. AIIcon itself is decorative and accepts `size` and wrapper `className`; the supplied SVG component owns its detailed SVG props.

Natural content slots include Alert's `icon`, Sidebar.Link's `icon`, EmptyStateIcon, PromptInput's `attachments`/`toolbar`, Message's `renderContent`, WorkspaceShell's regions and Card.Header's actions. Compound cards, tables and overlays expose their parts for composition.

Menu check/radio indicators and navigation/submenu chevrons currently use internal text or CSS outside IconsProvider. Native checkbox/radio indicators and CSS loading spinners also do not use the icon provider. Replacing those internals is not a supported global icon-pack operation.

## Root styles and composition

Native-prop primitives and website component parts accept `className` and `style` on the element represented by that part. AITheme, Button, StatusBadge and WorkspaceShell also expose native root props. Older domain cards are not uniform: the scoped PermissionRequest and AgentHandoff APIs currently lack these root styling fields. Use their documented presentations and surrounding layout; do not rely on private generated CSS class names.

Use named public imports from `@stackunseen/ui`; there are no `/icons` or `/button` subpaths. ESM tree-shaking can remove unused exports, but runtime provider overrides do not erase the built-in icon registry from the bundle. Optional heavy renderers stay behind their [documented entries](GETTING-STARTED.md#choose-the-right-entry). CSS is an explicit shared import rather than a per-component stylesheet.
