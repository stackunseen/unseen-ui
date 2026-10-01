# @ai-interaction/core

Framework-independent contracts and state projection for **Unseen UI by Stack Unseen**. Experimental, private, unpublished and marked `UNLICENSED`.

Follow [Getting Started](../../docs/GETTING-STARTED.md) for workspace setup. These are local package imports, not an npm registry installation.

| Entry                  | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `@ai-interaction/core` | Runtime projection, transitions, approval validation, safe URLs and domain types |
| `/schema`              | Canonical event and snapshot validators                                          |
| `/conversation`        | Scoped conversation windows and commands                                         |
| `/history`             | Bounded chronological history and page/restore contracts                         |
| `/adapter`             | Coherent host checkpoints and exact original command receipts                    |
| `/uploads`             | Upload identities, digests, checkpoints and receipts                             |

Core imports no React, browser APIs, provider SDKs, networking or persistence. Snapshots are immutable; stream identity, ordering and revisions are validated. Reconcile gaps through the host, and dispose runtimes to release subscriptions and timers.

Validation helpers do not authorize actions. Hosts authenticate actors, enforce access, deduplicate commands and retain durable receipts. Unknown outcomes must be reconciled before retrying mutations.

Read [message parts](../../docs/MESSAGE-PARTS.md), [conversations](../../docs/CONVERSATIONS.md), [history](../../docs/HISTORY-VIEWPORT.md), [adapters](../../docs/ADAPTERS.md) and [uploads](../../docs/UPLOADS.md) for exact types, bounds and examples.
