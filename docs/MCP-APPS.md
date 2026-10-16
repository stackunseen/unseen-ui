# MCP App views

`MCPAppFrame` in `@stackunseen/ui/mcp-apps` renders an MCP App view (SEP-1865, the MCP Apps extension, draft read on 2026-10-16) inside a sandboxed iframe and bridges JSON-RPC 2.0 over `postMessage` between the view and the host. Import the component from `@stackunseen/ui/mcp-apps` and load `@stackunseen/ui/mcp-apps.css` once. The pure bridge, policy builder and resource check live in `@stackunseen/ui-core` (`createAppBridge`, `buildAppCsp`, `injectAppCsp`, `appPermissionPolicy`, `isAppResource`, `appMethods`).

```tsx
<MCPAppFrame
  server={{ id: 'weather', name: 'Weather server' }}
  resource={fetched} // { uri: 'ui://…', mimeType: 'text/html;profile=mcp-app', html, csp?, permissions?, prefersBorder? }
  state="ready"
  toolInput={call.arguments}
  toolResult={call.result}
  hostCapabilities={{ openLinks: {}, message: { text: {} } }}
  hostContext={{ theme, locale, platform: 'web' }}
  onRequest={(request, reply) => { /* decide, then reply.result(...) or reply.error(code, message) */ }}
  onClose={close}
/>
```

## What the host owns

The host fetches the resource through `resources/read`, checks `isAppResource`, decides whether the server may show views at all (`state: 'blocked'` with a reason), declares what it will honour in `hostCapabilities`, grants iframe permissions explicitly through `grantedPermissions`, and answers every request. Nothing from the view runs in the host page.

## What the frame does

- Sandbox: `allow-scripts` only, plus `allow-forms` when `allowForms` is set. The view never gets `allow-same-origin`, so it runs in an opaque origin. The `allow` attribute lists only the permissions the host granted.
- Policy: the resource's declared `csp` domains become a Content Security Policy injected as the first element of the document head; omitted lists fall back to the restrictive default from the specification (`default-src 'none'`, inline scripts and styles only, `connect-src 'none'`, `frame-src 'none'`, `object-src 'none'`, `form-action 'none'`). Undeclared or malformed origins are dropped, never added.
- Handshake: `ui/initialize` is answered with the host info, capabilities and context (including `containerDimensions.maxHeight`). After `ui/notifications/initialized` the frame sends `ui/notifications/tool-input` once and `ui/notifications/tool-result` whenever `toolResult` is set.
- Size: `ui/notifications/size-changed` grows the frame up to `maxHeight` (600 by default) and never below 48px.
- Requests: `ui/open-link`, `ui/download-file`, `ui/message`, `ui/update-model-context`, `tools/call`, `tools/list` and `resources/read` reach `onRequest` only when the matching capability is declared; otherwise the view gets a `-32000` refusal. Unknown methods get `-32601`. `sampling/createMessage` is always refused. `ping` is answered by the frame. A reply can be settled once.
- Messages from any window other than the frame's are ignored.
- States: `loading` shows a fetching line, `blocked`, `failed` and `closed` show the host's reason with the optional `fallback` (usually the plain ToolResult), and a resource that is not an MCP App is refused with a notice.

## Deviations and limits

The specification asks web hosts to wrap the view in a sandbox proxy on a second origin when the inner frame needs `allow-same-origin`. This frame never grants same-origin, so it embeds the view directly; a host that needs same-origin views must add its own proxy. Display-mode requests are acknowledged but the frame stays inline; `ui/request-display-mode` reaches `onRequest` so the host can answer with the current mode. Host-to-view tool calls (`tools/call` into the app) are not issued by the frame; the bridge's `request` helper exists for hosts that add them.

## Tool results without a view

Most tools return data, not a view. `ToolResult` in the base entry now takes a structured `result` (`{ toolName, mediaType?, data }`) beside `text`. Wrap a tree in `ToolResultRegistryProvider` with `{ match, renderers }`: the host's `match` function returns a renderer key for a result, and the matching host component renders it with the accessible `label`; anything unmatched falls back to the bounded text view (strings as they are, other data as indented JSON). The model never chooses a renderer. While a tool is still returning, pass `partial` with `received` and optional `expected` as host measurements and a `unit`; the result shows a Partial badge, "2 of 40 rows received." or "7 items received so far; total unknown.", and sets `aria-busy`. No percentage is shown without a measured total.
