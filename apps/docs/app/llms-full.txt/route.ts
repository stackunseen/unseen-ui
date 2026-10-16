import { catalog } from '../../lib/catalog';
import { componentHref } from '../../lib/site-paths';
import { navigationGroup } from '../../lib/gallery-navigation';
import { isReleaseComponent } from '../../lib/first-release';
import { siteOrigin } from '../../lib/site-seo';
import { componentImport } from '../../lib/component-import';

export const dynamic = 'force-static';

/** Every released component with its import, contract, responsibilities, keyboard notes and example. */
export function GET() {
  const origin = siteOrigin ?? '';
  const sections = catalog.filter(isReleaseComponent).map((entry) => {
    const imported = componentImport(entry);
    return [
      `## ${entry.name}`,
      '',
      `${entry.description}`,
      '',
      `- Group: ${navigationGroup(entry)}`,
      `- Import: \`${imported.line}\`${imported.stylesheet ? ` and \`import '${imported.stylesheet}';\`` : ''}`,
      `- Page: ${origin}${componentHref(entry.name)}`,
      `- Inputs: ${entry.contract}`,
      entry.responsibility ? `- Host responsibility: ${entry.responsibility}` : '',
      entry.keyboard ? `- Keyboard: ${entry.keyboard}` : '',
      entry.states?.length ? `- Documented states: ${entry.states.join(', ')}` : '',
      '',
      '```tsx',
      entry.code,
      '```',
      '',
    ]
      .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
      .join('\n');
  });
  const body = [
    '# Unseen UI — full component reference',
    '',
    'Install: `npm install @stackunseen/ui`. Import `@stackunseen/ui/styles.css` once; optional entries name their own stylesheet (for example `@stackunseen/ui/chat.css`). React 19.3 is a peer.',
    '',
    ...sections,
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
