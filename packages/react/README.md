# @stackunseen/ui

React components for **Unseen UI by Stack Unseen**: forms, overlays, navigation, chat, tool cards and approval controls.

Experimental alpha, published on npm under the `alpha` tag. MIT licensed.

## Use

Install the current alpha:

```sh
npm install @stackunseen/ui react@^19.3.0 react-dom@^19.3.0
```

Core installs as a dependency. Import the stylesheet once before application CSS, then wrap the components in `AITheme`:

```tsx
'use client';
import { AITheme, Button } from '@stackunseen/ui';
import '@stackunseen/ui/styles.css';

export function SaveButton({ onSave }: { onSave: () => void }) {
  return (
    <AITheme appearance="system" config={{ primary: '#2563eb' }}>
      <Button onClick={onSave}>Save</Button>
    </AITheme>
  );
}
```

Next.js, Tailwind and a CSS Modules configuration are not required. Use controlled values and callbacks for interactive components. `IconsProvider` overrides semantic icons; the `/theme` entry exposes pure theme helpers.

## Optional entries

| Entry                                                             | Additional peers                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/theme`, `/status`, `/code`, `/sidecar`, `/workspace`, `/upload` | None beyond React/ReactDOM                                            |
| `/markdown`                                                       | react-markdown, remark-gfm, remend                                    |
| `/math`                                                           | katex; import its CSS/fonts                                           |
| `/mermaid`                                                        | mermaid, dompurify                                                    |
| `/rich-markdown`                                                  | Markdown peers, remark-math, katex, mermaid, dompurify                |
| `/highlight`                                                      | shiki                                                                 |
| `/terminal`                                                       | @xterm/xterm, @xterm/addon-fit; import `@stackunseen/ui/terminal.css` |
| `/viewport`                                                       | @tanstack/react-virtual                                               |
| `/layout`                                                         | react-resizable-panels                                                |
| `/application`                                                    | No additional peers; import `@stackunseen/ui/application.css`         |
| `/marketing`                                                      | No additional peers; import `@stackunseen/ui/marketing.css`           |
| `/assistant`                                                      | No additional peers; import `@stackunseen/ui/assistant.css`           |
| `/devtools`                                                       | No additional peers; import `@stackunseen/ui/devtools.css`            |
| `/media`                                                          | No additional peers; import `@stackunseen/ui/media.css`               |

These peers are required only for the entries you import; their supported ranges are in `package.json`. Use named imports from the root for ordinary components. There are no `/button` or `/icons` subpaths.

`/application` contains DataGrid, Combobox, MultiSelect, Calendar, DateRangePicker, PageHeader, OrgSwitcher, ListToolbar, MasterDetail, SettingsSaveCancel and UnsavedGuard. DataGrid receives an already filtered, sorted and paged row window. Date controls use date-only `YYYY-MM-DD` values and a supplied month/locale. The host owns selection, scope changes, draft validation and save receipts.

`/marketing` contains MarketingHeader, MarketingFooter, MarketingHero, MarketingFeatures, MarketingPricing, MarketingFAQ, MarketingContact and MarketingArticle. Supply your content, destinations and form behavior; the blocks do not fetch content, send messages or perform payments. Both entries reuse the base controls and theme. Load `styles.css` first, then the optional stylesheet you use.

`/assistant` contains Reasoning (a public reasoning summary, never private reasoning), ChainOfThought, Plan, Task, Checkpoint, Shimmer, Sources, ModelSelector and OpenInChat. `/devtools` contains Snippet, Commit, EnvironmentVariables, PackageInfo, SchemaDisplay, StackTrace and a sandboxed WebPreview. `/media` contains AudioPlayer, Transcription, VoiceSelector, Persona and Image. They display host-supplied data: durations, sources, restores and previews are reported or requested, never invented, and links render only for safe URLs.

Components receive controlled values and emit callbacks. Your host authorizes actions, executes tools and supplies confirmed outcomes. This package provides no model connection, MCP transport, authentication or hidden persistence. `RuntimeProvider` is optional.
