export const siteNavigation = [
  ['Components', '/components/'],
  ['Getting Started', '/getting-started/'],
  ['Customize', '/customize/'],
] as const;
export function isSiteSectionActive(path: string, href: string): boolean {
  if (href === '/getting-started/')
    return path.startsWith('/getting-started/') || path.startsWith('/docs/') || path === '/design/';
  return path.startsWith(href.replace(/\/$/, ''));
}
