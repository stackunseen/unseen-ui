# Provider-neutral checkpoint adapter

`@stackunseen/ui-core/adapter` connects an injected host port to the canonical Runtime and `/history`. It contains no React, browser API, provider SDK, network client or persistence. You supply the provider integration.

## Ownership and opening

`createAdapterSession(port, scope, initial, options?)` pins workspace, optional branch, thread, run, attempt, stream and schema version. The initial snapshot is validated and shown with unknown freshness until a host checkpoint is established. A new attempt or scope requires a separate session. Preserve unresolved original requests when changing sessions.

The injected `port.open(scope, observer)` must atomically capture a current authoritative snapshot and establish its subscription strictly after that snapshot's cursor. It returns `{ checkpoint: { scope, snapshot, history? }, close }`. The host owns authentication, access, normalization and the absence of a snapshot/subscription race. A rejected `open` must release any resources it allocated. The adapter cannot prove a host's atomicity promise from an empty event stream.

Events emitted before `open` resolves are copied and buffered, at most 100. Invalid data or overflow invalidates that opening permanently; its late handle is closed once. After validation, runtime and optional history publish together. Callback generations are checked before parsing, so obsolete malformed events cannot poison the new channel. Refresh invalidates old channel/history work and closes its handle, retaining original commands.

This version has **no replay capability** (`resume: false`). Coherent snapshot refresh is available only when `open` exists. A disconnected or connected-but-stale projection does not imply failure of a previously executed operation. Ordering gaps still use Runtime's bounded canonical event buffer; they do not establish provider resume support.

Checkpoint run versions/cursors cannot regress. After the first accepted checkpoint, conflicting canonical entities at an unchanged cursor are rejected. A changed authoritative entity needs an advanced host cursor. Checkpoint transport must be connected and projection current; the adapter cannot turn an unknown checkpoint into current data.

## Original commands and receipts

`submit` accepts `{ commandId, scope, expectedRunVersion, operation, payload }`. Payload is bounded plain JSON; optional typed envelope fields may be absent or `undefined`, while JSON payloads/dense arrays may not contain `undefined`. Objects are copied from own data descriptors and frozen; host inputs are not frozen. Getters, cycles, executable/nonplain data and excessive input are rejected. Reflection may invoke arbitrary Proxy traps; this is not a sandbox or wire parser.

Submission requires current connected data and the exact run version. The server must independently authorize and enforce that version; this client guard grants no permission. Operations/payloads are application-defined trusted command bindings, not generated executable code.

An identifier dispatches at most once within this session. Reusing it with changed scope/version/operation/payload fails. Repeating the exact original command returns its retained record, including an unknown record, without dispatch. Payload fingerprints ignore object key order. The port must enforce durable idempotency across clients, reconnects and new sessions.

Host receipts echo the exact original command and return `accepted`, `rejected`, `unknown` or `not-found`. Accepted maps to submission acknowledgement. Canonical execution changes only through host events/checkpoints. Missing/malformed/mismatched receipts and transport errors retain an unknown outcome. A default 10-second acknowledgement timeout does the same; `acknowledgementTimeoutMs` accepts integers from 1 to 60,000. A late matching acknowledgement may settle the original record after a transport refresh. Interruption settles a waiting caller immediately as unknown; later state is read through the session subscription.

`reconcile(commandId)` uses the optional read-only `lookup(original)` port. It never dispatches. Lookup tokens discard obsolete competing replies; settled receipts cannot regress from a later unknown/error reply. Snapshot refresh does not reconcile a command receipt by itself. Lookup has no core transport deadline; hosts should bound/abort their I/O. No pending read silently becomes rejection.

The session retains at most 256 command records, including settled/unknown records. Capacity fails closed rather than evicting an unresolved original or allowing a duplicate dispatch. A host must persist receipts before a replacement session; replacing a session does not resolve unknown outcomes.

## History and rendering

The optional checkpoint history is a bounded canonical `ConversationHistory` whose workspace/thread/branch match the fixed session. Snapshot ID and version remain host-owned history identities; they are not derived from runtime sequence or run version.

`page(request)` uses existing `HistoryPageRequest` with the exact accepted context, edge direction and opaque cursor. It only reads available/error edges, requires current runtime data and permits one outstanding page. Responses must retain that exact immutable context. A newer history revision needs a new checkpoint. Refresh/disconnect/dispose fences late page responses. Failed reads retain the previous window and explicit error. No reading-position key is used as authority.

`getSnapshot()` and `subscribe()` expose stable immutable adapter state, runtime, history and command records. `ConnectionInfo.freshness` separates transport and projection state; it is optional for legacy controlled consumers. Three ConnectionStatus layouts keep compact recovery actions reachable and describe unsupported remedies accurately. Command outcome is presented separately from recovery submission.

## Local example

Design Foundations and the plain React consumer include an in-memory host with canonical state, original receipts and a coherent subscription. Try interruption, lost acknowledgement, original lookup and history paging. Request acknowledgement and execution updates are separate actions. The example has no external model, production authorization or durable receipt store.
