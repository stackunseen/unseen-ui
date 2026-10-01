# Controlled workspace files

FileExplorer renders a bounded host window and emits requests. It does not read files, confer access or execute commands. `folders`, `list` and `compact` project the same records as nested disclosures, full-path detail cards and directory groups. Legacy `onSelect(file)` keeps its one-argument shape; prefer the scoped callback for host integrations.

## Identity and ownership

`context: WorkspaceFileSnapshot` supplies `workspaceId` and immutable snapshot `version`. `onRequestOpen(FileOpenRequest)` emits those identities plus `fileId`, original `path` and optional `fileVersion`. It takes precedence over legacy selection and requires context. Selection remains controlled: set `selection` only after the host validates current scope, access and content and acknowledges the request. A matching inspector is an inspection projection, not proof that a filesystem read occurred.

Scoped selection must match all five current identity fields and an available record. Old versions, changed workspaces, missing files, denied access and ambiguous legacy/scoped selections hide the inspector with an explicit notice. Paths normalize separators for hierarchy/uniqueness while callbacks retain original host spelling. Metadata is host reported; missing versions, size and modification times remain unknown. Epoch modification times are displayed in UTC.

`status` distinguishes ready, loading, denied, unavailable, error, unknown, stale and refreshing. Hidden states skip data traversal and omit names/metadata; historical stale/refreshing windows remain visible with opening paused. Per-file denied/missing/unknown access disables opening. Missing callbacks or missing scope remain explicit. Components never infer authority from their enabled buttons.

## Windows, filtering and bounds

`pagination: FilePage` describes the supplied page; `onPageChange(index, context?)` requests replacement. Known totals require consistent exact window lengths. Unknown totals enable Next only with explicit `hasNextPage: true`. No local paging or optimistic replacement occurs. `query`/`onQueryChange` filter this window only, with that limitation stated in the interface. A selected file outside the filter retains its current inspector.

Limits are 500 records and 500 derived folders, 12 folder levels, 1,024 UTF-16 units per path, 160 per identity and 200 per filter. IDs and normalized paths are unique. Empty/dot/traversal/drive/control-character paths, file/directory collisions and inconsistent page metadata reject the entire window rather than silently truncating it. A plain-data preflight rejects accessors, executable values, cycles and excessive aggregate input before schema validation. Other generated-content callers retain their existing 200-item array limit.

The folder projection reuses controlled Radix Accordion and native lists/buttons; it does not claim an ARIA tree keyboard model. List/compact show complete current filtered records. Folder expansion is host owned; obsolete expansion paths are disclosed. Removed/disabled focused controls restore focus to the labeled file group when focus otherwise falls to the document body. No virtualization, drag/drop, rename or editor runtime is provided.

## Actual read-only sample host

Build with `pnpm build`, then run `pnpm files:demo` and open **http://127.0.0.1:4176/**. Choose Connect sample file host. The consumer uses same-origin HTTP callbacks; no automatic connection occurs in static galleries or SSR. The server reads the dedicated public `examples/file-host/workspace` directory, with a fixed three-file content allowlist. `private.txt` is a deliberately denied public fixture. The server cannot select an arbitrary workspace through a request.

The host enumerates bounded actual windows, hashes original file bytes and validates current workspace/snapshot/file/path/content identities before bounded UTF-8 reads. Read receipts acknowledge actual source; the consumer renders text inertly. Content changes and access revisions invalidate old requests. Revoke/restore changes the sample host policy and clears old source/selection. Symlinks are skipped, final-path containment and opened-file identity are checked, and oversized/non-UTF-8 content remains unavailable. Each read is limited to 65,536 bytes.

This is a loopback demonstration with same-origin JSON/Host checks and a dedicated public fixture root. It is not production authentication, a hostile filesystem sandbox, race-proof OS authorization or a provider/coding-agent integration. A production host must own authentication, authoritative policy, filesystem trust, revocation monitoring and receipt reconciliation. No writes, shell commands, PTY or automatic non-idempotent retry endpoint exists.
