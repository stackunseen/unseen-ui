# BoardUI gap audit

Date: 2026-10-29. Reference: https://www.boardui.com/ (home, /components, /components/button, /docs, /templates), read in the browser at 1440px. Our side: the docs site at `apps/docs`, served from the static build on port 4175, and the package manifests.

Status words: `observed` means seen in the browser or read in the code today; `planned` means not built.

| BoardUI has | Unseen UI has today | What to build |
| --- | --- | --- |
| 103 components (19 Recharts charts), one Figma source, Tailwind v4, React Aria | 158 catalog components (65 UI, 93 AI), no Tailwind needed, own CSS tokens, `observed` | Nothing on count. Present the split clearly: Foundations, UI, AI, Agent operations. |
| Light, airy product look: white cards with 16px corners, soft shadows, one blue accent, big dark headline, stack badges under the hero | Dark editorial look from the 27 Oct mockup: hairline cells, mono labels, `//` eyebrows, grey headline, grey-on-grey light mode, `observed` | A mature product system for the site chrome: surfaces with real contrast, 12 to 16px card corners, a visible accent, sans labels, dark headline. This is the main gap and the first thing done. |
| Components index: every card is the live component, grouped Foundations / Base / Blocks / Charts with counts, docs-style left rail with NEW badges | Components index: tiles with captured light/dark thumbnails, grouped by section and job, counts, search, task chips, gallery/list switch, `observed` | Keep thumbnails (158 live previews on one page is a cost we do not need), but present them on a proper card with a framed preview area; rail sections with counts. Live previews for the featured set is a later option. |
| Top nav: Components, Templates, Docs, Blog, Quick Search field with the shortcut visible, GitHub stars, Get Pro | Top nav: Components, Patterns, Getting Started, Customize; search is an icon only; Get started CTA, `observed` | Segregate the site into Components, Templates, Docs, Customize. Show the search as a field with the shortcut. |
| Per-component page: Preview / Code tabs, Copy Page menu, Installation (CLI / Manual, npm / pnpm / yarn), Variants with usage code, prev / next pager, On this page rail | Same structure: Preview / Code, Copy page, Markdown, Installation with package managers, usage sections, pager, On this page, props table, Parts, agent contract, `observed` | Visual polish only: canvas, tabs and section rhythm follow the new system. |
| Cmd+K quick search | Cmd+K site palette with component, docs and template results, `observed` | Nothing. |
| CLI: `npx boardui@latest add <component>` copies source into the project | `npx @stackunseen/ui init` writes a working chat; components ship as one npm package; shadcn registry items (`npx shadcn add https://unseenui.com/r/chat.json`), `observed` | An `add <starter>` alias over the registry is possible, but the package model is a choice, not a gap. Document the three paths on one Installation page. `planned` |
| MCP server: browse components with usage examples, set up a project, write files | MCP server at `apps/docs/mcp/server.ts`: `search`, `list_components`, `read_component` (with usage), `read_overview`, `observed` | Parity on reading exists. Writing files is a host decision we keep out of the server (the host writes, the server describes). Document the Claude Code / Cursor / Codex setup. `planned` |
| 400+ design tokens page, light and dark on every component | Tokens page at /docs/tokens, Theme studio at /customize, light and dark on every component, `observed` | Nothing on coverage. Surface the tokens page from the Components rail under Foundations. |
| 10 Pro page templates with desktop / tablet / mobile previews | 7 templates and 3 workbench patterns, in the browser with sample data, `observed` | A device-width switch on the template page (desktop, tablet, phone). `planned` |
| Data table with filter, sort, paginate | DataGrid, DataTable, Table, Pagination, `observed` | Nothing. |
| 19 charts | Chart, DataDots (DotRing, DotBars, WeekStrip, HeatKeys), Stat, ProgressRing, `observed` | Chart breadth is thinner; what an agent dashboard needs (runs over time, cost, tokens, latency) is covered by Chart plus the dots set. Review after the design pass. |
| Figma kit, blog, Discord, paid Pro | None | Not in scope for the library site. |
| Approvals, tool calls, agent runs, server-confirmed actions | ApprovalCard, PermissionRequest, ToolCall, RunBoard, ExecutionTimeline, SubagentTree, AgentLanes, host-acknowledged state, `observed` | Already the headline on the home page. Keep it first. |

## Wider survey: libraries in the same space

Read on 2026-10-29 from each project's own site. Claims are theirs, not measured here.

| Library | What it does well | What Unseen UI takes from it | Status here |
| --- | --- | --- | --- |
| [Tremor](https://www.tremor.so/) | 35+ dashboard components on Recharts: spark charts, donut, bar list, tracker, progress circle; 300+ blocks; live previews beside code | The small dashboard figures an agent product needs | Built: Sparkline, BarList, Tracker, DonutChart in the root entry, with hidden tables and no colour-only meaning |
| [AI Elements](https://elements.ai-sdk.dev/) | 49 shadcn-based pieces in Chatbot, Code, Voice and Workflow groups; one live composed demo on the home page; deprecated at the end of November 2026 | Live composed demo up front; grouped sidebar | Already present: home showcase tabs, grouped catalog; a Dashboards tab added |
| [assistant-ui](https://www.assistant-ui.com/) | Chat primitives, tool UI, approval card, permission grant, many runtimes (AI SDK, LangGraph, AG-UI, A2A), per-page Markdown, llms-full.txt, MCP | Agent-readable docs, approval elements | Already present: per-component Markdown, llms.txt, MCP endpoint, ApprovalCard, PermissionRequest. Runtimes stay out of scope (the host owns orchestration) |
| [prompt-kit](https://www.prompt-kit.com/) | 21 chat components, live example and copy-ready code per component, New badges | New badges | Built: New badges on catalog cards and the component sidebar (lib/new-components.ts) |
| [shadcn/ui blocks](https://ui.shadcn.com/blocks) | Preview and Code tabs per block, open in new tab, refresh, install command | Open a template on its own | Built: device switch (desktop, tablet, phone) and open-in-new-tab on every template page |
| [Untitled UI React](https://www.untitledui.com/react) | Category cards with counts, application vs marketing split, CLI init, MCP, Figma sync, paid tiers | Category counts and a clear split | Present: rail sections with counts, UI vs AI split. Figma kit and paid tiers are out of scope |

## Built in this pass (2026-10-29, local, not committed)

- Site system (app/system.css), segregated navigation, header search field.
- Component pages: one header bar with Preview / Code on the left and the example controls on the right; a white stage.
- Catalog: three wide cards per row with a framed stage; thumbnails recaptured at 2x and near the component's real size.
- Templates: Desktop, Tablet and Phone widths in a framed device stage, and open in a new tab (`?frame=1` hides the site chrome before first paint).
- Getting started: a four-way install chooser (npm, starter, shadcn, coding agent) with copyable commands.
- Library: Sparkline, BarList, Tracker, DonutChart, documented in the catalog with states, usage guidance and props; base CSS budget raised to 28.75 KiB with a note.
- Home: a Dashboards tab in the live showcase.

## Still open

- Live (not captured) previews inside catalog cards. Captured thumbnails were kept because a live mount of every specimen can open portals and run timers on the index page.
- Stacked bar and scatter charts.
- A Figma kit, a blog and paid tiers are product decisions, not library work.

## Order of work

1. Site design system: header, hero, cards, rails, component page, footer. Light and dark. (this pass)
2. Segregation: Components / Templates / Docs / Customize, with Foundations inside Components. (this pass)
3. Template device previews.
4. Installation page covering npm package, `init`, registry starters, MCP setup.
5. Chart breadth review against an agent dashboard.
