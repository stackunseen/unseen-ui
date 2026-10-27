import { Buffer } from 'node:buffer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, getComputedStyle, Image */

// Captures the Patterns page thumbnails from the exported site's own recipe and template pages,
// so a card shows what the page shows. Run after `pnpm --filter ./apps/docs build` with the
// preview server up:  node apps/docs/scripts/capture-pattern-previews.mjs [name ...]
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const outDir = resolve('apps/docs/public/previews/patterns');
const work = resolve('output/playwright/pattern-previews');
await mkdir(outDir, { recursive: true });
await mkdir(work, { recursive: true });
const session = `unseen-pattern-previews-${process.pid}`;
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
const config = resolve(work, 'config.json');
await writeFile(
  config,
  JSON.stringify({
    browser: { browserName: 'chromium', isolated: true, launchOptions: { headless: true } },
  }),
);
const command = async (args, timeout = 60000) =>
  (
    await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
      timeout,
      maxBuffer: 64 << 20,
      windowsHide: true,
    })
  ).stdout;

const pages = {
  'ai-sdk-chat': '/patterns/ai-sdk-chat/',
  'recoverable-chat': '/patterns/recoverable-chat/',
  'action-receipts': '/patterns/action-receipts/',
  'research-answers': '/patterns/research-answers/',
  'agent-operations': '/patterns/agent-operations/',
  'agent-workbench': '/patterns/agent-workbench/',
  'coding-studio': '/patterns/coding-studio/',
  'workspace-integrations': '/patterns/workspace-integrations/',
  'saas-admin': '/templates/saas-admin/',
  evals: '/templates/evals/',
  analytics: '/templates/analytics/',
  'settings-billing': '/templates/settings-billing/',
  'app-shells': '/templates/app-shells/',
  marketing: '/templates/marketing/',
  relay: '/templates/relay/',
};
const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(pages);

async function capture(page, { origin, entries, width, height }) {
  const results = {};
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    for (const [name, path] of entries) {
      try {
        await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        // The sticky site header would sit over the crop; hide it for the capture only.
        await page.addStyleTag({ content: '.web-header{visibility:hidden!important}' });
        const box = await page.evaluate(() => {
          // The page's own content, below its heading: the recipe or the application itself.
          const target =
            document.querySelector('.example-page-content') ||
            document.querySelector('.template-workspace') ||
            document.querySelector('main > header + *') ||
            document.querySelector('main');
          if (!target) return null;
          target.scrollIntoView({ block: 'start' });
          const rect = target.getBoundingClientRect();
          return {
            x: Math.max(0, rect.left),
            y: Math.max(0, rect.top),
            width: Math.min(rect.width, 1280 - Math.max(0, rect.left)),
            background: getComputedStyle(document.body).backgroundColor,
          };
        });
        await page.waitForTimeout(150);
        if (!box || box.width < 200) {
          results[`${name}-${scheme}`] = { error: 'no content' };
          continue;
        }
        const w = box.width;
        const h = Math.min((w * height) / width, 1000 - box.y);
        const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: w, height: h } });
        const webp = await page.evaluate(
          async ({ data, width, height, background }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${data}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            context.fillStyle = background;
            context.fillRect(0, 0, width, height);
            const scale = width / image.width;
            // Anchor to the top: the first screen of a page is what a visitor meets.
            context.drawImage(image, 0, 0, image.width * scale, image.height * scale);
            return canvas.toDataURL('image/webp', 0.82).split(',')[1];
          },
          { data: png.toString('base64'), width, height, background: box.background },
        );
        results[`${name}-${scheme}`] = { webp };
      } catch (error) {
        results[`${name}-${scheme}`] = { error: String(error).slice(0, 200) };
      }
    }
  }
  return results;
}

const failures = [];
let written = 0;
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=1800000']);
  const entries = names.map((name) => [name, pages[name]]).filter(([, path]) => path);
  const filename = resolve(work, 'capture.js');
  await writeFile(
    filename,
    `async page => {\nreturn (${capture.toString()})(page, ${JSON.stringify({ origin, entries, width: 1280, height: 800 })});\n}`,
  );
  const results = JSON.parse(
    await command(['run-code', `--filename=${filename}`, '--raw'], 600000),
  );
  for (const [name, result] of Object.entries(results)) {
    if (result.webp) {
      await writeFile(resolve(outDir, `${name}.webp`), Buffer.from(result.webp, 'base64'));
      written++;
    } else failures.push({ name, error: result.error });
  }
} finally {
  await command(['close']).catch(() => {});
}
console.log(JSON.stringify({ written, failures }, null, 2));
