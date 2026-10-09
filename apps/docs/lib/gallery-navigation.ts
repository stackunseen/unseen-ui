import { aliases, catalogGroup, filterCatalog } from './catalog';
import type { CatalogEntry } from './catalog';
import type { GalleryView } from './gallery-location';
import { isReleaseComponent } from './first-release';

import { aiGroups, applicationGroups, sectionLabels } from './component-collections';
import type { ComponentSection, GallerySection } from './component-collections';
export {
  componentSections,
  sectionLabels,
  collectionDescriptions,
  uiGroups,
  aiGroups,
  applicationGroups,
  marketingGroups,
  sectionGroups,
} from './component-collections';
export type { ComponentSection, GallerySection } from './component-collections';
const aiDomains: Record<string, (typeof aiGroups)[number]> = {
  Conversation: 'Conversation',
  Voice: 'Voice',
  Tools: 'Tools & execution',
  Execution: 'Tools & execution',
  Workflow: 'Tools & execution',
  'Human review': 'Review & permissions',
  Context: 'Context & memory',
  'Sources & evidence': 'Sources & evidence',
  MCP: 'MCP connections & tools',
  Agents: 'Agents & governance',
  'Enterprise AI': 'Agents & governance',
  'State & status': 'Tools & execution',
  'Model controls': 'Model settings',
  'AI forms': 'Forms & generated UI',
  'Generative UI': 'Forms & generated UI',
  'Coding workspace': 'Coding & artifacts',
  Artifacts: 'Coding & artifacts',
};
const applicationPlacement: Record<string, (typeof applicationGroups)[number]> = {
  PageHeader: 'Page structure',
  MasterDetail: 'Page structure',
  OrgSwitcher: 'Organizations & lists',
  ListToolbar: 'Organizations & lists',
  FilterBar: 'Organizations & lists',
  SettingsSaveCancel: 'Saving & navigation',
  UnsavedGuard: 'Saving & navigation',
};
export function componentSection(entry: CatalogEntry): ComponentSection {
  const group = catalogGroup(entry);
  if (group === 'Application patterns') return 'application';
  if (group === 'Marketing blocks') return 'marketing';
  return group === 'AI Components' ? 'ai' : 'ui';
}
export function gallerySection(view: GalleryView, entry: CatalogEntry): GallerySection {
  if (view === 'components') return componentSection(entry);
  return view === 'workbench' || view === 'coding' || view === 'templates'
    ? 'templates'
    : 'customize';
}
export function navigationGroup(entry: CatalogEntry): string {
  const section = componentSection(entry);
  if (section === 'ai') return aiDomains[entry.category] ?? entry.category;
  if (section === 'application') {
    const group = applicationPlacement[entry.name];
    if (!group) throw new Error(`Missing application group: ${entry.name}`);
    return group;
  }
  if (section === 'marketing')
    return entry.category === 'Site navigation' ? 'Site navigation' : 'Website sections';
  return catalogGroup(entry);
}
export function sectionCatalog(section: GallerySection) {
  return filterCatalog('').filter((entry) => componentSection(entry) === section);
}
export function componentSearchText(entry: CatalogEntry): string {
  return [
    entry.name,
    entry.description,
    entry.category,
    catalogGroup(entry),
    navigationGroup(entry),
    sectionLabels[componentSection(entry)],
    ...(entry.aliases ?? []),
    ...(aliases[entry.name] ?? []),
  ]
    .join(' ')
    .toLowerCase();
}
/** Main component discovery spans the first-release UI and AI collections. */
export function searchCatalog(query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return filterCatalog('').filter(
    (entry) =>
      isReleaseComponent(entry) && terms.every((term) => componentSearchText(entry).includes(term)),
  );
}
