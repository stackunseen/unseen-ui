import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { componentSlug } from './site-paths';

/**
 * The captured thumbnail's base path for a component, or undefined when none exists yet. Server
 * only: it reads the public folder at build time.
 */
export function componentPreview(name: string): string | undefined {
  const slug = componentSlug(name);
  return existsSync(join(process.cwd(), 'public/previews/components', `${slug}-light.webp`))
    ? `/previews/components/${slug}`
    : undefined;
}
