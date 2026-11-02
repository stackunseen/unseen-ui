import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';
/* global fetch, AbortSignal */

// Asks GitHub for the repository's star count once per build and writes it where the site
// serves it, so page views never call GitHub's API (which limits unauthenticated callers to 60
// requests an hour). When GitHub cannot be reached the count is written as null and the header
// shows the link without a number. GITHUB_TOKEN, when set, raises the limit for CI builds.
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/github.json');
const repository = 'stackunseen/unseen-ui';
let stars = null;
try {
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (response.ok) {
    const data = await response.json();
    if (typeof data?.stargazers_count === 'number') stars = data.stargazers_count;
  } else console.warn(`github-stars: GitHub answered ${response.status}; the count is left out.`);
} catch (error) {
  console.warn(`github-stars: ${error.message}; the count is left out.`);
}
await mkdir(dirname(out), { recursive: true });
await writeFile(
  out,
  `${JSON.stringify({ repository, stars, checkedAt: new Date().toISOString() })}\n`,
);
console.log(`github-stars: ${stars === null ? 'unknown' : stars}`);
