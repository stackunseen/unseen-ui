# Runs across threads

Experimental controlled components for work that outlives one chat: a board of runs, the queue of things waiting on a person, a summary to read afterwards, and a persistent indicator. Import the components from `@stackunseen/ui/conversation-flow` and load `@stackunseen/ui/conversation-flow.css` once; `Run`, `Measurement`, `CommandReceipt` and `heartbeatState` come from `@stackunseen/ui-core`.

| Component | Data and callbacks | Styles | Critical behavior |
| --- | --- | --- | --- |
| RunBoard | `runs: RunCard[]` (a `Run` plus title, agent, owner, timestamps, `heartbeatAt`, `waitingOn`, `cost`, public `summary`), `filter` and `onFilterChange`, `selectedId` and `onSelect`, `onAction({runId, attemptId, version, action})`, `receipts`, `staleAfterMs`, `now` | board / list / compact | Columns are Active, Waiting for you and Finished, derived from `RunLifecycle`. A running run whose heartbeat is older than `staleAfterMs` against the host clock is marked "No recent update"; without a heartbeat or clock nothing is guessed. Pause, resume and cancel are requests; a `submitting` receipt for `runId:attemptId` disables them until the host answers. Arrow keys move between cards and columns. |
| AttentionQueue | `items: AttentionItem[]` (approval with its `ApprovalProposal`, clarification, handoff, failure), `count: Measurement<number>`, `onOpen`, `onDismiss` | list / compact | Rows only: opening an item mounts ApprovalCard, ClarificationRequest or AgentHandoff in the host. An unknown count reads "Count unavailable" with the host's reason, never zero. |
| RunSummaryCard | `summary: RunSummary` (goal, `outcome`, public text, `effects` with optional `receiptId` and safe `href`, `notDone`, `duration`, `cost`), `receipts`, `onOpenEffect`, `actions` | card / inline | An effect shows "Confirmed" only when an acknowledged receipt matches its `receiptId`; otherwise "Unconfirmed". `outcome: 'unknown'` prints a status line asking the reader to check before acting. Links go through the shared URL policy. |
| BackgroundStatus | `running` and `waiting` as `Measurement<number>`, `lastHeartbeatAt`, `staleAfterMs`, `now`, `onOpen` | pill / banner | Counts are announced politely only when they change. The indicator never polls; the host updates the props. A silent host with running work shows "No update since". |

## Measurements and receipts

`Measurement<T>` is `{ kind: 'measured', value, at? }`, `{ kind: 'estimated', value, basis, at? }` or `{ kind: 'unknown', reason? }`. Components print estimated values with a leading `~` and announce the basis, and print unknown values as words. `measured()`, `estimated()`, `unknownMeasurement()` and `measurementValue()` build and read them.

`CommandReceipt` is `{ commandId, status: SubmissionState, at?, message? }`. RunBoard keys receipts by `runId:attemptId`; RunSummaryCard keys them by the effect's `receiptId`. Pending is not success and unknown is not failure.

`heartbeatState(heartbeatAt, now, staleAfterMs)` returns `fresh`, `stale` or `unknown`. Both timestamps come from the host; pass `now` so server and client render the same board.

## What the host owns

Ordering, filtering results beyond the local match, persistence, authorisation of pause, resume and cancel, the decision controls behind queue items, and the clock. The board never derives "finished" from silence and never starts or stops a run on its own.
