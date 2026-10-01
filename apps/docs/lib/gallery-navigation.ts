import { catalogGroup, filterCatalog } from './catalog';
import type { CatalogEntry } from './catalog';
import type { GalleryView } from './gallery-location';

export type GallerySection = 'ui' | 'ai' | 'patterns' | 'customize';
export const sectionLabels: Record<GallerySection, string> = {
  ui: 'UI Components',
  ai: 'AI Components',
  patterns: 'Patterns',
  customize: 'Customize',
};
export const uiGroups = [
  'Actions',
  'Forms',
  'Navigation',
  'Overlays',
  'Feedback',
  'Data Display',
  'Layout',
] as const;
export const aiGroups = [
  'Conversation',
  'Tools & execution',
  'Review & permissions',
  'Context & sources',
  'Agents & governance',
  'Model & generated UI',
  'Coding & artifacts',
] as const;
const aiDomains: Record<string, (typeof aiGroups)[number]> = {
  Conversation: 'Conversation',
  Voice: 'Conversation',
  Tools: 'Tools & execution',
  Execution: 'Tools & execution',
  Workflow: 'Tools & execution',
  'Human review': 'Review & permissions',
  Context: 'Context & sources',
  'Sources & evidence': 'Context & sources',
  MCP: 'Context & sources',
  Agents: 'Agents & governance',
  'Enterprise AI': 'Agents & governance',
  'State & status': 'Agents & governance',
  'Model controls': 'Model & generated UI',
  'AI forms': 'Model & generated UI',
  'Generative UI': 'Model & generated UI',
  'Coding workspace': 'Coding & artifacts',
  Artifacts: 'Coding & artifacts',
};
export function componentSection(entry: CatalogEntry): 'ui' | 'ai' {
  return catalogGroup(entry) === 'AI Components' ? 'ai' : 'ui';
}
export function gallerySection(view: GalleryView, entry: CatalogEntry): GallerySection {
  if (view === 'components') return componentSection(entry);
  return view === 'workbench' || view === 'coding' || view === 'templates'
    ? 'patterns'
    : 'customize';
}
export function navigationGroup(entry: CatalogEntry): string {
  if (componentSection(entry) === 'ai') return aiDomains[entry.category] ?? entry.category;
  const group = catalogGroup(entry);
  return group === 'Foundations' ? 'Actions' : group;
}
export function sectionCatalog(section: GallerySection) {
  return filterCatalog('').filter((entry) => componentSection(entry) === section);
}
/** Search remains global, even when a pattern or customization page is active. */
export function searchCatalog(query: string) {
  return filterCatalog(query);
}
