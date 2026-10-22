import { catalog } from '../../lib/catalog';
import { componentHref } from '../../lib/site-paths';
import { navigationGroup } from '../../lib/gallery-navigation';
import { isReleaseComponent } from '../../lib/first-release';
import { siteOrigin } from '../../lib/site-seo';

export const dynamic = 'force-static';

/** A short index for coding agents: what the library is, how to start, and one line per component. */
export function GET() {
  const origin = siteOrigin ?? '';
  const groups = new Map<string, string[]>();
  for (const entry of catalog.filter(isReleaseComponent)) {
    const group = navigationGroup(entry);
    const line = `- [${entry.name}](${origin}${componentHref(entry.name)}): ${entry.description}`;
    groups.set(group, [...(groups.get(group) ?? []), line]);
  }
  const body = [
    '# Unseen UI',
    '',
    '> Controlled React 19 components for AI interfaces and the applications around them: chat, streaming replies, tool calls, approvals with host receipts, runs, sources, generated UI, MCP and trust signals. Published as @stackunseen/ui and @stackunseen/ui-core. No Tailwind required; styles are opt-in CSS files.',
    '',
    'Rules the components follow: the host executes and authorises every action; a clicked button is a request until the host answers; unknown outcomes stay unknown; model output is rendered as inert data, never executed.',
    '',
    '## Start',
    '',
    `- [Getting started](${origin}/getting-started/): install, the first component, optional entries.`,
    `- [Chat](${origin}/components/chat/): \`import { Chat, useLocalHost, useAiSdkChat } from '@stackunseen/ui/chat'\`; \`<Chat {...useAiSdkChat(useChat())} />\` connects the Vercel AI SDK, including tool approvals.`,
    `- [Full text for agents](${origin}/llms-full.txt): every component with its contract, responsibility and example.`,
    `- [Design tokens](${origin}/docs/tokens/): every \`--ai-*\` CSS variable, what it is for and its light and dark value. Style custom UI with these, not raw colours.`,
    '- Machine-readable API: `@stackunseen/ui/manifest.json` in the package lists every export, the props of each component, naming rules and the CSS variables.',
    `- [shadcn registry](${origin}/r/registry.json): \`npx shadcn@latest add ${origin}/r/chat.json\` (also chat-ai-sdk and theme) installs @stackunseen/ui and writes a starter file.`,
    '',
    ...[...groups.entries()].flatMap(([group, lines]) => [`## ${group}`, '', ...lines, '']),
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
