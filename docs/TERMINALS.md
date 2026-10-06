# Controlled terminal output and optional emulator

Components and core never start processes, connect to a server or authorize input. The optional native example runs outside both packages.

## Plain output

Root-exported `TerminalOutput` needs no xterm/native peer. Console frames a transcript; log adds retained line numbers; compact reduces its height. All three share controlled lifecycle, contextual Copy/Clear icons, labeled follow/navigation actions and a trailing Stop with wrapping and coarse-pointer targets.

Supply `output`, `state`, optional `exitCode` and `context: { sessionId, streamId, version }`. Exact identities are nonblank strings of at most 160 UTF-16 units, without control characters/unpaired surrogates. They are never trimmed into different identities. Process states are idle/running/complete/failed/cancelled/unknown. Exit codes are safe integers and cannot accompany idle/running. Invalid snapshots hide output.

Availability (`status`: ready/loading/denied/unavailable/error/unknown/stale), connection and submission are separate from process lifecycle. Hidden states skip inspection and discard rendered output. Stale output is historical with copy/host actions disabled. Disconnected/reconnecting/unknown connection and submitting/acknowledged/outcome-unknown submission pause host actions. Ready disconnected output may still be copied locally.

Scoped `onRequestStop(context)` / `onRequestClear(context)` take precedence over legacy `onStop()` / `onClear()`. Scoped actions require current valid context. The component never optimistically clears, stops or acknowledges. Local state manages disclosure/follow/focus; removed focused actions restore panel focus.

Raw output retains at most 64,000 UTF-16 units without a leading low surrogate. Plain display strips ANSI/control sequences, retains at most 1,000 newline-separated lines and discloses omissions. Copy uses that plain transcript, preserving carriage returns; it does **not** reconstruct the cursor-positioned screen. Async failures are explicit; output/scope/access changes discard obsolete copy feedback. Hosts redact secrets before rendering/copying.

## Optional browser engine

Install `@xterm/xterm@6.0.0` and `@xterm/addon-fit@0.11.0`. Use the independent client entry and opt-in styles:

```tsx
import { TerminalEmulator } from '@stackunseen/ui/terminal';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/terminal.css';

<TerminalEmulator
  output={host.output}
  state={host.state}
  context={host.context}
  status={host.availability}
  connection={host.connection}
  submission={host.submission}
  variant="compact"
  inputEnabled={host.inputAllowed}
  onInput={host.requestInput}
  onResize={host.requestResize}
  onRequestStop={host.requestStop}
  onRequestClear={host.requestClear}
/>;
```

Input defaults to disabled. Delivery additionally requires connected/ready/running, valid context, a complete retained stream, an onInput handler and no pending/unknown submission. `TerminalInputRequest` includes exact scope and data (at most 1,024 units per event). `TerminalResizeRequest` includes scope, columns (20–240) and rows (6–60). Same scope/dimensions are deduplicated. Throwing callbacks announce unknown delivery; disable/re-enable does not repeat that resize. Hosts reconcile the original receipt before retrying anything.

Browser effects load the engine; SSR/loading/module failure retain plain content. Writes serialize: replacement resets after the previous write finishes; appends preserve parser state. Scope replacement disposes the engine, handlers, observer and timers. Revocation removes it. Selection pauses automatic following. Keyboard input is labeled, the viewport has visible focus, and the shared Accordion exposes the plain transcript (initially open in log).

The 16 normal/bright ANSI colours use scoped semantic tokens; background/cursor/selection/focus follow the theme. Arbitrary 256-colour/true-colour content has no automatic contrast guarantee. No clipboard/hyperlink/image/web-link addons are installed. OSC title/link/clipboard/image and CSI window controls are intercepted; other escape interpretation remains xterm's responsibility. Bounded output is not CPU isolation, a general escape sanitizer or an OS sandbox.

Emulation requires a **complete bounded stream from a known parser baseline**. Truncated tails never initialize it; the plain fallback explains the missing checkpoint. Identity alone does not prove completeness. The fixed sample's active Clear rotates the log and resets the renderer; tests verify this program only. They do not establish complete checkpoint restoration or all cursor/mode preservation for an arbitrary active ANSI application.

## Actual local sample

Build packages/consumer, run `pnpm terminal:serve`, open `http://127.0.0.1:4177/`, then explicitly Connect and Start public process. The fixed Node program accepts help/colors/size/exit, ASCII editing and Ctrl+C. The host accepts exact ConPTY focus reports `ESC[I` / `ESC[O`. No arbitrary program/shell/evaluation/filesystem operations or general device reports are exposed. `pnpm terminal:demo` exercises the same boundary through the CLI.

Only the dedicated helper loads node-pty 1.1.0 and owns native workers. The parent distinguishes native exit from received requests and awaits helper closure. Revocation hides output, changes access version and stops that owned process. Cooperative Ctrl+C precedes a two-second fallback for the same handle. Output stops at 64,000 units rather than feeding an incomplete tail to xterm.

Loopback HTTP validates exact Host/Origin, JSON content type, an 8,192-byte body and strict fields. Intents carry request ID/current scope. A 200-entry non-evicting receipt ledger deduplicates matching IDs, rejects conflicting reuse and refuses new commands when full. Receipts acknowledge invocation/request, **not** successful output/resize/exit. Native unknown outcomes remain explicit; receipts are in memory, not durable across restart.

The consumer connects without launching, serializes polling, queues at most 32 unsent intents, verifies receipt/action/scope and drops obsolete unsent work. Access mutation hides old content and pauses polling until settled. Lost acknowledgements freeze new input and query the original receipt ID without resending. Disconnection never claims termination.

The example has no production authentication, OS isolation or remote provider connection. Receipts are not durable across restart. Test arbitrary ANSI applications, recovery, throughput, browser support and accessibility in your host. Gallery hosts and receipts are simulated.