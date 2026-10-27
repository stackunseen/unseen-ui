export const componentSections = ['ui', 'ai', 'application', 'marketing'] as const;
export type ComponentSection = (typeof componentSections)[number];
export const releaseSections = ['ui', 'ai'] as const;
export function isReleaseSection(section: ComponentSection): boolean {
  return releaseSections.some((item) => item === section);
}
export type GallerySection = ComponentSection | 'patterns' | 'templates' | 'customize';
export const sectionLabels: Record<GallerySection, string> = {
  ui: 'UI components',
  ai: 'AI components',
  application: 'Application compositions',
  marketing: 'Website compositions',
  patterns: 'AI recipes',
  templates: 'Templates',
  customize: 'Customize',
};
export const collectionDescriptions: Record<ComponentSection, string> = {
  ui: 'Controls, navigation, layout and rich content for React interfaces.',
  ai: 'Conversation, execution, generated output and review interfaces driven by your server.',
  application:
    'Controlled compositions for page structure, organizations, lists and unsaved changes.',
  marketing: 'Reusable website navigation, sections and contact layouts.',
};
export const uiGroups = [
  'Actions',
  'Forms',
  'Navigation',
  'Overlays',
  'Feedback',
  'Data Display',
  'Rich Content',
  'Layout',
] as const;
export const aiGroups = [
  'Conversation',
  'Voice',
  'Tools & execution',
  'Review & permissions',
  'Context & memory',
  'Sources & evidence',
  'MCP connections & tools',
  'Agents & governance',
  'Model settings',
  'Forms & generated UI',
  'Coding & artifacts',
] as const;
export const applicationGroups = [
  'Page structure',
  'Organizations & lists',
  'Saving & navigation',
  'Checklists & progress',
] as const;
export const marketingGroups = [
  'Site navigation',
  'Website sections',
  'Motion',
  'Illustrations',
] as const;
export function sectionGroups(section: GallerySection): readonly string[] {
  return section === 'ui'
    ? uiGroups
    : section === 'ai'
      ? aiGroups
      : section === 'application'
        ? applicationGroups
        : section === 'marketing'
          ? marketingGroups
          : [];
}
