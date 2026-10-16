import { describe, expect, it } from 'vitest';
import {
  appMethods,
  appPermissionPolicy,
  buildAppCsp,
  createAppBridge,
  injectAppCsp,
  isAppResource,
  jsonRpcErrors,
} from '@stackunseen/ui-core';

describe('MCP Apps bridge', () => {
  it('classifies initialize, notifications, requests and responses and never throws on junk', () => {
    const bridge = createAppBridge({
      hostInfo: { name: 'unseen-docs', version: '0' },
      hostCapabilities: { openLinks: {} },
      hostContext: { theme: 'dark', containerDimensions: { maxHeight: 600 } },
    });
    expect(bridge.receive(null)).toEqual({ kind: 'invalid', reason: 'Message was not an object' });
    expect(bridge.receive({ id: 1 })).toMatchObject({ kind: 'invalid' });
    expect(bridge.receive({ jsonrpc: '2.0', id: {}, method: 'x' })).toMatchObject({
      kind: 'invalid',
    });
    const init = bridge.receive({
      jsonrpc: '2.0',
      id: 1,
      method: appMethods.initialize,
      params: {
        appCapabilities: { availableDisplayModes: ['inline'] },
        appInfo: { name: 'view' },
        protocolVersion: '2025-06-18',
      },
    });
    expect(init).toEqual({
      kind: 'initialize',
      id: 1,
      appCapabilities: { availableDisplayModes: ['inline'] },
      appInfo: { name: 'view' },
      protocolVersion: '2025-06-18',
    });
    expect(bridge.initializeResult(1)).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        hostInfo: { name: 'unseen-docs', version: '0' },
        hostCapabilities: { openLinks: {} },
        hostContext: { theme: 'dark', containerDimensions: { maxHeight: 600 } },
      },
    });
    expect(bridge.receive({ jsonrpc: '2.0', method: appMethods.initialized })).toEqual({
      kind: 'initialized',
    });
    expect(
      bridge.receive({
        jsonrpc: '2.0',
        method: appMethods.sizeChanged,
        params: { height: 320, width: -1 },
      }),
    ).toEqual({
      kind: 'size-changed',
      height: 320,
      width: undefined,
    });
    expect(
      bridge.receive({
        jsonrpc: '2.0',
        id: 'a',
        method: appMethods.openLink,
        params: { url: 'https://example.com' },
      }),
    ).toEqual({
      kind: 'request',
      id: 'a',
      method: 'ui/open-link',
      params: { url: 'https://example.com' },
    });
    expect(
      bridge.receive({ jsonrpc: '2.0', method: appMethods.log, params: { level: 'info' } }),
    ).toEqual({
      kind: 'notification',
      method: 'notifications/message',
      params: { level: 'info' },
    });
    expect(bridge.error('a', jsonRpcErrors.denied, 'Link opening denied by user')).toEqual({
      jsonrpc: '2.0',
      id: 'a',
      error: { code: -32000, message: 'Link opening denied by user' },
    });
    expect(bridge.reply('a', {})).toEqual({ jsonrpc: '2.0', id: 'a', result: {} });
    expect(bridge.notify(appMethods.toolInput, { arguments: { q: 1 } })).toEqual({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-input',
      params: { arguments: { q: 1 } },
    });
  });

  it('tracks host requests until their response and reports unknown responses', () => {
    const bridge = createAppBridge({ hostInfo: { name: 'h', version: '1' } });
    const { id, message } = bridge.request(appMethods.toolsList, {});
    expect(message).toEqual({ jsonrpc: '2.0', id, method: 'tools/list', params: {} });
    expect(bridge.pending()).toEqual([{ id, method: 'tools/list' }]);
    const response = bridge.receive({ jsonrpc: '2.0', id, result: { tools: [] } });
    expect(response).toEqual({ kind: 'response', id, result: { tools: [] } });
    expect(bridge.settle(id)).toBe(true);
    expect(bridge.settle(id)).toBe(false);
    expect(bridge.pending()).toEqual([]);
    expect(bridge.receive({ jsonrpc: '2.0', id: 9, error: { code: 'x', message: 5 } })).toEqual({
      kind: 'response',
      id: 9,
      error: { code: -32603, message: 'Unknown error', data: undefined },
    });
  });

  it('builds a restrictive policy from declared domains and never loosens it', () => {
    expect(buildAppCsp(undefined)).toBe(
      "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'none'; base-uri 'self'; object-src 'none'; form-action 'none'",
    );
    const csp = buildAppCsp({
      connectDomains: ['https://api.example.com', 'javascript:alert(1)', 'wss://live.example.com'],
      resourceDomains: ['https://*.cdn.example.com', 'not a url'],
      frameDomains: ['https://player.example.com'],
    });
    expect(csp).toContain('connect-src https://api.example.com wss://live.example.com');
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://*.cdn.example.com");
    expect(csp).toContain('frame-src https://player.example.com');
    expect(csp).not.toContain('javascript:');
    expect(csp).not.toContain('not a url');
    const html = injectAppCsp(
      '<!doctype html><html><head><title>x</title></head><body>hi</body></html>',
      "default-src 'none'",
    );
    expect(html.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(
      html.indexOf('<title>'),
    );
    expect(injectAppCsp('<p>bare</p>', "default-src 'none'")).toMatch(
      /^<!doctype html><html><head><meta http-equiv/,
    );
    expect(appPermissionPolicy({ camera: {}, clipboardWrite: {} })).toBe(
      "camera 'self'; clipboard-write 'self'",
    );
    expect(appPermissionPolicy(undefined)).toBe('');
    expect(
      isAppResource({ uri: 'ui://weather/dashboard', mimeType: 'text/html;profile=mcp-app' }),
    ).toBe(true);
    expect(isAppResource({ uri: 'https://x', mimeType: 'text/html;profile=mcp-app' })).toBe(false);
    expect(isAppResource({ uri: 'ui://x', mimeType: 'text/html' })).toBe(false);
  });
});
