import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) => (e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name))),
    )
  ).flat();
}
for (const file of await files('packages/core/src')) {
  const source = await readFile(file, 'utf8');
  if (
    /from\s+['"](?:react|react-dom|next|@radix-ui|@ai-interaction\/react)|\b(?:window|document|localStorage|fetch)\s*[.(]/.test(
      source,
    )
  )
    throw new Error(`Core boundary violated: ${file}`);
}
for (const name of ['core', 'react']) {
  const p = JSON.parse(await readFile(`packages/${name}/package.json`, 'utf8'));
  if (
    p.dependencies?.tailwindcss ||
    p.dependencies?.next ||
    p.dependencies?.['react-dom'] ||
    p.dependencies?.react
  )
    throw new Error(`Invalid dependency in ${name}`);
}
console.log('PASS: core host/UI boundary; React peers; gallery-only styling dependencies.');
