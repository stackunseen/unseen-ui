'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
  appMethods,
  appPermissionPolicy,
  buildAppCsp,
  createAppBridge,
  injectAppCsp,
  isAppResource,
  jsonRpcErrors,
} from '@stackunseen/ui-core';
import type {
  AppBridgeEvent,
  AppHostCapabilities,
  AppHostContext,
  AppPermissions,
  AppResourceMeta,
  JsonRpcId,
} from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import m from './mcp-app-frame.module.css';

export interface MCPAppResource extends AppResourceMeta {
  uri: string;
  mimeType: string;
  /** The HTML the host fetched through resources/read. */
  html: string;
  name?: string;
}
export interface MCPAppRequest {
  id: JsonRpcId;
  method: string;
  params: unknown;
}
export interface MCPAppReply {
  result(value: unknown): void;
  error(code: number, message: string): void;
}
export type MCPAppFrameState = 'loading' | 'ready' | 'blocked' | 'failed' | 'closed';
export interface MCPAppFrameProps
  extends VariantProps<'MCPAppFrame'>, Omit<ComponentProps<'section'>, 'resource'> {
  server: { id: string; name: string };
  /** The fetched resource, or null while the host is still fetching it. */
  resource: MCPAppResource | null;
  state: MCPAppFrameState;
  /** Why the view is blocked or failed, from the host. */
  reason?: string;
  /** Tool arguments, sent once as ui/notifications/tool-input after the view says it is initialized. */
  toolInput?: Record<string, unknown>;
  /** The tool's CallToolResult, sent as ui/notifications/tool-result when it arrives. */
  toolResult?: unknown;
  hostInfo?: { name: string; version: string };
  /** What the host will honour. Requests outside these capabilities are refused before onRequest. */
  hostCapabilities?: AppHostCapabilities;
  hostContext?: Omit<AppHostContext, 'containerDimensions'>;
  /** Permissions the host grants to the iframe; nothing is granted by default. */
  grantedPermissions?: AppPermissions;
  /** Let the view submit forms inside the sandbox. Off by default. */
  allowForms?: boolean;
  /** Tallest the frame may grow when the view reports its size. Defaults to 600. */
  maxHeight?: number;
  /** Every request from the view that passes the capability check. The host answers through `reply`. */
  onRequest?: (request: MCPAppRequest, reply: MCPAppReply) => void;
  onNotification?: (method: string, params: unknown) => void;
  onClose?: () => void;
  fallback?: ReactNode;
  label?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const requestCapability: Record<string, (caps: AppHostCapabilities) => boolean> = {
  [appMethods.openLink]: (caps) => !!caps.openLinks,
  [appMethods.downloadFile]: (caps) => !!caps.downloadFile,
  [appMethods.message]: (caps) => !!caps.message,
  [appMethods.updateModelContext]: (caps) => !!caps.updateModelContext,
  [appMethods.toolsCall]: (caps) => !!caps.serverTools,
  [appMethods.toolsList]: (caps) => !!caps.serverTools,
  [appMethods.resourcesRead]: (caps) => !!caps.serverResources,
  [appMethods.sampling]: () => false,
  [appMethods.requestDisplayMode]: () => true,
  [appMethods.ping]: () => true,
};

/**
 * A sandboxed frame for an MCP App view. The host fetches the resource and decides policy; this
 * component renders it with the declared Content Security Policy, bridges JSON-RPC over
 * postMessage, refuses requests the host has not declared it can honour, and keeps the view's
 * size inside the host's limit.
 */
export function MCPAppFrame({
  variant = 'card',
  server,
  resource,
  state,
  reason,
  toolInput,
  toolResult,
  hostInfo = { name: 'unseen-ui-host', version: '0' },
  hostCapabilities = {},
  hostContext,
  grantedPermissions,
  allowForms = false,
  maxHeight = 600,
  onRequest,
  onNotification,
  onClose,
  fallback,
  label,
  className = '',
  ...rest
}: MCPAppFrameProps) {
  const id = useId();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(Math.min(240, maxHeight));
  const [phase, setPhase] = useState<'waiting' | 'initialized'>('waiting');
  const sentInput = useRef(false);
  const latest = useRef({ onRequest, onNotification, hostCapabilities, toolInput });
  latest.current = { onRequest, onNotification, hostCapabilities, toolInput };

  const renderable = !!resource && isAppResource(resource) && state === 'ready';
  const bridge = useMemo(
    () =>
      createAppBridge({
        hostInfo,
        hostCapabilities,
        hostContext: { ...hostContext, containerDimensions: { maxHeight } },
      }),
    // A new bridge per resource; the host's declared context is read when the view initializes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource?.uri, resource?.html, maxHeight],
  );
  const srcDoc = useMemo(
    () => (renderable ? injectAppCsp(resource.html, buildAppCsp(resource.csp)) : undefined),
    [renderable, resource],
  );
  const allow = appPermissionPolicy(grantedPermissions);

  function post(message: Record<string, unknown>) {
    frame.current?.contentWindow?.postMessage(message, '*');
  }

  useEffect(() => {
    if (!renderable) return;
    setPhase('waiting');
    sentInput.current = false;
    function onMessage(event: MessageEvent) {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const result: AppBridgeEvent = bridge.receive(event.data);
      switch (result.kind) {
        case 'initialize':
          post(bridge.initializeResult(result.id));
          return;
        case 'initialized':
          setPhase('initialized');
          if (latest.current.toolInput && !sentInput.current) {
            sentInput.current = true;
            post(bridge.notify(appMethods.toolInput, { arguments: latest.current.toolInput }));
          }
          return;
        case 'size-changed':
          if (result.height !== undefined)
            setHeight(Math.min(maxHeight, Math.max(48, result.height)));
          return;
        case 'request': {
          const allowed = requestCapability[result.method];
          if (!allowed) {
            post(
              bridge.error(
                result.id,
                jsonRpcErrors.methodNotFound,
                `Method "${result.method}" is not supported by this host`,
              ),
            );
            return;
          }
          if (!allowed(latest.current.hostCapabilities) || !latest.current.onRequest) {
            post(
              bridge.error(
                result.id,
                jsonRpcErrors.denied,
                `The app doesn’t support ${result.method}`,
              ),
            );
            return;
          }
          if (result.method === appMethods.ping) {
            post(bridge.reply(result.id, {}));
            return;
          }
          let settled = false;
          latest.current.onRequest(
            { id: result.id, method: result.method, params: result.params },
            {
              result: (value) => {
                if (settled) return;
                settled = true;
                post(bridge.reply(result.id, value));
              },
              error: (code, message) => {
                if (settled) return;
                settled = true;
                post(bridge.error(result.id, code, message));
              },
            },
          );
          return;
        }
        case 'notification':
          latest.current.onNotification?.(result.method, result.params);
          return;
        case 'response':
          bridge.settle(result.id);
          return;
        default:
          return;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [renderable, bridge, maxHeight]);

  useEffect(() => {
    if (phase === 'initialized' && toolResult !== undefined)
      post(bridge.notify(appMethods.toolResult, toolResult));
  }, [phase, toolResult, bridge]);
  useEffect(() => {
    if (phase === 'initialized' && toolInput && !sentInput.current) {
      sentInput.current = true;
      post(bridge.notify(appMethods.toolInput, { arguments: toolInput }));
    }
  }, [phase, toolInput, bridge]);

  const title = label ?? resource?.name ?? resource?.uri ?? 'Tool view';
  const notice =
    state === 'blocked'
      ? reason || 'The app blocked this view.'
      : state === 'failed'
        ? reason || 'The view could not be loaded.'
        : state === 'closed'
          ? 'The view was closed.'
          : resource && !isAppResource(resource)
            ? 'This resource is not an MCP App (expected a ui:// URI with the text/html;profile=mcp-app type).'
            : undefined;
  return (
    <section
      {...rest}
      className={`${m.frame} ${className}`}
      data-part="mcp-app-frame"
      data-variant={variant}
      data-state={notice ? (state === 'ready' ? 'blocked' : state) : state}
      data-border={resource?.prefersBorder === false ? 'none' : undefined}
      aria-labelledby={`${id}-title`}
    >
      <header className={m.head}>
        <span className={m.icon} aria-hidden="true">
          <AIIcon name="tool" size={15} />
        </span>
        <div className={m.titles}>
          <h3 id={`${id}-title`} className={m.title}>
            {title}
          </h3>
          <p className={m.meta}>
            From {server.name}. This view can see what you do inside it and may send messages to
            this app.
          </p>
        </div>
        <StatusBadge
          state={
            state === 'ready' && !notice
              ? phase === 'initialized'
                ? 'succeeded'
                : 'running'
              : state === 'loading'
                ? 'queued'
                : 'blocked'
          }
          label={
            state === 'ready' && !notice
              ? phase === 'initialized'
                ? 'Connected'
                : 'Starting'
              : state === 'loading'
                ? 'Fetching'
                : state === 'closed'
                  ? 'Closed'
                  : 'Not shown'
          }
        />
        {onClose && (
          <Button size="sm" variant="ghost" aria-label={`Close ${title}`} onClick={onClose}>
            Close
          </Button>
        )}
      </header>
      {renderable && !notice ? (
        <iframe
          ref={frame}
          className={m.view}
          title={title}
          sandbox={allowForms ? 'allow-scripts allow-forms' : 'allow-scripts'}
          allow={allow || undefined}
          referrerPolicy="no-referrer"
          srcDoc={srcDoc}
          style={{ height }}
        />
      ) : (
        <div className={m.fallback} role="status">
          {state === 'loading' && !notice ? (
            <p>Fetching the view from {server.name}…</p>
          ) : (
            <>
              <p>{notice}</p>
              {fallback}
            </>
          )}
        </div>
      )}
    </section>
  );
}
