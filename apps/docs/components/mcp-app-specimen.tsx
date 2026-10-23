'use client';
import { useState } from 'react';
import { resolveVariant } from '@stackunseen/ui';
import { MCPAppFrame } from '@stackunseen/ui/mcp-apps';
import type { MCPAppResource } from '@stackunseen/ui/mcp-apps';
import '@stackunseen/ui/mcp-apps.css';

// A self-contained MCP App view: it initializes, reports its size, shows the tool input the host
// sends, and asks the host to open a link and to post a message. Nothing here reaches a network.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font:14px/1.5 system-ui,sans-serif;color:#18181b;background:#fff;padding:12px}
h1{font-size:16px;margin:0 0 8px}button{font:inherit;padding:6px 10px;border:1px solid #71717a;border-radius:8px;background:#fff;cursor:pointer;margin-right:8px}
pre{background:#f4f4f5;padding:8px;border-radius:8px;overflow:auto}
</style></head><body>
<h1>Weather view</h1>
<p id="input">Waiting for tool input…</p>
<pre id="result">No result yet.</pre>
<p><button id="link">Open forecast page</button><button id="msg">Ask for a 7-day forecast</button></p>
<p id="log" aria-live="polite"></p>
<script>
let nextId = 1; const pending = {};
function send(method, params){ const id = nextId++; parent.postMessage({jsonrpc:'2.0', id, method, params}, '*'); return new Promise((resolve) => { pending[id] = resolve; }); }
function notify(method, params){ parent.postMessage({jsonrpc:'2.0', method, params}, '*'); }
addEventListener('message', (event) => {
  const data = event.data; if (!data || data.jsonrpc !== '2.0') return;
  if (data.id !== undefined && pending[data.id]) { pending[data.id](data); delete pending[data.id]; return; }
  if (data.method === 'ui/notifications/tool-input') document.getElementById('input').textContent = 'Tool input: ' + JSON.stringify(data.params.arguments);
  if (data.method === 'ui/notifications/tool-result') document.getElementById('result').textContent = JSON.stringify(data.params, null, 2);
});
function size(){ notify('ui/notifications/size-changed', { height: document.documentElement.scrollHeight }); }
send('ui/initialize', { appCapabilities: {}, appInfo: { name: 'weather-view', version: '1' }, protocolVersion: '2025-06-18' }).then((reply) => {
  document.getElementById('log').textContent = 'App: ' + (reply.result && reply.result.hostInfo ? reply.result.hostInfo.name : 'unknown') + ', theme ' + (reply.result && reply.result.hostContext ? reply.result.hostContext.theme : '?');
  notify('ui/notifications/initialized'); size(); new ResizeObserver(size).observe(document.body);
});
document.getElementById('link').onclick = () => send('ui/open-link', { url: 'https://example.com/forecast' }).then((r) => { document.getElementById('log').textContent = r.error ? 'Your app said: ' + r.error.message : 'Your app opened the link.'; });
document.getElementById('msg').onclick = () => send('ui/message', { role: 'user', content: { type: 'text', text: 'Show me the 7-day forecast' } }).then((r) => { document.getElementById('log').textContent = r.error ? 'Your app said: ' + r.error.message : 'Your app accepted the message.'; });
</script></body></html>`;

const resource: MCPAppResource = {
  uri: 'ui://weather-server/dashboard',
  mimeType: 'text/html;profile=mcp-app',
  name: 'Weather dashboard',
  html,
  csp: {},
  prefersBorder: true,
};

export function MCPAppSpecimen({
  state,
  presentation,
  onNotice,
}: {
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const [closed, setClosed] = useState(false);
  const [result, setResult] = useState<unknown>(undefined);
  const frameState = closed
    ? 'closed'
    : state === 'Blocked'
      ? 'blocked'
      : state === 'Fetching'
        ? 'loading'
        : state === 'Failed'
          ? 'failed'
          : 'ready';
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <MCPAppFrame
        key={`${state}:${closed}`}
        variant={resolveVariant('MCPAppFrame', presentation)}
        server={{ id: 'weather', name: 'Weather server' }}
        resource={
          state === 'Fetching'
            ? null
            : state === 'Not an app'
              ? { ...resource, mimeType: 'text/html' }
              : resource
        }
        state={frameState}
        reason={
          state === 'Blocked'
            ? 'Policy: this server may not show views in this workspace.'
            : state === 'Failed'
              ? 'resources/read returned no content.'
              : undefined
        }
        toolInput={{ city: 'Oslo', days: 3 }}
        toolResult={result}
        hostInfo={{ name: 'Unseen UI docs', version: '0' }}
        hostCapabilities={
          state === 'Nothing granted' ? {} : { openLinks: {}, message: { text: {} } }
        }
        hostContext={{ theme: 'light', locale: 'en-US', platform: 'web' }}
        maxHeight={360}
        onRequest={(request, reply) => {
          if (request.method === 'ui/open-link') {
            onNotice(
              `The view asked to open ${JSON.stringify((request.params as { url?: string })?.url)}. The sample app declines.`,
            );
            reply.error(-32000, 'Link opening denied by user');
            return;
          }
          if (request.method === 'ui/message') {
            onNotice(
              'The view sent a message for the conversation. The sample app accepted it and returned a tool result.',
            );
            reply.result({});
            setResult({
              content: [{ type: 'text', text: 'Oslo: 12°C, light rain, 3-day outlook attached.' }],
            });
            return;
          }
          reply.error(-32601, 'Not supported here');
        }}
        onNotification={(method) => onNotice(`Notification from the view: ${method}`)}
        onClose={() => {
          setClosed(true);
          onNotice('View closed by the person.');
        }}
        fallback={<p style={{ margin: 0 }}>Plain tool output: Oslo, 12°C, light rain.</p>}
      />
    </div>
  );
}
