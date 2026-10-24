import type { CatalogEntry } from './catalog';
import { catalog } from './catalog';
import { behaviourNotes } from './behaviour-notes';
import { componentAnatomy } from './component-anatomy';
import { componentGuidance } from './component-guidance';
import { isReleaseComponent } from './first-release';
import { navigationGroup } from './gallery-navigation';
import { registryCommand, registryItemsFor } from './registry-items';
import { componentHref } from './site-paths';
import { tasksFor } from './tasks';
import { guidanceFor } from './usage-guidance';

export interface ManifestProp {
  name: string;
  required?: boolean;
  type: string;
  description?: string;
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/**
 * A component page as Markdown, for coding agents and for pasting into a chat. The page's "Copy
 * page" button and the `/llms/<component>.md` file both come from here, so they never disagree.
 * `allProps` adds the full prop table from the package manifest when it is at hand.
 */
export function componentMarkdown({
  entry,
  installLine,
  usage,
  origin,
  allProps,
}: {
  entry: CatalogEntry;
  installLine: string;
  usage: string;
  /** Prefixes page links; empty keeps them relative. */
  origin: string;
  allProps?: readonly ManifestProp[];
}) {
  const notes = behaviourNotes[entry.name];
  const when = guidanceFor(entry.name);
  const anatomy = componentAnatomy[entry.name];
  const guidance = componentGuidance(entry.name);
  const starters = registryItemsFor[entry.name] ?? [];
  const link = (name: string) => `[${name}](${origin}${componentHref(name)})`;
  const related = [
    ...new Set([
      ...tasksFor(entry.name).flatMap((task) => task.components),
      ...catalog
        .filter(
          (item) => isReleaseComponent(item) && navigationGroup(item) === navigationGroup(entry),
        )
        .map((item) => item.name),
    ]),
  ]
    .filter((name) => name !== entry.name)
    .slice(0, 12);
  return [
    `# ${entry.name}`,
    '',
    entry.description,
    '',
    ...(when
      ? [
          `- **Use it for**: ${when.use}`,
          `- **Not for**: ${when.avoid}${when.instead.length ? ` Try ${when.instead.map(link).join(', ')}.` : ''}`,
          '',
        ]
      : []),
    ...(notes ? ['## Good to know', '', ...notes.map((note) => `- ${note}`), ''] : []),
    '## Installation',
    '',
    '```bash',
    installLine,
    ...starters.map((item) => registryCommand(item)),
    '```',
    '',
    ...(anatomy
      ? [
          '## Anatomy',
          '',
          anatomy.intro,
          '',
          ...anatomy.parts.map(
            (part, index) =>
              `${index + 1}. **${part.name}**: ${part.description}${part.builtFrom.length ? ` Built from ${part.builtFrom.join(', ')}.` : ''} Props: ${part.props.map((prop) => `\`${prop}\``).join(', ')}.`,
          ),
          '',
          ...anatomy.connection.map(
            (way) =>
              `- **${way.label}** (${way.props.map((prop) => `\`${prop}\``).join(', ')}): ${way.description}`,
          ),
          '',
        ]
      : []),
    '## Usage',
    '',
    '```tsx',
    usage,
    '```',
    '',
    ...(guidance
      ? [
          '## Props',
          '',
          ...guidance.props.map(
            (prop) => `- \`${prop.name}\` (\`${prop.type}\`): ${prop.description}`,
          ),
          '',
        ]
      : []),
    ...(allProps?.length
      ? [
          '## All props',
          '',
          '| Prop | Type | Description |',
          '| --- | --- | --- |',
          ...allProps.map(
            (prop) =>
              `| \`${prop.name}\`${prop.required ? ' (required)' : ''} | \`${cell(prop.type)}\` | ${cell(prop.description ?? '')} |`,
          ),
          '',
        ]
      : []),
    `## Keyboard`,
    '',
    entry.keyboard ??
      guidance?.keyboard ??
      'Tab reaches controls; Enter or Space activates buttons. Accordions use arrow keys, Home and End. Select menus support arrows and typeahead; Escape closes menus and dialogs and restores focus.',
    '',
    ...(related.length ? ['## Works with', '', related.map(link).join(', '), ''] : []),
    `Page: ${origin || 'https://unseenui.com'}${componentHref(entry.name)}`,
    '',
  ].join('\n');
}
