export const siteNavigation = [
  ['Components', '/components/'],
  ['Patterns', '/patterns/'],
  ['Getting Started', '/getting-started/'],
  ['Customize', '/customize/'],
] as const;
export function isSiteSectionActive(path: string, href: string): boolean {
  if (href === '/getting-started/')
    return path.startsWith('/getting-started/') || path.startsWith('/docs/') || path === '/design/';
  if (href === '/patterns/') return path.startsWith('/patterns') || path.startsWith('/templates');
  return path.startsWith(href.replace(/\/$/, ''));
}
