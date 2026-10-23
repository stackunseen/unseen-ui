import manifest from '@stackunseen/ui/manifest.json';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'Design tokens',
  'Every --ai-* CSS variable Unseen UI reads: what it is for, its light and dark value, and which ones the theme sets.',
  '/docs/tokens/',
);

interface Variable {
  name: string;
  group: string;
  purpose: string;
  light?: string;
  dark?: string;
  default?: string;
  setBy?: string;
}

const groups: [key: string, title: string, lead: string][] = [
  [
    'colour',
    'Color',
    'Set by the theme from three brand seeds; contrast is checked for both modes.',
  ],
  ['shape', 'Shape', 'Corners and border width, set by the theme.'],
  ['spacing', 'Spacing', 'Gaps and padding; compact density tightens them.'],
  ['elevation', 'Elevation', 'Shadows under floating surfaces.'],
  ['type', 'Type', 'Typeface and sizes. Unset, components inherit the page font.'],
  ['motion', 'Motion', 'Transition timing. Reduced motion in the theme turns transitions off.'],
  ['component', 'Component settings', 'Set these on a wrapper to adjust one component.'],
];

function Swatch({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span className="token-swatch">
      <span aria-hidden="true" style={{ background: value }} />
      <code>{value}</code>
    </span>
  );
}

/** Generated from the package manifest, so the table always matches the published styles. */
export default function TokensPage() {
  const variables = (manifest as { cssVariables: Variable[] }).cssVariables;
  return (
    <>
      <h1>Design tokens</h1>
      <p>
        Components read these CSS variables. Use them in your own styles so custom UI matches:{' '}
        <code>color: var(--ai-muted)</code>, not a color of your own. Theme variables are set by{' '}
        <code>AITheme</code> or <code>themeToCSS</code>; set the rest on a wrapper element.
      </p>
      <p>
        The same list, with every component&apos;s props, ships in the package as{' '}
        <code>@stackunseen/ui/manifest.json</code> for tools and coding agents.
      </p>
      {groups.map(([key, title, lead]) => {
        const rows = variables.filter((variable) => variable.group === key);
        if (!rows.length) return null;
        const colours = key === 'colour';
        // The tag matters only where a section mixes theme-set and other variables.
        const mixed = new Set(rows.map((variable) => variable.setBy === 'theme')).size > 1;
        return (
          <section key={key} aria-labelledby={`tokens-${key}`}>
            <h2 id={`tokens-${key}`}>{title}</h2>
            <p>{lead}</p>
            {/* Wide on small screens: focusable so the keyboard can scroll it too. */}
            <table className="token-table" tabIndex={0} aria-labelledby={`tokens-${key}`}>
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col">For</th>
                  {colours ? (
                    <>
                      <th scope="col">Light</th>
                      <th scope="col">Dark</th>
                    </>
                  ) : (
                    <th scope="col">Default</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((variable) => (
                  <tr key={variable.name}>
                    <th scope="row">
                      <code>{variable.name}</code>
                      {mixed && variable.setBy === 'theme' && (
                        <span className="token-set-by">theme</span>
                      )}
                    </th>
                    <td>{variable.purpose}</td>
                    {colours ? (
                      <>
                        <td>{variable.light ? <Swatch value={variable.light} /> : '—'}</td>
                        <td>{variable.dark ? <Swatch value={variable.dark} /> : '—'}</td>
                      </>
                    ) : (
                      <td>{variable.default ? <code>{variable.default}</code> : '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}
