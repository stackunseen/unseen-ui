import { describe, expect, it } from 'vitest';
import { handleMcp } from '../mcp/server';
import type { SiteSearchItem } from '../lib/search-index';

const index: SiteSearchItem[] = [
  {
    id: 'component-ApprovalCard',
    label: 'ApprovalCard',
    href: '/components/approval-card/',
    group: 'AI components',
    hint: 'Review & permissions',
    description: 'A version-bound approval.',
    terms: 'ApprovalCard approval permission review card',
  },
  {
    id: 'component-Button',
    label: 'Button',
    href: '/components/button/',
    group: 'UI components',
    hint: 'Actions',
    description: 'A button.',
    terms: 'Button action click',
  },
  {
    id: 'recipe-agent-operations',
    label: 'Agent operations',
    href: '/patterns/agent-operations/',
    group: 'Patterns',
    hint: 'Recipe',
    terms: 'agent operations runs lanes',
  },
];
const files: Record<string, string> = {
  '/search-index.json': JSON.stringify(index),
  '/llms.txt': '# Unseen UI\nOverview.',
  '/llms/approval-card.md': '# ApprovalCard\n\nProps…',
};
const fetchAsset = async (path: string) =>
  path in files
    ? new Response(files[path], { status: 200 })
    : new Response('missing', { status: 404 });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  handleMcp(
    new Request('https://unseenui.com/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    { fetchAsset },
  );
const rpc = (method: string, params?: unknown, id: number | string = 1) => ({
  jsonrpc: '2.0',
  id,
  method,
  params,
});

describe('docs MCP server', () => {
  it('initializes with tools only and echoes the client protocol version', async () => {
    const response = await post(rpc('initialize', { protocolVersion: '2025-06-18' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.protocolVersion).toBe('2025-06-18');
    expect(body.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(body.result.serverInfo.name).toBe('unseen-ui-docs');
  });
  it('accepts notifications without a body and answers ping', async () => {
    const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(note.status).toBe(202);
    const pong = await post(rpc('ping'));
    expect((await pong.json()).result).toEqual({});
  });
  it('lists four tools with schemas', async () => {
    const body = await (await post(rpc('tools/list'))).json();
    expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'search',
      'list_components',
      'read_component',
      'read_overview',
    ]);
    expect(body.result.tools[0].inputSchema.required).toEqual(['query']);
  });
  it('searches the published index and reads component pages by name or slug', async () => {
    const search = await (
      await post(rpc('tools/call', { name: 'search', arguments: { query: 'approval' } }))
    ).json();
    expect(search.result.content[0].text).toContain('ApprovalCard');
    expect(search.result.content[0].text).not.toContain('Button (');
    for (const name of ['ApprovalCard', 'approval-card', 'approval-card.md']) {
      const page = await (
        await post(rpc('tools/call', { name: 'read_component', arguments: { name } }))
      ).json();
      expect(page.result.content[0].text).toContain('# ApprovalCard');
    }
    const missing = await (
      await post(rpc('tools/call', { name: 'read_component', arguments: { name: 'Nope' } }))
    ).json();
    expect(missing.result.isError).toBe(true);
    const overview = await (
      await post(rpc('tools/call', { name: 'read_overview', arguments: {} }))
    ).json();
    expect(overview.result.content[0].text).toContain('# Unseen UI');
  });
  it('answers batches, rejects unknown methods and bad JSON, and refuses foreign origins', async () => {
    const batch = await (
      await post([rpc('ping', undefined, 'a'), rpc('nope', undefined, 'b')])
    ).json();
    expect(batch).toHaveLength(2);
    expect(batch[1].error.code).toBe(-32601);
    const bad = await handleMcp(
      new Request('https://unseenui.com/api/mcp', { method: 'POST', body: '{' }),
      { fetchAsset },
    );
    expect(bad.status).toBe(400);
    const foreign = await post(rpc('ping'), { origin: 'https://evil.example' });
    expect(foreign.status).toBe(403);
    const local = await post(rpc('ping'), { origin: 'http://localhost:4175' });
    expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:4175');
    const get = await handleMcp(new Request('https://unseenui.com/api/mcp'), { fetchAsset });
    expect((await get.json()).tools).toContain('search');
  });
});
