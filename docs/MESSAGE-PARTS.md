# Ordered message parts

Core supports schema versions 1 and 2. Version 1 uses the existing text payload; version 2 supports ordered parts, optional timestamps and explicit message failures. These canonical host events are independent of a provider's wire protocol.

## Rendering

`MessageData` contains exactly one of `text` or `parts`. Parts have stable, unique IDs and preserve host order. Supported kinds are plain/Markdown text, tool-call references, source references, attachment references and an explicit unsupported-content summary. `Message` and `MessageContent` render plain text by default. Pass the stable optional renderer for formatted text:

```tsx
import { Message } from '@ai-interaction/react';
import { renderMarkdownPart } from '@ai-interaction/react/markdown';
import '@ai-interaction/react/styles.css';

<Message
  value={message}
  variant="bubble"
  renderTextPart={renderMarkdownPart}
  sources={sources}
  tools={tools}
  attachments={attachments}
/>;
```

The optional renderer requires the same peers as [MarkdownResponse](RICH-RESPONSES.md). Its entry remains independent of Message, dialogs and tool UI. Custom `renderTextPart(part, responseVariant)` callbacks are trusted application code; keep their identity stable. `renderContent` still replaces the entire body and takes precedence. Legacy Markdown messages use that body slot or MarkdownResponse directly.

Host-resolved sources must match ID, version and locator. Attachments use `{ id, version, value }`, where `value` supplies the existing controlled Attachment metadata/access/preview props. Ambiguous or missing IDs and mismatched versions display unavailable content. Tool references resolve host tool state. Rendering a reference does not fetch content, grant permission or execute an action. Source revocation removes protected excerpt content, including in an open citation dialog.

Citation keeps its trigger and dialog mounted when the source disappears, becomes ambiguous or changes version/location. It replaces the excerpt and link with an announced unavailable state, retains focus, and returns focus to the trigger on Escape. Only the opened reference identity is retained; source content is never cached by this UI. Restoring an exactly matching available host source restores its content.

Standalone `Citation` accepts either a required `source`, or a required `reference: CitationReference` with an optional `source`. `CitationReference` contains `sourceId`, `version` and `locator`. An open dialog pins that identity until closed. A new identity supplied by the parent is used on the next deliberate open. Message parts always pass their explicit reference, so a newer source version does not silently satisfy an old citation.

Attachment parts keep the same `Attachment` component and preview dialog through resource replacement, removal, duplication or access revocation. They pass `AttachmentReference` (`attachmentId`, `version`) and the supplied resource identity separately. Missing/ambiguous records are unresolved; mismatched names and previews are hidden. An open preview retains only its version identity, announces unavailability and restores matching host content when available again. Escape returns focus to the retained trigger. The gallery's **Live parts** controls simulate each transition; no upload or access request is performed.

## Projection and migration

- Start a version-2 snapshot and stream before sending version-2 events. Switching schema version within an existing stream is rejected; migrate through an authoritative snapshot with a new stream ID.
- `message.part.added` appends a unique part. Finish an active text part before appending the next part.
- `message.part.delta` targets only the last streaming text part and requires its exact UTF-16 offset. Completed parts retain their object identity.
- `message.part.completed` closes that text part. `message.completed` requires all text parts to be finished.
- `message.failed` retains received content and supplies a public `{ code, message }` error. Terminal run transitions interrupt unfinished messages/parts; they do not discard partial content.
- Message content is bounded to 100 parts and 100,000 UTF-16 text units in aggregate. IDs, labels and error fields have schema bounds. Revision overflow and invalid mutations are rejected atomically.

Legacy version-1 event payloads remain supported. TypeScript callers that assumed `message.text` was always present must narrow the union or use `messageText(message)` for a text-only copy/export. That helper joins text parts and does not invent text for tools, files or sources. Legacy text deltas cannot target a structured message.

Each Markdown text part is an independent document. The host must choose meaningful boundaries; fenced code, lists, links and footnotes cannot span parts. The library does not split an unfinished document or infer completion. Memoization avoids rerendering unchanged completed parts in the tested append scenario; active parts still use a whole-document parser. Use [ConversationViewport](HISTORY-VIEWPORT.md) for measured history scrolling. Active rich documents still reparse; check performance with your own content.
