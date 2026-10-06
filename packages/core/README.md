# @stackunseen/ui-core

Framework-independent contracts and state projection for **Unseen UI by Stack Unseen**. Experimental alpha; registry publication and license selection are pending. The package is currently unpublished and `UNLICENSED`.

Once the first alpha is published, install it with `npm install @stackunseen/ui-core@alpha`. It also installs automatically with `@stackunseen/ui`.

```ts
import { canTransition } from '@stackunseen/ui-core';

canTransition('queued', 'running'); // true
canTransition('succeeded', 'running'); // false
```

| Entry                  | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `@stackunseen/ui-core` | Runtime projection, transitions, approval validation, safe URLs and domain types |
| `/schema`              | Canonical event and snapshot validators                                          |
| `/conversation`        | Scoped conversation windows and commands                                         |
| `/history`             | Bounded chronological history and page/restore contracts                         |
| `/adapter`             | Coherent host checkpoints and exact original command receipts                    |
| `/uploads`             | Upload identities, digests, checkpoints and receipts                             |

Core imports no React, browser APIs, provider SDKs, networking or persistence. Snapshots are immutable; stream identity, ordering and revisions are validated. Reconcile gaps through the host, and dispose runtimes to release subscriptions and timers.

Validation helpers do not authorize actions. Hosts authenticate actors, enforce access, deduplicate commands and retain durable receipts. Unknown outcomes must be reconciled before retrying mutations.

Each entry includes TypeScript declarations. Import from the package root or an exported subpath; internal source paths are not a supported API.
