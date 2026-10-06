# Conversation history and reading surfaces

Experimental controlled composition. Import `ConversationViewport` from `@stackunseen/ui/viewport`, history types/inspection from `@stackunseen/ui-core/history`, and the shared opt-in stylesheet/theme. Install the optional `@tanstack/react-virtual` peer. The tested version is 3.14.13 with virtual-core 3.17.11; the base, code, math, diagram and terminal entries do not require it.

## Ownership and data

The host supplies a chronological `ConversationHistory`: exact workspace/thread/optional branch/snapshot/version context, canonical messages, older/newer edges, optional absolute start index and total. An edge is `end`, `available`, `loading`, `error` or `unknown`. Available/loading/error require an opaque cursor; end/unknown cannot carry one. A failed request retains its original cursor. UI requests emit `{context, direction, cursor}` and never fetch, retry automatically, authorize, persist or infer success.

The renderer does not assemble history from provider events. The simulated Workbench adapts its existing immutable runtime snapshot into a complete local window; the Design Foundations and consumer example use deterministic local history. These are not production history/provider integrations.

`inspectConversationHistory` rejects invalid windows rather than silently truncating. Limits are 10,000 messages, 5,000,000 aggregate string units, 200,000 visited values, depth eight, canonical 100 parts/100,000 text units per message. Duplicate IDs, sparse arrays, accessors, cycles, executable/non-plain data, inconsistent counts and scope are rejected. Descriptor inspection is not arbitrary Proxy isolation or a hard CPU/memory deadline. Fully frozen validated windows/rows reuse weakly held copies; mutable inputs are rechecked and host inputs are never frozen by the inspector.

`loading`, `denied`, `unknown`, `unavailable` and `error` hide messages and do not inspect their payload. Stale data can remain visible with an explicit notice, but page requests are locked. Hosts must also disable privileged actions they supply through action slots; presentation does not authorize them.

## Three presentations and two reading modes

`thread`, `bubble` and `compact` reuse the canonical Message renderer and ordered parts. Host content renderers, source/tool/attachment lookups and action slots remain available. One bordered reading surface contains the transcript. Earlier/newer controls occupy its edges; compact message actions stay with their message; Jump to latest appears only while reading away from the end. If the newer edge is not known to be complete, its label is Jump to end of window.

Virtual mode reuses TanStack measured rows, stable message IDs, end anchoring, append following and four-row overscan. It follows append/last-message growth only when already near the end (48px threshold). Prepending history preserves the visible anchor. A focused message stays rendered. Text-selection endpoints and a contiguous range of at most 200 messages remain rendered; larger cross-window selections are not guaranteed. Dynamic content is measured rather than assumed to have a fixed height.

Reading mode puts the entire host window in a normal ordered list, bounded to 200 messages. A larger window shows an explicit request for a smaller host window. It never silently displays the first 200 rows. Browser find, assistive reading and large selection need an appropriate host window; virtualized history does not put all history into the accessibility tree. List positions/totals use host measurements; unknown totals remain unknown. The transcript is not a live log that re-announces remounted history/token updates.

The component has a default bounded height; the host can set its height through `style`/a class. The transcript owns vertical scrolling; the composer belongs outside it. Avoid a second competing scroll container around message rows. SSR of reading mode contains its full bounded content; virtual mode renders its named shell until the browser measures rows.

## Position and scope

`onPositionChange` reports the first visible message ID and nonnegative pixel inset after a 150ms debounce. It binds the exact current context and cancels obsolete reports. The stable reading scope is workspace/thread/branch; snapshot revisions preserve useful scrolling, while a different thread/branch or hidden access replaces the reader. Focus returns to the reading area when its message is removed and to the named region when the scope/access is replaced.

`restore` binds request ID, exact context, message ID and inset. Restoration reports `applied`, `obsolete` or `missing`, does not fetch a missing target, clamps inset to the measured target height and discards obsolete asynchronous work. It is a local reading operation, not a durable receipt. A mounted reader retains the most recent 128 consumed restoration identities; hosts should provide fresh request IDs and not replay old requests. Reload/persistence belongs to the host.

```tsx
import { ConversationViewport } from '@stackunseen/ui/viewport';
import type { ConversationHistory } from '@stackunseen/ui-core/history';

function History({ value, requestPage }: {
  value: ConversationHistory;
  requestPage: (request: import('@stackunseen/ui-core/history').HistoryPageRequest) => void;
}) {
  return <ConversationViewport value={value} variant="thread" onRequestPage={requestPage} />;
}
```

## Integration limits

Virtual rows omit offscreen content from the DOM. Use reading mode when browser find, long selection or assistive reading requires the complete supplied window. Test rich message heights, prepend/append behavior and restoration with your own content; synthetic plain-text measurements do not establish arbitrary-history performance.

See the [TanStack virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) for the underlying measurement model.
