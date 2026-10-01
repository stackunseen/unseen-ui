# Conversation navigation

ThreadList, BranchSwitcher and MessageQueue share controlled host windows. Their three presentations reuse the same validation, callbacks and accessible controls. Selection, rename, queue order, removal and saved drafts change only after the host supplies current data.

## Placement

Thread selection and row actions are separate controls. Queue rows show the complete draft with numbered accessible action names, including across pages. Inline editors put Cancel before Save; actions remain visible and wrap at narrow widths. Branch segments, cards and Select share the same host selection and draft guards.

Use the composed **Saved conversation workspace** in Design Foundations to review actual placement in an app. The same example ships in the plain React consumer. Recovery simulation lives in an optional accordion below the main content.

## Ownership and imports

```tsx
import { ThreadList, BranchSwitcher, MessageQueue } from '@ai-interaction/react';
import type { ConversationContext, ConversationWorkspace } from '@ai-interaction/core';
import { inspectConversationWorkspace } from '@ai-interaction/core/conversation';
```

Core root exports the types and pure identity helpers. Schema inspectors have a separate `/conversation` entry so unrelated renderer imports do not inherit their Zod initialization. React uses that entry for navigation validation. Core contains no browser, storage or transport access.

The context binds `workspaceId`, optional thread/branch, `snapshotId` and `version`. A branch requires a thread. Requests include an exact copied context and target version. Scoped callbacks take precedence over legacy callbacks; missing/invalid scope disables the action rather than falling back. Existing unscoped callbacks remain compatible. A callback is a request, not proof of authorization or success.

## Data windows and states

| Data | Limits and meaning |
| --- | --- |
| Threads | Up to 100 unique IDs; titles 200 characters; public details 1,000 |
| Branches | Up to 50 unique IDs; labels 200; no ancestry cycle within the window; missing external ancestors remain unresolved |
| Queue | Up to 50 unique IDs; complete text up to 20,000 characters, never silently truncated |
| Pagination | Safe finite indices, family page-size bounds, total consistency; an unknown total stays unknown and Next requires explicit `hasNextPage` |
| Input traversal | Plain descriptor data, no accessors/symbols/cycles/sparse arrays; 200,000 aggregate string units, bounded depth/value counts |

Invalid/excessive windows are rejected in full. Hosts replace pages explicitly; components do not slice an oversized collection into an apparently complete window. Loading, denied, unavailable, unknown and error states hide supplied records; `stale` explicitly exposes historical data with changes locked.

Lifecycle, connection and command acknowledgement are independent. `submitting`, `acknowledged` and `outcome-unknown` lock changes. An obsolete operation cannot reconcile through the current view. A valid unknown operation offers an explicit original-request check. Queue states include `sent` and `outcome-unknown`; unknown sends are not editable/retried automatically. Retry is offered only for a failed item and an explicit host callback.

Queue text is keyboard-scrollable. Editor identity includes context and target version: a same-view version conflict blocks Save; changing workspace hides the previous editor text. Escape cancels and returns focus when the originating action still exists. Removing a focused child returns focus to the group. Branch guard decisions bind the host guard version, target version and current selection. Custom Select close-focus is coordinated with the guard rather than stealing focus back from its Cancel button.

## Scroll and drafts

`scrollRestoration` binds the offset to exact context and query. Invalid or obsolete positions are disclosed and ignored. `onScrollSnapshotChange` emits the measured offset; the browser clamps restoration to current geometry. Hosts must change the snapshot identity when replacing a page. This is pixel restoration, not message virtualization or a logical anchor across arbitrary layout/content changes.

`changeGuard` is a public host warning, not a storage operation. Confirm requests selection; the host must save or reject the draft atomically. Local UI state manages only the disclosure. The example keeps unsaved text in the caller, detects a stored draft-version conflict and offers explicit saved-text/review choices. Saving, queuing and switching branch/thread persist drafts; typing alone does not. Closing with unsaved text loses that uncommitted caller draft. Archive retains the underlying record and does not select another thread automatically.

## Separate browser example

`examples/consumer/src/conversation-host` implements an opt-in IndexedDB owner. It opens only through Open saved workspace. A version-1 checkpoint holds up to 32 threads, four branches each, 50 queued items per branch, bounded drafts, selection, query/pages/scroll and the last 100 SHA-256-bound receipts. Aggregate bounds still apply. This small example is not an unlimited production history store.

The host freezes projections and captures command data before asynchronous fingerprinting. Within one read/write transaction it validates the current record, checks exact workspace/target/draft versions, applies the command and commits its receipt. It publishes success only after transaction completion. Rejected commands preserve the previous data and record a rejection. A stale tab receives current data with an explicit failure. Invalid/unsupported checkpoints are preserved instead of silently reseeded.

Injected lost acknowledgements leave the original operation unknown. Refresh/mutation is blocked until the original receipt is checked; a missing receipt stays unknown. Local revocation hides data and fences late publications; restoring the same owner checks retained pending receipts before reopening. A submitted transaction can already have committed before the local toggle changes. The toggle demonstrates UI access state and is not server authorization. Closing disposes its owned database connection; in-flight writes are not silently rolled back.

Receipt retention is bounded and does not provide indefinite idempotency. A new owner loads committed state rather than automatically replaying a prior command. The sample has no provider, send transport or actual execution: queue acknowledgement means **saved locally**, never sent. IndexedDB can be cleared/evicted and transaction completion does not establish resistance to OS crash or power loss. Its synchronous transaction update follows [IndexedDB transaction lifetime](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction); success waits for the [complete event](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event).

## Integration limits

Use [ConversationViewport](HISTORY-VIEWPORT.md) for measured message scrolling and bounded reading mode. The examples do not provide production authorization, provider history or a send transport. Test persistence, rich-history performance and accessibility with your application.