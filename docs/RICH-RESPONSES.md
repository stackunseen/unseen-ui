# Rich responses

## Math and diagrams

`@stackunseen/ui/rich-markdown` exports `RichMarkdownResponse`, `MathFormula` and `MermaidDiagram`. `MarkdownCodeBlock` is separately available from `/markdown`, with panel/minimal/numbered styles. The base entry remains plain-text capable without renderer peers.

Standalone consumers can use independent `/math` and `/mermaid` entries. All three styles and props are identical; the aggregate entry re-exports the same renderers. Install only the peers needed by the selected entry:

| Entry | Direct optional peers | Styles/assets |
| --- | --- | --- |
| `/math` | `katex@0.18.9` | Library CSS plus `katex/dist/katex.min.css` and its font assets |
| `/mermaid` | `mermaid@12.0.0 dompurify@3.4.16` | Library CSS; add KaTeX CSS/fonts when diagram labels contain math |
| `/rich-markdown` | The full set below | Library CSS plus KaTeX CSS/fonts |

Mermaid has its own transitive dependencies, including a math engine. The diagram entry isolates Markdown/GFM/remark-math peers; it does not remove Mermaid's internal math or grammar costs. For math-label styles, install direct `katex@0.18.9` to import the tested CSS explicitly. The host/bundler serves fonts from its own assets, with no hidden CDN request.

```tsx
import { MathFormula } from '@stackunseen/ui/math';
import type { MathFormulaProps } from '@stackunseen/ui/math';
import { MermaidDiagram } from '@stackunseen/ui/mermaid';
import type { MermaidDiagramProps } from '@stackunseen/ui/mermaid';
import '@stackunseen/ui/styles.css';
import 'katex/dist/katex.min.css'; // Formulae and diagram math labels.
```

```sh
pnpm add react-markdown@10.1.0 remark-gfm@4.0.1 remend@1.3.1 remark-math@6.0.0 katex@0.18.9 mermaid@12.0.0 dompurify@3.4.16
```

```tsx
import { RichMarkdownResponse, MathFormula, MermaidDiagram } from '@stackunseen/ui/rich-markdown';
import '@stackunseen/ui/styles.css';
import 'katex/dist/katex.min.css';

<RichMarkdownResponse text={'Inline $x^2$ and display math:\n\n$$\\int_0^1 x\\,dx = 1/2$$'} state="complete" />;
<MathFormula formula={'\\begin{bmatrix}1 & 0\\\\0 & 1\\end{bmatrix}'} />;
<MermaidDiagram title="Review workflow" code={'flowchart LR\n  Draft-->Review-->Approved'} />;
```

RichMarkdownResponse recognizes inline/display math and fenced `mermaid` blocks. It retains GFM, scoped footnotes, inert code copying and safe external-link handling. KaTeX provides HTML plus MathML with trust disabled, strict parse errors, a 10,000-character limit and expansion bounds. Invalid/oversized formulae retain bounded source rather than disappearing. Choose block/inline/scroll formula presentation.

MermaidDiagram has panel/minimal/source styles, bounded zoom, source disclosure/copy and loading/error/streaming fallbacks. Rendering is lazy and serialized; incomplete streamed diagrams remain source until complete. The canvas uses theme colours and local horizontal scrolling so small screens do not shrink text indefinitely. Source is limited to 12,000 characters and 150 edges. Configuration directives, raw source HTML, active links/callbacks and styling directives are restricted. Generated SVG/HTML/MathML is sanitized; no link handlers or external resources are activated. The host's source string remains unchanged.

The gallery exercises flowchart, sequence, class, state, entity relationship, Gantt, pie, mindmap, timeline and Git graphs, plus flowchart/sequence math labels and explicit invalid/restricted/streaming states. Upstream [Mermaid math](https://mermaid.js.org/config/math.html) applies to flowchart and sequence diagrams, not every diagram grammar. More grammars may parse, but they are not all verified. The renderer is not a sandbox or hard CPU budget.

Renderer peers are optional and externalized; Mermaid loads dynamically. Use `/math` or `/mermaid` for standalone rendering. `/rich-markdown` requires the full peer set even when a render skips math or diagrams. All diagram entry paths share one render queue per package instance.

Message and StreamingResponse render plain text by default. Use `@stackunseen/ui/markdown` for Markdown; it is separate from the base entry.

## Markdown

The optional subpath requires these peers. The versions below are the tested combination; they are not required by a plain-text consumer.

```sh
pnpm add react-markdown@10.1.0 remark-gfm@4.0.1 remend@1.3.1
```

```tsx
import { Message } from '@stackunseen/ui';
import { MarkdownResponse } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/styles.css';

<Message
  variant="bubble"
  value={message}
  renderContent={({ text, state }) => (
    <MarkdownResponse text={text ?? ''} state={state} variant="dots" headingLevel={3} />
  )}
>
  {/* Optional attachments, citations and actions remain after the response. */}
</Message>;
```

Message keeps plain/bubble/panel styles. MarkdownResponse reuses StreamingResponse's cursor/dots/shimmer styles, independent of content state. `headingLevel` sets the HTML level of a source `#` heading; deeper headings increment up to six. Choose the level for the host page's heading hierarchy. Empty text, interrupted content and explicit errors use the existing response status UI. Native div props, className and refs pass to the response root.

`Message.renderContent(message)` replaces only its default response. `StreamingResponse.renderContent({text, state})` replaces nonempty text while retaining its streaming/status presentation. Both are trusted application callbacks, never functions supplied by a model. Ordered schema-v2 messages use `Message.renderTextPart`, with the stable `renderMarkdownPart` helper from this optional entry; see [message parts](MESSAGE-PARTS.md).

## Rendering and behavior

The optional renderer composes [react-markdown](https://github.com/remarkjs/react-markdown), [remark-gfm](https://github.com/remarkjs/remark-gfm) and [remend](https://github.com/vercel/streamdown/tree/main/packages/remend). GFM adds tables, static task lists and footnotes. Remend supplies temporary completion of unfinished formatting during streaming. Complete/interrupted source is rendered without that repair; the original host string is never changed. An unfinished link remains inactive until it has a complete supported destination.

Code blocks have language labels, a scrollable keyboard-focusable body and Copy. Copy is disabled while the response is streaming. Clipboard success/failure is shown only for the source that was copied; changing the code clears stale feedback. Code remains text: there is no syntax-highlighting engine, execution, download, math renderer or diagram engine in this entry. Code-copy output excludes the parser's final line-feed delimiter.

Tables scroll within their container. Task checkboxes are labelled, disabled representations of source content; they are not executable task controls. Footnote IDs and descriptions are scoped to each response, including repeated copies of the same Markdown. Stable paragraph nodes remain selectable in the tested append-only scenario; edits that change a paragraph's syntax can legitimately change its DOM.

## Content boundaries

- Raw HTML/MDX is displayed as text. No raw-HTML plugin, arbitrary remark/rehype plugins or model-defined React component registry is exposed.
- Only absolute HTTP(S) links without whitespace, backslashes or credentials are activated. Generated local footnotes are the only fragment links. Relative, protocol-relative, data, file, JavaScript, blob and mail links remain text. Supported external links open in a new tab with noopener/noreferrer. This URI policy does not establish destination trust or authorization.
- Markdown images become alt-text descriptions with an explicit link when supported. They do not create image requests. Use the separate controlled Attachment preview for media the host has approved. Text URL labels can still be deceptive; the host owns any additional destination policy.
- Formatting input is capped at 100,000 UTF-16 code units. Larger input shows an explicit, bounded plain-text preview in a keyboard-scrollable area. A renderer failure also retains bounded plain text. This cap is not a latency guarantee.
- The body is not a live region that announces every token. Status messages announce stream state; code-copy feedback uses a separate status. Reduced-motion behavior comes from the existing response indicators.

Renderer styles use the shared theme tokens; consuming applications do not need Tailwind. KaTeX CSS and fonts are separate assets.

## Parsing limits

Each active Markdown document reparses on updates. Large responses can be slow; split content only at meaningful document boundaries and test with your own content and devices. Completed [message parts](MESSAGE-PARTS.md) retain their identity, but that does not make the active parser incremental.

## Optional highlighted code

The plain `MarkdownCodeBlock` has a `/code` subpath requiring no Markdown peers. Its legacy `/markdown` export remains the same function. `/highlight` exposes `HighlightedCodeBlock` with the same panel/minimal/numbered styles. Install the tested optional `shiki@4.4.3` peer; neither base nor Markdown imports it by default.

```tsx
'use client';
import { MarkdownResponse } from '@stackunseen/ui/markdown';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';
import '@stackunseen/ui/styles.css';

<MarkdownResponse
  text={markdown}
  state="complete"
  renderCodeBlock={(props) => <HighlightedCodeBlock {...props} variant="numbered" />}
/>;
```

The trusted callback also works with RichMarkdownResponse; math/diagram fences retain their specialized renderers. Keep callbacks within a Client Component rather than sending functions through a server-to-client boundary. Base plain behaviour is unchanged.

[Shiki fine-grained bundles](https://shiki.style/guide/bundles) and its [JavaScript regex engine](https://shiki.style/guide/regex-engines) supply ten fixed local grammar imports. JavaScript (js), TypeScript (ts), JSX, TSX, JSON, CSS, HTML, Python (py), Bash (sh/shell) and SQL are supported. No CDN, language URL, user grammar/theme/transformer, raw HTML or executable MDX is accepted. Tokens must reconstruct original source and become escaped React spans with a closed set of semantic classes. CRLF is retained and copy always uses original props.

A single long-lived engine retains only grammars and one fixed semantic theme; source is not globally cached. Cancelled source/language loads cannot update the view. Theme colours resolve through scoped CSS, so changing primary/secondary or appearance does not wait for another async theme result. Keyword/string use primary-text/secondary-text, comments use muted/italic and constants use text/bold. Content remains understandable without colour, including forced-colour mode.

Highlight limits: 20,000 UTF-16 units, 300 lines, 2,000 units per line and 10,000 output tokens. Streaming/disabled highlighting stays plain; unsupported language, failure and exceeded bounds explain the fallback. The 100,000-unit preview/copy rules remain. Browser tokenization is synchronous after lazy grammar loading; bounds/cancellation are not hard CPU isolation or arbitrary-input performance guarantees. For highlighted comparisons, use `HighlightedCodeDiff` below.

## Highlighted comparisons

`HighlightedCodeDiff` from `/highlight` composes the canonical base CodeDiff with the same optional tokenizer. Its unified/split/compact styles retain original line numbers, addition/removal signs and semantic gutters. Token cells use neutral theme surfaces to keep primary/secondary syntax colours readable.

```tsx
import { HighlightedCodeDiff } from '@stackunseen/ui/highlight';

<HighlightedCodeDiff
  path="src/search.ts"
  before={original}
  after={updated}
  baseVersion="a1"
  nextVersion="b2"
  language="typescript"
  status="ready"
/>;
```

The two full documents are tokenized once each, with the existing per-document limits, to preserve multiline grammar state. Results must match original line text and path/version/source identity. Only ready, valid, changed snapshots are eligible; both nonempty documents must be ready together. Unsupported, failed and limited highlighting retain plain comparison. Loading/conflict/denied/error/unavailable states hide source and disable work. Immutable versions and copy receipts remain host-bound; source access and patch execution require separate host capabilities. See [coding and structured UI](CODING-AND-STRUCTURED-UI.md) for the base diff contract.
