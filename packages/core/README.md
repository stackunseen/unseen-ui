# @stackunseen/ui-core

The state, validation and types behind [Unseen UI](https://unseenui.com), with no React dependency. Alpha, MIT licensed.

You usually don't install this yourself: it comes with `@stackunseen/ui`. Install it directly if you want the same rules on your server or in a non-React client.

```sh
npm install @stackunseen/ui-core
```

```ts
import { canTransition } from '@stackunseen/ui-core';

canTransition('queued', 'running'); // true
canTransition('succeeded', 'running'); // false
```

| Entry                  | What's in it                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `@stackunseen/ui-core` | Run and tool state transitions, approval checks, safe URL helpers and shared types |
| `/schema`              | Validators for events and snapshots                                                |
| `/conversation`        | Conversation windows and commands                                                  |
| `/history`             | Paged message history                                                              |
| `/adapter`             | Host checkpoints and command receipts                                              |
| `/uploads`             | Upload identities, checkpoints and receipts                                        |
| `/editing`             | Document ranges and text edits                                                     |
| `/ai-sdk`              | Mapping from Vercel AI SDK chat messages                                           |

The package doesn't touch the DOM, the network or storage. Snapshots are immutable, and stream order and revisions are checked as they arrive. If you create a runtime, dispose it when you're done so its timers and subscriptions are released.

These helpers check the shape of data; they don't authorize anything. Your server still has to authenticate users, enforce access, deduplicate commands and keep its own records of what ran. When an outcome is unknown, for example after a dropped connection, look it up before retrying.

Import from the package root or one of the entries above. Internal file paths aren't part of the API.
