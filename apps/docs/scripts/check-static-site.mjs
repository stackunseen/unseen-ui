import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
const root = fileURLToPath(new URL('../out/', import.meta.url));
const expectedOrigin = process.env.SITE_ORIGIN?.replace(/\/$/, '');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const indexedPaths = new Set(sitemapUrls.map((url) => new URL(url).pathname));
const failures = [],
  pages = [],
  links = new Set();
const files = [];
async function walk(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    if (['_next', '_not-found', '404'].includes(item.name)) continue;
    const full = resolve(path, item.name);
    if (item.isDirectory()) await walk(full);
    else if (item.name === 'index.html') files.push(full);
  }
}
await walk(root);
const titles = new Set(),
  descriptions = new Set();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const path =
    '/' +
    file
      .slice(root.length)
      .replace(/\\/g, '/')
      .replace(/index\.html$/, '');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const headings = (html.match(/<h1(?:\s|>)/g) ?? []).length;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1];
  if (!title || titles.has(title)) failures.push(`${path}: missing/duplicate title`);
  if (!description || descriptions.has(description))
    failures.push(`${path}: missing/duplicate description`);
  if (headings !== 1) failures.push(`${path}: ${headings} H1 elements`);
  if (!html.includes('<main')) failures.push(`${path}: no semantic main content`);
  if (!html.includes('property="og:title"') || !html.includes('name="twitter:card"'))
    failures.push(`${path}: social metadata absent`);
  if (
    expectedOrigin
      ? canonical !== expectedOrigin + path ||
        robots !== (indexedPaths.has(path) ? 'index, follow' : 'noindex, follow')
      : canonical || robots !== 'noindex, nofollow'
  )
    failures.push(`${path}: incorrect origin/indexing metadata`);
  if (html.includes('preview-widths') || html.includes('aria-label="Preview width"'))
    failures.push(`${path}: removed preview width UI still rendered`);
  titles.add(title);
  descriptions.add(description);
  pages.push({
    path,
    title,
    description,
    headings,
    canonical: canonical ?? null,
    robots,
    htmlBytes: Buffer.byteLength(html),
  });
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g))
    if (match[1].startsWith('/')) links.add(match[1].replace(/&amp;/g, '&'));
}
for (const link of links) {
  const pathname = new URL(link, 'https://local.test').pathname;
  let file = resolve(root, '.' + pathname);
  if (!extname(pathname)) file = resolve(file, 'index.html');
  try {
    await stat(file);
  } catch {
    failures.push(`Broken local link: ${link}`);
  }
}
const routeMap = JSON.parse(await readFile(resolve(root, 'gallery-routes.json'), 'utf8'));
if (Object.keys(routeMap.components).length !== 112)
  failures.push('Component route count is not 112');
if (pages.length < 127) failures.push('Supporting page exports are incomplete');
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
if (expectedOrigin) {
  if (!robots.includes(`Sitemap: ${expectedOrigin}/sitemap.xml`))
    failures.push('Robots sitemap origin mismatch');
  if (sitemapUrls.length !== 107 || indexedPaths.size !== sitemapUrls.length)
    failures.push('First-release sitemap must contain 107 unique routes');
  for (const url of sitemapUrls)
    if (
      !url.startsWith(expectedOrigin + '/') ||
      !pages.some((page) => expectedOrigin + page.path === url)
    )
      failures.push(`Sitemap URL has no matching page: ${url}`);
  for (const path of [
    '/templates/',
    '/templates/marketing/',
    '/components/org-switcher/',
    '/components/marketing-faq/',
    '/patterns/',
  ])
    if (indexedPaths.has(path)) failures.push(`Deferred collection promoted in sitemap: ${path}`);
} else if (!robots.includes('Disallow: /') || sitemap.includes('<loc>'))
  failures.push('Unconfigured origin must keep preview unindexed');
const report = {
  passed: !failures.length,
  expectedOrigin: expectedOrigin ?? null,
  pageCount: pages.length,
  componentCount: Object.keys(routeMap.components).length,
  localLinkCount: links.size,
  failures,
  pages,
};
await writeFile(resolve('output/unseen-ui-static-site.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, pages: undefined }, null, 2));
if (failures.length) process.exitCode = 1;
