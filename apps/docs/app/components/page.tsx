import Link from 'next/link';
import { DocsFrame } from '../../components/docs-frame';
import { ComponentDirectory } from '../../components/component-directory';
import { groupAnchor } from '../../lib/directory-location';
import { catalog } from '../../lib/catalog';
import { featuredApp, releaseCatalog } from '../../lib/first-release';
import {
  componentSection,
  componentSearchText,
  navigationGroup,
} from '../../lib/gallery-navigation';
import { componentHref } from '../../lib/site-paths';
import { componentPreview } from '../../lib/component-previews';
import { releaseSections, sectionGroups, sectionLabels } from '../../lib/component-collections';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'React component catalog',
  `Browse ${releaseCatalog.length} experimental React components for application UI and AI workflows. Search live examples, presentation styles, usage and props.`,
  '/components/',
);
export default function Page() {
  const entries = catalog.map((entry) => ({
    name: entry.name,
    description: entry.description,
    href: componentHref(entry.name),
    section: componentSection(entry),
    group: navigationGroup(entry),
    terms: componentSearchText(entry),
    // Thumbnails come from apps/docs/scripts/capture-component-previews.mjs; absent ones fall back to the name.
    preview: componentPreview(entry.name),
  }));
  const rail = (
    <nav className="directory-rail" aria-label="Component categories">
      {releaseSections.map((section) => (
        <div key={section}>
          <a className="directory-rail-section" href={`#${section}`}>
            {sectionLabels[section]}
            <span>{entries.filter((entry) => entry.section === section).length}</span>
          </a>
          <ul>
            {sectionGroups(section)
              .map(
                (group) =>
                  [
                    group,
                    entries.filter((entry) => entry.section === section && entry.group === group)
                      .length,
                  ] as const,
              )
              .filter(([, count]) => count > 0)
              .map(([group, count]) => (
                <li key={group}>
                  <a href={`#${groupAnchor(section, group)}`}>
                    {group}
                    <span>{count}</span>
                  </a>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <DocsFrame
      label="Library"
      mainClassName="directory-page"
      links={[
        ['All components', '/components/'],
        ['Patterns', '/patterns/'],
        ['Customize', '/customize/'],
        ['Getting started', '/getting-started/'],
      ]}
      rail={rail}
    >
      <header className="web-page-heading">
        <p className="web-eyebrow">{releaseCatalog.length} components</p>
        <h1>Components</h1>
        <p>
          Every tile is the component itself. Open one for the live example, its states, the props
          and the code to use it.
        </p>
      </header>
      <ComponentDirectory entries={entries} />
      <p className="collection-note">
        See the components together in the <Link href={featuredApp.href}>SaaS admin example</Link>,
        or <Link href="/getting-started/">start with your first component</Link>.
      </p>
    </DocsFrame>
  );
}
