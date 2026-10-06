# Upload checkpoints and original receipts

`@stackunseen/ui-core/uploads` and `@stackunseen/ui/upload` provide upload contracts and a controlled [attachment](ATTACHMENTS.md) composition. They do not start networking, authorize a file or select a provider. The browser example and a separate local disk/HTTP host exercise the contract with actual bytes.

## Ownership and identity

`UploadContext` pins workspace, optional thread, attachment ID, immutable content version and upload session ID. A display filename is never a path or authority. Mutable `revision` is separate from immutable `version`. The complete-file `sha256` binds content before bytes are accepted; append commands carry a separate chunk digest. Resume cannot substitute other bytes under the same identity.

`UploadCheckpoint` reports host-confirmed contiguous `receivedBytes`, lifecycle, access and source/version-labelled capabilities. Client wire progress is not a committed checkpoint. Complete bytes do not imply `ready`: the host must verify completion and publish it. Cancelled/removed checkpoints retain their historical received offset even when stored bytes have been cleared. That offset is not current disk usage.

The inspectors accept unknown normalized input, copy bounded own descriptors before schema traversal and return immutable copies. They reject accessors, arrays, nonplain objects, cycles, excessive text and contradictory byte/state combinations. Reflection can execute Proxy traps; this is not an arbitrary-code sandbox. Transports own wire bounds, decoding and deadlines. Core imports no React, browser, networking, persistence or provider SDK.

## Commands and receipts

Every command has an immutable original command ID, full context and expected revision. Operations are `begin`, `append`, `complete`, `cancel` and `remove`. An append requires its exact contiguous offset, declared body length and chunk SHA-256. Completion binds the complete-file digest. A structurally valid command is still subject to host authority and current scope/access/capacity.

An `applied` receipt echoes the entire original and requires the checkpoint at exactly expected revision plus one. Its metadata, committed offset and lifecycle must agree with that operation. `rejected`, `unknown` and `not-found` are distinct. A missing response or local abort retains the original as outcome unknown. A current checkpoint or changed byte offset cannot settle which original command executed.

Read-only original receipt lookup never dispatches again. Historical receipts remain meaningful after a newer checkpoint, revocation or removal; applying one must not regress current metadata/revision/offset. Transport refresh does not replay commands. Browser or server restarts require preserved originals and host deduplication; this example's browser owner retains its selected bytes/original only while its page remains mounted.

## Three controlled layouts

`UploadAttachment` composes `Attachment.Root`, Preview, Info and Progress with the existing IconButton/theme system. Row, tile and compact styles keep actions adjacent to their file. Callbacks carry full context and exact current revision; original lookup carries the original command. These are intents, not executable permissions.

Stale, invalid/mismatched context, submitting/acknowledged/unknown original state and unavailable access gate mutations. Resume also requires declared supported capability; unsupported and unknown capability remain visible. Old original lookup remains reachable after current revision/lifecycle changes. Full context replacement unmounts a previously open preview even if attachment ID/version happen to match. Owned action focus repairs to the labelled wrapper when a focused action disappears or becomes disabled; unrelated focus is preserved.

`operation.state = acknowledged` indicates request acknowledgement while authoritative lifecycle is still reported separately. A host owner clears that pending operation after installing its validated checkpoint/receipt. The concrete local host's `applied` receipt confirms the actual disk operation; it does not claim production authentication, malware scanning or provider acceptance.

Legacy base Attachment callbacks retain local draft semantics. Removing an unsubmitted selection is local removal with no manufactured host receipt. Clearing a running transfer is different from acknowledged host cancellation or removal. Text/transcript previews have named keyboard reading regions; revoked/removed content disappears from an already open preview.

## Working local integration

After `pnpm build`, run:

```sh
pnpm uploads:serve
```

Open `http://127.0.0.1:4179/`, then Connect and select a file. The gallery's Design Foundations page renders the same composition; its separate static origin does not bypass the host's same-origin checks. `pnpm uploads:demo` runs a finite disk/socket-disconnect/original-lookup/restart/resume verification and closes its listener.

The private example workspace depends on the public core subpath. Storage defaults to `output/upload-host-store`; optional `AI_UPLOAD_STORE` selects another caller-owned demo directory. Never run two writers against one directory. Opaque host-generated record filenames contain checkpoint, base64 bytes and original receipts in one bounded record. Temp write plus rename commits that record before an applied receipt is returned. Ready content is rechecked against its bound digest when reopening the host. Successful graceful reopen is verified; fsync, power-loss/crash durability and multiple writers are not verified.

| Boundary | Limit/behavior |
| --- | --- |
| File and chunk | 4 MiB per file; 64 KiB per raw append |
| Retained resources | Eight, including cancelled/removed tombstones |
| Original receipts | 256 across the host; no silent eviction/retry |
| Pending broker operations | 32; overflow fails with 429 |
| Disk record and metadata | 10 MiB per record; 8 KiB decoded request JSON/command metadata |
| Browser response and preview | 100,000 response bytes before JSON; 20,000 text preview characters |
| Network scope | Loopback and exact Host/Origin; finite raw bodies/request deadlines; no production authentication |
| Original content | Explicit attachment download with octet-stream/nosniff/sandbox response; never generated inline HTML |

The shared global receipt budget can prevent a later maximum-size file before all eight resource slots are filled. Capacity failures preserve unknown outcomes; they do not permit silent replacement of an original. Host deletion clears content and retains receipt tombstones. Access fixture changes advance revision independently; originals remain readable while content/mutations are gated.

The browser owner uses Web Crypto, one sequential chunk transfer and explicit lookup/refresh. Pause waits for the current acknowledged checkpoint without claiming host cancellation. Interrupt aborts an in-flight response and retains an unknown original. Resume reads the exact current host checkpoint and continues at its committed offset with the already bound file. There is no automatic mutation retry or reload restoration. HTTP clients/browsers may internally retry transport requests; the host deduplicates the complete original command regardless.

The loss fixture defaults to a finite 503 after committing, withholding the original receipt so browser uncertainty is reproducible. An explicit `disconnect: true` mode closes the socket after commit for finite Node transport tests. Neither fixture changes an applied operation into failure.

## Integration limits

Production authorization, object storage, malware/content policy and durable browser-session recovery belong to the host. The example has no drop/paste intake, background retry scheduling or provider integration. Check browser and assistive-technology behavior in the consuming application.