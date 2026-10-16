/**
 * The host side of the MCP Apps bridge (SEP-1865, draft read on 2026-10-16): JSON-RPC 2.0 over
 * postMessage between a sandboxed view and the host. This module classifies incoming messages,
 * builds replies, tracks host requests and derives the Content Security Policy and permission
 * attributes from the resource's declared metadata. It touches no DOM and runs nothing from the
 * view; the host decides what every request means.
 */

export type JsonRpcId = string | number;
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}
export interface AppResourceCsp {
  connectDomains?: readonly string[];
  resourceDomains?: readonly string[];
  frameDomains?: readonly string[];
  baseUriDomains?: readonly string[];
}
export interface AppPermissions {
  camera?: object;
  microphone?: object;
  geolocation?: object;
  clipboardWrite?: object;
}
export interface AppResourceMeta {
  csp?: AppResourceCsp;
  permissions?: AppPermissions;
  prefersBorder?: boolean;
}
export interface AppHostContext {
  theme?: 'light' | 'dark';
  displayMode?: 'inline' | 'fullscreen' | 'pip';
  availableDisplayModes?: readonly ('inline' | 'fullscreen' | 'pip')[];
  containerDimensions?: { maxHeight?: number; maxWidth?: number; height?: number; width?: number };
  locale?: string;
  timeZone?: string;
  userAgent?: string;
  platform?: 'web' | 'desktop' | 'mobile';
  toolInfo?: { id?: JsonRpcId; tool: { name: string; [key: string]: unknown } };
}
export interface AppHostCapabilities {
  openLinks?: object;
  downloadFile?: object;
  serverTools?: { listChanged?: boolean };
  serverResources?: { listChanged?: boolean };
  logging?: object;
  message?: Record<string, object>;
  updateModelContext?: Record<string, object>;
  sandbox?: { permissions?: AppPermissions; csp?: AppResourceCsp };
}

export type AppBridgeEvent =
  | { kind: 'initialize'; id: JsonRpcId; appCapabilities: Record<string, unknown>; appInfo?: unknown; protocolVersion?: string }
  | { kind: 'initialized' }
  | { kind: 'size-changed'; width?: number; height?: number }
  | { kind: 'request'; id: JsonRpcId; method: string; params: unknown }
  | { kind: 'notification'; method: string; params: unknown }
  | { kind: 'response'; id: JsonRpcId; result?: unknown; error?: JsonRpcError }
  | { kind: 'invalid'; reason: string };

export interface AppBridge {
  /** Classify one message received from the view. Never throws. */
  receive(data: unknown): AppBridgeEvent;
  /** The reply to `ui/initialize`. */
  initializeResult(id: JsonRpcId): Record<string, unknown>;
  reply(id: JsonRpcId, result: unknown): Record<string, unknown>;
  error(id: JsonRpcId, code: number, message: string, data?: unknown): Record<string, unknown>;
  notify(method: string, params?: unknown): Record<string, unknown>;
  /** A host request to the view; the id is remembered until its response arrives. */
  request(method: string, params?: unknown): { id: number; message: Record<string, unknown> };
  /** Marks a response as consumed; false when no such request is pending. */
  settle(id: JsonRpcId): boolean;
  pending(): readonly { id: number; method: string }[];
}

export const appProtocolVersion = '2025-06-18';
export const appMethods = Object.freeze({
  initialize: 'ui/initialize',
  initialized: 'ui/notifications/initialized',
  sizeChanged: 'ui/notifications/size-changed',
  toolInput: 'ui/notifications/tool-input',
  toolInputPartial: 'ui/notifications/tool-input-partial',
  toolResult: 'ui/notifications/tool-result',
  toolCancelled: 'ui/notifications/tool-cancelled',
  hostContextChanged: 'ui/notifications/host-context-changed',
  resourceTeardown: 'ui/resource-teardown',
  openLink: 'ui/open-link',
  downloadFile: 'ui/download-file',
  message: 'ui/message',
  requestDisplayMode: 'ui/request-display-mode',
  updateModelContext: 'ui/update-model-context',
  toolsCall: 'tools/call',
  toolsList: 'tools/list',
  resourcesRead: 'resources/read',
  sampling: 'sampling/createMessage',
  log: 'notifications/message',
  ping: 'ping',
});
export const jsonRpcErrors = Object.freeze({
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  denied: -32000,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function isId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === 'string' && value.length <= 200) ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}
function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function createAppBridge(options: {
  hostInfo: { name: string; version: string };
  hostCapabilities?: AppHostCapabilities;
  hostContext?: AppHostContext;
}): AppBridge {
  const pending = new Map<number, string>();
  let next = 1;
  return {
    receive(data) {
      if (!isRecord(data)) return { kind: 'invalid', reason: 'Message was not an object' };
      if (data.jsonrpc !== '2.0') return { kind: 'invalid', reason: 'Missing jsonrpc 2.0 marker' };
      if (typeof data.method === 'string') {
        const method = data.method;
        const params = isRecord(data.params) ? data.params : {};
        if (isId(data.id)) {
          if (method === appMethods.initialize)
            return {
              kind: 'initialize',
              id: data.id,
              appCapabilities: isRecord(params.appCapabilities) ? params.appCapabilities : {},
              appInfo: params.appInfo ?? params.clientInfo,
              protocolVersion:
                typeof params.protocolVersion === 'string' ? params.protocolVersion : undefined,
            };
          return { kind: 'request', id: data.id, method, params: data.params };
        }
        if (data.id !== undefined) return { kind: 'invalid', reason: 'Request id must be a string or number' };
        if (method === appMethods.initialized) return { kind: 'initialized' };
        if (method === appMethods.sizeChanged)
          return { kind: 'size-changed', width: finite(params.width), height: finite(params.height) };
        return { kind: 'notification', method, params: data.params };
      }
      if (isId(data.id) && ('result' in data || 'error' in data)) {
        const error = isRecord(data.error)
          ? {
              code: typeof data.error.code === 'number' ? data.error.code : jsonRpcErrors.internal,
              message: typeof data.error.message === 'string' ? data.error.message : 'Unknown error',
              data: data.error.data,
            }
          : undefined;
        return error
          ? { kind: 'response', id: data.id, error }
          : { kind: 'response', id: data.id, result: data.result };
      }
      return { kind: 'invalid', reason: 'Neither a request, a notification nor a response' };
    },
    initializeResult(id) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: appProtocolVersion,
          hostInfo: options.hostInfo,
          hostCapabilities: options.hostCapabilities ?? {},
          hostContext: options.hostContext ?? {},
        },
      };
    },
    reply(id, result) {
      return { jsonrpc: '2.0', id, result };
    },
    error(id, code, message, data) {
      return {
        jsonrpc: '2.0',
        id,
        error: data === undefined ? { code, message } : { code, message, data },
      };
    },
    notify(method, params) {
      return params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params };
    },
    request(method, params) {
      const id = next++;
      pending.set(id, method);
      return {
        id,
        message: params === undefined ? { jsonrpc: '2.0', id, method } : { jsonrpc: '2.0', id, method, params },
      };
    },
    settle(id) {
      return typeof id === 'number' ? pending.delete(id) : false;
    },
    pending() {
      return [...pending].map(([id, method]) => ({ id, method }));
    },
  };
}

const originRule = /^(?:https?|wss?):\/\/(?:\*\.)?[A-Za-z0-9.-]+(?::\d{1,5})?$/;
function origins(list: readonly string[] | undefined): string[] {
  return (list ?? []).filter((item) => typeof item === 'string' && originRule.test(item)).slice(0, 32);
}
/**
 * The Content Security Policy the host enforces for a view, from the resource's declared
 * domains. Omitted lists fall back to the restrictive default; nothing undeclared is allowed.
 */
export function buildAppCsp(csp: AppResourceCsp | undefined): string {
  const connect = origins(csp?.connectDomains);
  const resources = origins(csp?.resourceDomains);
  const frames = origins(csp?.frameDomains);
  const bases = origins(csp?.baseUriDomains);
  const withSelf = (extra: string[], ...base: string[]) => [...base, ...extra].join(' ');
  return [
    "default-src 'none'",
    `script-src ${withSelf(resources, "'self'", "'unsafe-inline'")}`,
    `style-src ${withSelf(resources, "'self'", "'unsafe-inline'")}`,
    `img-src ${withSelf(resources, "'self'", 'data:')}`,
    `media-src ${withSelf(resources, "'self'", 'data:')}`,
    `font-src ${withSelf(resources, "'self'")}`,
    `connect-src ${connect.length ? connect.join(' ') : "'none'"}`,
    `frame-src ${frames.length ? frames.join(' ') : "'none'"}`,
    `base-uri ${bases.length ? bases.join(' ') : "'self'"}`,
    "object-src 'none'",
    "form-action 'none'",
  ].join('; ');
}
/** Inserts the policy as the first element of the document head so it applies before any script. */
export function injectAppCsp(html: string, csp: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}">`;
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + meta + html.slice(head.index + head[0].length);
  const open = /<html\b[^>]*>/i.exec(html);
  if (open) return html.slice(0, open.index + open[0].length) + `<head>${meta}</head>` + html.slice(open.index + open[0].length);
  return `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
}
/** The iframe `allow` attribute for the permissions the host actually granted. */
export function appPermissionPolicy(granted: AppPermissions | undefined): string {
  const names: string[] = [];
  if (granted?.camera) names.push('camera');
  if (granted?.microphone) names.push('microphone');
  if (granted?.geolocation) names.push('geolocation');
  if (granted?.clipboardWrite) names.push('clipboard-write');
  return names.map((name) => `${name} 'self'`).join('; ');
}
/** Whether a resource is a renderable MCP App: a ui:// URI and the HTML app profile. */
export function isAppResource(resource: { uri?: unknown; mimeType?: unknown }): boolean {
  return (
    typeof resource.uri === 'string' &&
    resource.uri.startsWith('ui://') &&
    typeof resource.mimeType === 'string' &&
    /^text\/html;\s*profile=mcp-app$/i.test(resource.mimeType.trim())
  );
}
