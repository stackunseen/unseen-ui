# Attachments and composer integration

`Attachment` displays host-owned file state in `row`, `tile` and `compact` presentations. Import it from `@stackunseen/ui` with the shared stylesheet. File selection and preview do not upload a file or connect a provider.

## Controlled data

| Input | Meaning |
| --- | --- |
| `state` | `selected`, `uploading`, `ready`, `failed`, `cancelled`, `removing`, `removed`, or `outcome-unknown`; supplied by the host |
| `mediaType`, `sizeBytes` | Host metadata; invalid byte counts are omitted |
| `progress` | `{ loaded, total }` measured bytes. Both must be safe nonnegative integers, total positive and loaded no greater than total |
| `access` | `available` (default), `revoked`, `expired`, or `missing`; independently gates preview content and original/retry actions |
| `preview` | Image `{ kind, src, alt }`, text `{ kind, text }`, audio `{ kind, src, transcript? }`, or video `{ kind, src, captions? }` |
| `reference`, `resource` | Optional `AttachmentReference` identities (`attachmentId`, `version`): the requested version and the identity of supplied metadata/content. An explicit reference requires an exactly matching resource. |
| `onOpen` | Requests that the host open an authorized original; enabled only when ready with available access |
| `onRetry`, `onRemove` | Requests, not acknowledgements. Retry remains failed until the host changes state; removing disables repeated removal |

The last uploaded byte does not imply acceptance: a full byte count still says it is waiting for confirmation. Missing or invalid counts use the shared reduced-motion-aware LoadingIndicator, with spinner/bars/dots corresponding to row/tile/compact. No fabricated denominator or automatic completion.

An unknown upload outcome has explicit status text, no retry control and no enabled original-file action. The host reconciles status before transitioning to failed or ready. A host can add its reconciliation control through the compound layout. Missing display names fall back to `Unnamed file` so preview controls/dialogs stay labelled.

## Composition

The convenience component renders all default parts. `Attachment.Root`, `.Preview`, `.Info`, `.Actions` and `.Progress` allow a different arrangement using the same controlled context. Parts require a root. Explicit children replace the convenience layout.

```tsx
import { Attachment, AttachmentGroup } from '@stackunseen/ui';

<AttachmentGroup variant="list" label="Report attachments">
  <Attachment.Root
    variant="row"
    name="report.txt"
    state="ready"
    mediaType="text/plain"
    preview={{ kind: 'text', text: 'A host-provided preview.' }}
  >
    <Attachment.Preview />
    <Attachment.Info />
    <Attachment.Actions />
    <Attachment.Progress />
  </Attachment.Root>
</AttachmentGroup>;
```

AttachmentGroup offers `list`, `grid` and `inline` arrangements, a labelled group and an overridable empty message. Existing IconsProvider roles (`document`, `warning`) apply to attachment controls and portals. A custom leading element can replace the default preview part.

## Previews and access

Image thumbnails have an explicit keyboard-operable preview control; full previews reuse the shared Radix dialog, theme scope and focus return. Image alt text is required. Audio/video use browser controls, never autoplay and request `preload="none"`; the browser ultimately controls media fetching. Optional audio transcripts and video caption tracks are displayed when supplied; missing alternatives and failed caption tracks are stated. Caption failure does not hide the video. This does not implement speech recognition, recording or real-time voice.

Text previews are inert and capped at 20,000 characters, with truncation disclosed. Audio transcripts use the same character bound. PDFs, HTML documents and arbitrary remote pages are not embedded or evaluated; use metadata plus a host-controlled original action for unsupported formats.

URLs may be credential-free HTTP(S), root-relative paths or host-created HTTP(S) blob URLs. Relative paths follow the host document's base URL. Protocol-relative URLs, data/javascript URLs, credentials and whitespace/backslash ambiguity are rejected. This scheme check is not content validation, an origin allowlist or authorization. Hosts must restrict origins/resources and enforce access, MIME/content scanning, CSP and safe original-file delivery. An original SVG/HTML document opened by a host needs its own untrusted-content policy.

Revocation removes thumbnails, media and preview text on the next render, including while the dialog is open. Provided names, metadata and detail remain visible; hosts must redact those fields too when their access policy requires it. The dialog stays open with an unavailable message and a working close action. It does not silently reopen or restore old access. A changed media URL resets a previous preview error. Native media and image load failures produce a fallback; they do not change upload state.

An opened preview pins its attachment ID/version until closed. A missing, mismatched or ambiguous host resource removes obsolete preview content and original actions while preserving the same dialog, close control and focus return. Mismatched metadata is hidden too. Restoring the exactly matching available version restores its content; supplying a newer version never satisfies an older open reference. Closing and deliberately reopening uses the current requested identity. Only identity is retained, never a cached preview or URL. Host versions must identify immutable content.

Standalone callers can pass `reference={{ attachmentId: file.id, version: requestedVersion }}` and `resource={{ attachmentId: file.id, version: file.version }}` alongside the supplied preview. Passing only `resource` pins that identity on open. Legacy callers without either identity still work, but cannot detect a content change disguised as the same resource; hosts should supply version identities for live resources. Message parts supply their explicit reference automatically.

## File selection and ownership

`AttachmentPicker` delegates accepted browser File objects to `onFilesSelected`. It does not create object URLs, upload, persist, retry or infer ready state. Its `accept` string supports MIME types, MIME wildcards and extensions. `maxFileBytes` is optional; `remainingSlots` defaults to 10 and caps a single accepted batch at 100. The host supplies remaining slots after accounting for existing files. Invalid limits disable selection.

Type/size/count failures call `onReject` with each file and reason. The UI announces a count and displays up to ten filename/reason entries. Accepted files in the same batch are still delegated. The input resets so the same file can be selected again. Browser accept/type metadata is a user-interface hint; validate actual content on the host.

The owner that creates a blob URL must release it when the last preview no longer needs it. A shared URL must not be revoked by an individual presentation component. The gallery's local composer owns a URL set and releases URLs on removal, accepted local submission and unmount. Its state updaters remain pure. See the [MDN object-URL lifecycle reference](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static).

## Composer slots

PromptInput accepts `attachments` and `toolbar` ReactNode slots. Use AttachmentGroup and AttachmentPicker, or application-specific controls. The host also owns disabled/cancellation behavior of controls supplied through these slots.

- `submitDisabled` blocks Enter/form/button submission while preserving the draft. `submitDisabledReason` is linked to the textarea through its help text.
- `allowEmptySubmit` defaults to false. Explicitly enable it only when the host can accept an attachment-only message. Rendering an attachment by itself never enables empty submission.
- `busy`, `disabled`, IME-safe Enter, Shift+Enter and cancellation retain their existing meaning. The host validates file readiness and command state again at submission.

The gallery's PromptInput attachment example supports local selection, limits, preview and removal. Submission is simulated. [Message parts](MESSAGE-PARTS.md) reference host-resolved file versions; [uploads](UPLOADS.md) documents the optional transfer composition and disk/HTTP example.

## Uploads

`UploadAttachment` from `/upload` adds version/revision-bound actions and original receipt lookup. Capability provenance and content digests are available in a disclosure. Read [uploads](UPLOADS.md) before binding file actions to host mutations.