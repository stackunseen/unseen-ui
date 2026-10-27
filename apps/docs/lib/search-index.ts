import { catalog } from './catalog';
import { componentSearchText, componentSection, navigationGroup } from './gallery-navigation';
import { sectionLabels } from './component-collections';
import { componentHref } from './site-paths';
import { componentTasks } from './tasks';
import { recipeListings, templateListings } from '../components/template-cards';
import { docsLinks } from '../components/docs-frame';
import { agentOperationsCollection } from './agent-operations';

/** One searchable place on the site, served as /search-index.json for the command palette. */
export interface SiteSearchItem {
  id: string;
  label: string;
  href: string;
  /** The palette heading the item sits under. */
  group: string;
  /** A short note at the end of the row, such as the catalog category. */
  hint?: string;
  description?: string;
  /** Everything a query may match, lower-cased by the matcher. */
  terms: string;
}

export function buildSearchIndex(): SiteSearchItem[] {
  const components = catalog.map((entry) => ({
    id: `component-${entry.name}`,
    label: entry.name,
    href: componentHref(entry.name),
    group: sectionLabels[componentSection(entry)],
    hint: navigationGroup(entry),
    description: entry.description,
    terms: componentSearchText(entry),
  }));
  const recipes = recipeListings.map((recipe) => ({
    id: `recipe-${recipe.preview}`,
    label: recipe.title,
    href: recipe.href,
    group: 'Patterns',
    hint: 'Recipe',
    description: recipe.description,
    terms: `${recipe.title} ${recipe.description} recipe pattern example`,
  }));
  const templates = templateListings.map((template) => ({
    id: `template-${template.preview}`,
    label: template.title,
    href: template.href,
    group: 'Templates',
    hint: template.kind,
    description: template.description,
    terms: `${template.title} ${template.description} template application app screen`,
  }));
  const tasks = componentTasks.map((task) => ({
    id: `task-${task.id}`,
    label: task.label,
    href: `/tasks/${task.id}/`,
    group: 'Tasks',
    hint: `${task.components.length} components`,
    description: task.description,
    terms: `${task.label} ${task.description} ${task.components.join(' ')} task job`,
  }));
  const guides = docsLinks.map(([label, href]) => ({
    id: `guide-${href}`,
    label,
    href,
    group: 'Guides',
    terms: `${label} guide docs documentation`,
  }));
  const pages: SiteSearchItem[] = [
    {
      id: 'page-components',
      label: 'All components',
      href: '/components/',
      group: 'Pages',
      terms: 'components catalog library index browse',
    },
    {
      id: 'page-agent-operations',
      label: agentOperationsCollection.title,
      href: `/components/#${agentOperationsCollection.id}`,
      group: 'Pages',
      hint: 'Collection',
      description: agentOperationsCollection.description,
      terms: `agent operations collection runs lanes tree waterfall ${agentOperationsCollection.components.join(' ')}`,
    },
    {
      id: 'page-patterns',
      label: 'Patterns',
      href: '/patterns/',
      group: 'Pages',
      terms: 'patterns recipes templates examples',
    },
    {
      id: 'page-templates',
      label: 'Templates',
      href: '/templates/',
      group: 'Pages',
      terms: 'templates applications apps screens',
    },
    {
      id: 'page-customize',
      label: 'Theme Studio',
      href: '/customize/',
      group: 'Pages',
      terms: 'customize theme studio colors tokens dark mode brand',
    },
    {
      id: 'page-design',
      label: 'Design foundations',
      href: '/design/',
      group: 'Pages',
      terms: 'design foundations typography spacing color principles',
    },
    {
      id: 'page-tasks',
      label: 'Tasks',
      href: '/tasks/',
      group: 'Pages',
      terms: 'tasks jobs start from what you are building',
    },
    {
      id: 'page-llms',
      label: 'llms.txt',
      href: '/llms.txt',
      group: 'Pages',
      hint: 'For coding agents',
      terms: 'llms txt markdown ai agent cursor claude code manifest',
    },
  ];
  return [...pages, ...guides, ...components, ...recipes, ...templates, ...tasks];
}
