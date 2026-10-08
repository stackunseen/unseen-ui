import Link from 'next/link';
import { DocsFrame } from '../../components/docs-frame';
import { ComponentDirectory } from '../../components/component-directory';
import { catalog } from '../../lib/catalog';
import { featuredApp, releaseCatalog } from '../../lib/first-release';
import {
  componentSection,
  componentSearchText,
  navigationGroup,
} from '../../lib/gallery-navigation';
import { componentHref } from '../../lib/site-paths';
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
  }));
  return (
    <DocsFrame
      label="Library"
      mainClassName="directory-page"
      links={[
        ['All components', '/components/'],
        ['UI components', '/components/#ui'],
        ['AI components', '/components/#ai'],
        ['Customize', '/customize/'],
        ['Getting started', '/getting-started/'],
      ]}
    >
      <header className="web-page-heading">
        <p className="web-eyebrow">The library</p>
        <h1>Components</h1>
        <p>
          Browse UI controls and AI components. Each component has a live example and usage guide
          with local sample data.
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
