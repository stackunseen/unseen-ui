import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MCPAppFrame } from './mcp-app-frame.js';

const resource = {
  uri: 'ui://weather/dashboard',
  mimeType: 'text/html;profile=mcp-app',
  name: 'Weather dashboard',
  html: '<!doctype html><html><head><title>w</title></head><body>hi</body></html>',
  csp: { connectDomains: ['https://api.example.com'] },
};
const server = { id: 's1', name: 'Weather server' };

function deliver(frame: HTMLIFrameElement, data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source: frame.contentWindow }));
  });
}

describe('MCPAppFrame', () => {
  it('renders a sandboxed frame with the declared policy and names the server', () => {
    render(<MCPAppFrame server={server} resource={resource} state="ready" />);
    const frame = screen.getByTitle('Weather dashboard') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame).not.toHaveAttribute('allow');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(frame.srcdoc).toContain('http-equiv="Content-Security-Policy"');
    expect(frame.srcdoc).toContain('connect-src https://api.example.com');
    expect(frame.srcdoc.indexOf('Content-Security-Policy')).toBeLessThan(
      frame.srcdoc.indexOf('<title>'),
    );
    expect(screen.getByRole('region', { name: 'Weather dashboard' })).toHaveTextContent(
      'From Weather server. This view can see what you do inside it',
    );
    expect(screen.getByText('Starting')).toBeInTheDocument();
  });

  it('answers initialize, sends tool input once after initialized, resizes within the limit and routes requests through the host', () => {
    const onRequest = vi.fn();
    const onNotification = vi.fn();
    const { rerender } = render(
      <MCPAppFrame
        server={server}
        resource={resource}
        state="ready"
        toolInput={{ city: 'Oslo' }}
        hostCapabilities={{ openLinks: {} }}
        hostContext={{ theme: 'dark' }}
        maxHeight={400}
        onRequest={onRequest}
        onNotification={onNotification}
      />,
    );
    const frame = screen.getByTitle('Weather dashboard') as HTMLIFrameElement;
    const posted: unknown[] = [];
    const target = frame.contentWindow!;
    vi.spyOn(target, 'postMessage').mockImplementation((message: unknown) => {
      posted.push(message);
    });
    deliver(frame, {
      jsonrpc: '2.0',
      id: 1,
      method: 'ui/initialize',
      params: { appCapabilities: {} },
    });
    expect(posted[0]).toMatchObject({
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        hostCapabilities: { openLinks: {} },
        hostContext: { theme: 'dark', containerDimensions: { maxHeight: 400 } },
      },
    });
    deliver(frame, { jsonrpc: '2.0', method: 'ui/notifications/initialized' });
    expect(posted[1]).toEqual({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-input',
      params: { arguments: { city: 'Oslo' } },
    });
    expect(screen.getByText('Connected')).toBeInTheDocument();
    deliver(frame, {
      jsonrpc: '2.0',
      method: 'ui/notifications/size-changed',
      params: { height: 900 },
    });
    expect(frame.style.height).toBe('400px');
    deliver(frame, {
      jsonrpc: '2.0',
      id: 2,
      method: 'ui/open-link',
      params: { url: 'https://example.com' },
    });
    expect(onRequest).toHaveBeenCalledTimes(1);
    const [request, reply] = onRequest.mock.calls[0]!;
    expect(request).toEqual({
      id: 2,
      method: 'ui/open-link',
      params: { url: 'https://example.com' },
    });
    reply.error(-32000, 'Link opening denied by user');
    reply.result({});
    expect(posted[2]).toEqual({
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32000, message: 'Link opening denied by user' },
    });
    expect(posted).toHaveLength(3);
    deliver(frame, {
      jsonrpc: '2.0',
      id: 3,
      method: 'ui/message',
      params: { role: 'user', content: { type: 'text', text: 'x' } },
    });
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(posted[3]).toMatchObject({ id: 3, error: { code: -32000 } });
    deliver(frame, { jsonrpc: '2.0', id: 4, method: 'sampling/createMessage', params: {} });
    expect(posted[4]).toMatchObject({ id: 4, error: { code: -32000 } });
    deliver(frame, { jsonrpc: '2.0', id: 5, method: 'made/up', params: {} });
    expect(posted[5]).toMatchObject({ id: 5, error: { code: -32601 } });
    deliver(frame, {
      jsonrpc: '2.0',
      method: 'notifications/message',
      params: { level: 'info', data: 'hello' },
    });
    expect(onNotification).toHaveBeenCalledWith('notifications/message', {
      level: 'info',
      data: 'hello',
    });
    rerender(
      <MCPAppFrame
        server={server}
        resource={resource}
        state="ready"
        toolInput={{ city: 'Oslo' }}
        toolResult={{ content: [{ type: 'text', text: '12°C' }] }}
        hostCapabilities={{ openLinks: {} }}
        maxHeight={400}
        onRequest={onRequest}
      />,
    );
    expect(posted.at(-1)).toEqual({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: { content: [{ type: 'text', text: '12°C' }] },
    });
  });

  it('ignores messages from other windows', () => {
    const onRequest = vi.fn();
    render(
      <MCPAppFrame
        server={server}
        resource={resource}
        state="ready"
        hostCapabilities={{ openLinks: {} }}
        onRequest={onRequest}
      />,
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { jsonrpc: '2.0', id: 1, method: 'ui/open-link', params: {} },
          source: window,
        }),
      );
    });
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('shows the host reason instead of the frame when blocked, failed, closed or not an app', () => {
    const { rerender } = render(
      <MCPAppFrame
        server={server}
        resource={resource}
        state="blocked"
        reason="Policy forbids this server"
        fallback={<p>Plain result</p>}
      />,
    );
    expect(screen.queryByTitle('Weather dashboard')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Policy forbids this server');
    expect(screen.getByText('Plain result')).toBeInTheDocument();
    rerender(<MCPAppFrame server={server} resource={null} state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Fetching the view from Weather server');
    rerender(
      <MCPAppFrame
        server={server}
        resource={{ ...resource, mimeType: 'text/html' }}
        state="ready"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('not an MCP App');
    rerender(<MCPAppFrame server={server} resource={resource} state="closed" onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('button', { name: 'Close Weather dashboard' })).toBeInTheDocument();
  });

  it('grants only the permissions and form access the host passes', () => {
    render(
      <MCPAppFrame
        server={server}
        resource={resource}
        state="ready"
        grantedPermissions={{ clipboardWrite: {} }}
        allowForms
      />,
    );
    const frame = screen.getByTitle('Weather dashboard');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(frame.getAttribute('allow')).toBe("clipboard-write 'self'");
  });
});
