import { matchesQuery, searchScore } from '../lib/search';
import type { SiteSearchItem } from '../lib/search-index';

/**
 * The docs as an MCP server (Streamable HTTP, JSON responses, stateless). It serves the same
 * files the site already publishes for coding agents: the search index, llms.txt and the
 * Markdown page per component. It runs as a Cloudflare Pages Function at /api/mcp and reads
 * those files from the deployed site itself, so it can never disagree with the pages.
 */
export interface McpOptions {
  /** Reads a published site file by absolute path, for example "/llms.txt". */
  fetchAsset: (path: string) => Promise<Response>;
  /** Origins allowed to call the endpoint from a browser; server-side clients send none. */
  allowedOrigins?: readonly string[];
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export const protocolVersion = '2025-03-26';
export const serverInfo = { name: 'unseen-ui-docs', version: '1.0.0' };

export const tools = [
  {
    name: 'search',
    description:
      'Search Unseen UI components, patterns, templates, tasks and guides by meaning. Returns names, URLs and one-line descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What you are looking for, such as "approval card" or "agent runs".',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Maximum results; 10 by default.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_components',
    description: 'Every component in the library with its collection, group and description.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_component',
    description:
      'The documentation page for one component as Markdown: install line, usage example, every prop, keyboard behaviour and related components.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'The component name, such as "ApprovalCard", or its page slug, such as "approval-card".',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'read_overview',
    description:
      'The site overview for agents (llms.txt): what the library is, how to install it, and the index of pages. Pass full=true for llms-full.txt, which is long.',
    inputSchema: {
      type: 'object',
      properties: {
        full: { type: 'boolean', description: 'Return llms-full.txt instead of llms.txt.' },
      },
    },
  },
] as const;

const slugOf = (name: string) =>
  name
    .trim()
    .replace(/\.md$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const text = (value: string) => ({ content: [{ type: 'text', text: value }] });
const toolError = (message: string) => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

async function readIndex(options: McpOptions): Promise<SiteSearchItem[]> {
  const response = await options.fetchAsset('/search-index.json');
  if (!response.ok) throw new Error(`search index unavailable (${response.status})`);
  return (await response.json()) as SiteSearchItem[];
}

const describe = (item: SiteSearchItem) =>
  `- ${item.label} (${item.group}${item.hint ? `, ${item.hint}` : ''}) ${item.href}${item.description ? `\n  ${item.description}` : ''}`;

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  options: McpOptions,
): Promise<unknown> {
  switch (name) {
    case 'search': {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) return toolError('query is required.');
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 10));
      const items = (await readIndex(options))
        .filter((item) => matchesQuery(item.terms, query))
        .map((item) => ({ item, score: searchScore(item.label, item.terms, query) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ item }) => item);
      if (!items.length)
        return text(
          `No matches for "${query}". Try a job, such as "approvals", or a component name.`,
        );
      return text(
        `${items.length} result${items.length === 1 ? '' : 's'} for "${query}":\n${items.map(describe).join('\n')}\n\nRead a component with read_component, or open the URL on https://unseenui.com.`,
      );
    }
    case 'list_components': {
      const items = (await readIndex(options)).filter((item) => item.id.startsWith('component-'));
      return text(
        `${items.length} components:\n${items.map((item) => `- ${item.label} (${item.group}, ${item.hint ?? ''}): ${item.description ?? ''}`).join('\n')}`,
      );
    }
    case 'read_component': {
      const name = typeof args.name === 'string' ? args.name : '';
      const slug = slugOf(name);
      if (!slug) return toolError('name is required.');
      const response = await options.fetchAsset(`/llms/${slug}.md`);
      if (!response.ok)
        return toolError(
          `No component page for "${name}". Use list_components or search to find the name.`,
        );
      return text(await response.text());
    }
    case 'read_overview': {
      const response = await options.fetchAsset(
        args.full === true ? '/llms-full.txt' : '/llms.txt',
      );
      if (!response.ok) return toolError(`Overview unavailable (${response.status}).`);
      return text(await response.text());
    }
    default:
      return toolError(`Unknown tool "${name}".`);
  }
}

async function handleOne(
  message: JsonRpcRequest,
  options: McpOptions,
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null;
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string')
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid request' } };
  // Notifications carry no id and get no response.
  if (message.method.startsWith('notifications/')) return null;
  const params = message.params ?? {};
  try {
    switch (message.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion:
              typeof params.protocolVersion === 'string' ? params.protocolVersion : protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo,
            instructions:
              'Unseen UI is a free React component library for AI agent interfaces. Use search to find a component, read_component for its full documentation and props, and read_overview for install steps.',
          },
        };
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools } };
      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : '';
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        return { jsonrpc: '2.0', id, result: await callTool(name, args, options) };
      }
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${message.method}` },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' },
    };
  }
}

const defaultOrigins = ['https://unseenui.com', 'https://www.unseenui.com'];

function corsHeaders(origin: string | null, allowed: readonly string[]) {
  const headers: Record<string, string> = {
    'MCP-Protocol-Version': protocolVersion,
    'Cache-Control': 'no-store',
  };
  if (
    origin &&
    (allowed.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
  ) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] =
      'content-type, accept, mcp-protocol-version, mcp-session-id';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers.Vary = 'Origin';
  }
  return headers;
}

/** The HTTP face of the server: one JSON-RPC request or batch per POST, no sessions, no SSE. */
export async function handleMcp(request: Request, options: McpOptions): Promise<Response> {
  const origin = request.headers.get('origin');
  const allowed = options.allowedOrigins ?? defaultOrigins;
  const headers = corsHeaders(origin, allowed);
  if (origin && !headers['Access-Control-Allow-Origin'])
    return new Response('Forbidden origin', { status: 403, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method === 'GET')
    return new Response(
      JSON.stringify({
        name: serverInfo.name,
        transport: 'streamable-http',
        protocolVersion,
        usage: 'POST JSON-RPC 2.0 messages to this URL. Server-sent events are not offered.',
        tools: tools.map((tool) => tool.name),
      }),
      { status: 200, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } },
    );
  if (request.method !== 'POST')
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...headers, Allow: 'POST, OPTIONS, GET' },
    });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }),
      { status: 400, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } },
    );
  }
  const messages = Array.isArray(body) ? (body as JsonRpcRequest[]) : [body as JsonRpcRequest];
  const responses = (
    await Promise.all(messages.map((message) => handleOne(message, options)))
  ).filter((response): response is JsonRpcResponse => response !== null);
  if (!responses.length) return new Response(null, { status: 202, headers });
  return new Response(JSON.stringify(Array.isArray(body) ? responses : responses[0]), {
    status: 200,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
  });
}
