# Presentation variants

A component's `variant` selects presentation. It does not change lifecycle, permissions or controlled data. The tables below list the presentation registry; [website components](WEBSITE-COMPONENTS.md) expose their own props and compound parts.

## Choosing a style

The first value in each row is the default.

| Component | `variant` values (default first) |
| --- | --- |
| PromptInput | `standard` · `compact` · `inline` |
| Message | `plain` · `bubble` · `panel` |
| MessageActions | `toolbar` · `compact` · `vertical` |
| StreamingResponse | `cursor` · `dots` · `shimmer` |
| Suggestions | `chips` · `cards` · `list` |
| Attachment | `row` · `tile` · `compact` |
| StatusBadge | `soft` · `outline` · `plain` |
| AgentCard | `card` · `row` · `profile` |
| AgentSteps | `timeline` · `cards` · `compact` |
| ExecutionTimeline | `timeline` · `table` · `compact` |
| ToolCall | `card` · `terminal` · `compact` |
| ToolResult | `code` · `text` · `expandable` |
| ToolGroup | `stack` · `grid` · `accordion` |
| ApprovalCard | `card` · `banner` · `split` |
| PermissionRequest | `card` · `banner` · `compact` |
| ClarificationRequest | `card` · `inline` · `stacked` |
| SourceCard | `card` · `row` · `compact` |
| Citation | `chip` · `inline` · `number` |
| EvidenceGroup | `stack` · `grid` · `accordion` |
| GroundingStatus | `bar` · `ring` · `text` |
| ArtifactPanel | `dialog` · `sheet` · `fullscreen` |
| ArtifactPreview | `document` · `code` · `compact` |
| MCPServerCard | `card` · `row` · `compact` |
| MCPToolList | `list` · `cards` · `accordion` |
| ContextBar | `list` · `chips` · `compact` |
| Workflow | `list` · `steps` · `cards` |
| ConnectionStatus | `banner` · `card` · `compact` |
| ModelControls | `panel` · `compact` · `accordion` |
| ContextInspector | `list` · `table` · `accordion` |
| PolicyStatus | `list` · `cards` · `accordion` |
| LoadingIndicator | `spinner` · `dots` · `bars` |
| Skeleton | `shimmer` · `pulse` · `static` |
| Select | `outline` · `filled` · `ghost` |
| Accordion | `divided` · `bordered` · `separated` |
| Tabs | `underline` · `segmented` · `pills` |

| Extended component | Presentations |
| --- | --- |
| ThreadList | `list` · `cards` · `compact` |
| BranchSwitcher | `segmented` · `select` · `cards` |
| MessageQueue | `list` · `cards` · `compact` |
| AgentHandoff | `card` · `banner` · `compact` |
| ReviewChanges | `accordion` · `stack` · `compact` |
| AIForm | `stacked` · `grid` · `compact` |
| GeneratedUI | `stack` · `cards` · `compact` |
| DataTable | `table` · `cards` · `compact` |
| Chart | `bar` · `line` · `area` |
| MemoryControls | `list` · `cards` · `compact` |
| ArtifactDiff | `unified` · `split` · `compact` |
| WorkflowGraph | `graph` · `list` · `compact` |
| AuditTrail | `timeline` · `table` · `compact` |
| RunInspector | `accordion` · `cards` · `compact` |
| MarkdownResponse | `cursor` · `dots` · `shimmer` |
| MarkdownCodeBlock | `panel` · `minimal` · `numbered` |
| RichMarkdownResponse | `cursor` · `dots` · `shimmer` |
| MathFormula | `block` · `inline` · `scroll` |
| MermaidDiagram | `panel` · `minimal` · `source` |
| SlashCommandMenu | `list` · `cards` · `compact` |
| MentionPicker | `list` · `cards` · `compact` |
| ReasoningControl | `slider` · `segmented` · `select` |
| AccessModeSelector | `cards` · `compact` · `select` |
| VoiceControl | `panel` · `bar` · `compact` |
| FileExplorer | `folders` · `list` · `compact` |
| CodeDiff | `unified` · `split` · `compact` |
| TerminalOutput | `console` · `log` · `compact` |
| TestResults | `list` · `cards` · `compact` |

Button offers `primary`, `secondary`, `outline`, `ghost` and `danger`. The generic Modal helper uses `layout="dialog" | "sheet" | "fullscreen"`; ArtifactPanel maps its own `variant` to this layout. Panel, AITheme, IconsProvider and runtime providers remain composition helpers, rather than additional domain families or style-selector entries.

```tsx
import {
  AITheme, LoadingIndicator, Skeleton, PromptInput, Accordion,
  componentVariants, resolveVariant,
} from '@stackunseen/ui';
import type { ComponentVariant } from '@stackunseen/ui';
import '@stackunseen/ui/styles.css';

const loadingStyle: ComponentVariant<'LoadingIndicator'> = 'bars';

// The application owns draft, setDraft and send.
<AITheme config={{ primary: '#166534', secondary: '#92400e' }} appearance="dark">
  <PromptInput variant="inline" value={draft} onValueChange={setDraft} onSubmit={send} />
  <LoadingIndicator variant={loadingStyle} label="Searching sources" />
  <Skeleton variant="shimmer" shape="card" lines={4} label="Loading results" />
  <Accordion variant="separated" type="multiple" items={sections} />
</AITheme>;

// Validate strings coming from application settings before passing them to a component.
const selected = resolveVariant('PromptInput', userSettings.composerStyle);
const options = componentVariants.PromptInput;
```

`ComponentVariant<Name>` and `VariantProps<Name>` are exported TypeScript types. `componentVariants` is the typed registry used by the gallery and Storybook. `resolveVariant` returns the default when a string is missing or unknown. Components expect typed props; the helper is the boundary for untrusted string settings. This is a presentation registry, not a schema for generated executable UI.

## Behavior and accessibility

- All styles keep visible lifecycle text and accessible action names. Compact layouts do not turn consequential actions into unexplained icons.
- Approval styles retain scope, impact, version, expiry, rejection and approval controls. Stale decisions remain disabled. Input/output details can use a reusable accordion; decision-critical metadata remains visible.
- Tool summaries show failed and unknown outcomes even with details collapsed. Changing style never retries a tool.
- Source styles respect revoked/missing access. A collapsed source is not permission to render restricted content.
- WorkflowGraph preserves `graph` / `list` / `compact`: routed canvas, node adjacency and discovery outline respectively. Cycle/shared references are explicit; all connections remain available through disclosures. See [workflow contracts](WORKFLOWS.md).
- FileExplorer preserves `folders` / `list` / `compact`: nested disclosures, full-path detail cards and directory groups. All share bounded validation, controlled windows/filtering and snapshot-bound opening intents. See [file contracts](FILES.md).
- VoiceControl preserves `panel` / `bar` / `compact`: trailing footer, summary with adjacent actions, and restrained device disclosure respectively. Scoped capture/transcription data, hidden access states, keyboard-scrollable text and shared density/icons remain equivalent. See [voice contracts](VOICES.md).
- LoadingIndicator is indeterminate. It accepts `label` and `size` (`small`, `medium`, `large`); it never invents a percentage. Skeleton accepts `shape` (`text`, `card`, `avatar`) and bounds `lines` to 1–8 with a safe fallback for invalid numbers. Placeholder geometry is decorative; one status label describes the operation.
- Every animated loading style respects `prefers-reduced-motion`. Spinner/dots/bars remain visible without movement; shimmer/pulse resolve to static placeholders. The static skeleton never animates.
- StreamingResponse retains partial text during interruptions. A waiting shimmer is used only before actual response text exists; it does not hide received content.
- GroundingStatus draws a bar or ring only for a valid measured coverage fraction. Numeric coverage is a count of source-linked claims, not a correctness or confidence score.
- When displaying multiple tables from the same artifact together, set `ArtifactPreview.tableLabel` to distinguish their scroll regions without changing artifact identity or content.
- Dialog, sheet and fullscreen artifacts reuse the same Radix dialog for focus containment, Escape and focus return. They inherit the originating theme and icon provider.
- Select, Accordion and Tabs reuse Radix keyboard/focus behavior in every visual style. Accordions support controlled or local disclosure state; tabs and selects stay controlled. The gallery gives repeated accordion regions distinct accessible names for comparison.

## Theme and icon consistency

Variants share the existing semantic CSS variables. They do not add a second palette, override primary/secondary colors or require Tailwind in a consumer. CSS Modules compile into the package's ordinary `styles.css`. Filled surfaces use `--ai-surface-subtle`; text uses the appropriate text token; errors and warnings keep their semantic colors when branding changes. Consumers can use the existing scoped AITheme and IconsProvider independently of presentation. See [Theming](THEMING.md) and [Controls and icons](CONTROLS-AND-ICONS.md).

## Gallery and runnable examples

Open a component, select **Style** and **State**, or use **Compare 3 styles**. Style selects presentation; State selects synthetic fixture data. Changing style preserves a composer draft. Comparison renders independent examples; switching fixture state resets that example. The Code tab includes the chosen `variant` prop. Code fragments still require application-owned data/callbacks as documented beside them.

Run `pnpm storybook` for component states and theme comparisons. The [plain React consumer](../examples/consumer/src/main.tsx) exercises public imports without Tailwind.

## Optional compositions

| Component | Presentations | Guide |
| --- | --- | --- |
| ConversationViewport | thread / bubble / compact; virtual or bounded reading mode | [History](HISTORY-VIEWPORT.md) |
| WorkspaceShell | workspace / contained / compact | [Application layouts](APPLICATION-FOUNDATIONS.md) |
| Sidecar | docked / drawer / overlay | [Application layouts](APPLICATION-FOUNDATIONS.md) |
| SplitPane | split / stacked / responsive | [Application layouts](APPLICATION-FOUNDATIONS.md) |
| TerminalEmulator | console / log / compact | [Terminals](TERMINALS.md) |

These entries have separate peer requirements. See [Getting Started](GETTING-STARTED.md#choose-the-right-entry).
