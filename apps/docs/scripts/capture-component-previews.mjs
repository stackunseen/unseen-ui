import { Buffer } from 'node:buffer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, getComputedStyle, Image, NodeFilter */

// Captures the catalog thumbnails from the exported site's own live previews, so a card shows
// what the component page shows. Run after `pnpm --filter ./apps/docs build` with the preview
// server up:  node apps/docs/scripts/capture-component-previews.mjs [slug ...]
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const outDir = resolve('apps/docs/public/previews/components');
const work = resolve('output/playwright/component-previews');
await mkdir(outDir, { recursive: true });
await mkdir(work, { recursive: true });
const session = `unseen-previews-${process.pid}`;
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

const requested = process.argv.slice(2);
const slugs = requested.length
  ? requested
  : (await readdir(resolve('apps/docs/out/components'), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
      .sort();

async function capture(page, { origin, slugs, width, height }) {
  const results = {};
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    for (const slug of slugs) {
      try {
        await page.goto(`${origin}/components/${slug}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const stage = page.locator('.preview-canvas').first();
        if (!(await stage.count())) {
          results[`${slug}-${scheme}`] = { error: 'no preview' };
          continue;
        }
        // The sticky site header would sit over the crop; hide it for the capture only.
        await page.addStyleTag({ content: '.web-header{visibility:hidden!important}' });
        // Bring the stage to the top of the viewport first; every rectangle below is measured after.
        await stage.evaluate((node) => node.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(150);
        const box = await page.evaluate(() => {
          const canvas = document.querySelector('.preview-canvas');
          const specimen = canvas?.querySelector('.detail-specimen');
          if (!canvas || !specimen) return null;
          const outer = canvas.getBoundingClientRect();
          // Measure what is actually drawn: text, controls and media, not the full-width blocks
          // around them, so a small control is framed by its own size.
          const rects = [];
          const walker = document.createTreeWalker(
            specimen,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
          );
          const drawn =
            'button,input,select,textarea,svg,img,canvas,video,progress,meter,[role="img"],[role="switch"],[role="slider"],[role="checkbox"],[role="radio"]';
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.nodeType === 3) {
              if (!node.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              rects.push(...range.getClientRects());
              continue;
            }
            const style = getComputedStyle(node);
            if (
              style.visibility === 'hidden' ||
              style.display === 'none' ||
              node.closest('.sr-only')
            )
              continue;
            const bordered =
              parseFloat(style.borderTopWidth) > 0 ||
              (style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                style.backgroundColor !== 'transparent');
            if (node.matches(drawn) || bordered) rects.push(node.getBoundingClientRect());
          }
          const outerRect = outer;
          const visible = rects.filter(
            (rect) =>
              rect.width > 0 &&
              rect.height > 0 &&
              rect.right > outerRect.left &&
              rect.left < outerRect.right &&
              // A bordered box as wide as the stage is the stage's own frame, not the component.
              !(rect.width >= outerRect.width - 2 && rect.height >= outerRect.height - 2),
          );
          if (!visible.length) return null;
          const left = Math.min(...visible.map((rect) => rect.left));
          const top = Math.min(...visible.map((rect) => rect.top));
          const right = Math.max(...visible.map((rect) => rect.right));
          const bottom = Math.max(...visible.map((rect) => rect.bottom));
          return {
            // Inset past the stage's own border so the frame line never enters the crop.
            outer: {
              x: outer.left + 2,
              y: outer.top + 2,
              width: outer.width - 4,
              height: outer.height - 4,
            },
            inner: { x: left, y: top, width: right - left, height: bottom - top },
            background: getComputedStyle(canvas).backgroundColor,
          };
        });
        if (!box) {
          results[`${slug}-${scheme}`] = { error: 'no preview' };
          continue;
        }
        const pad = 20;
        // A floor on the crop keeps small controls at their natural size instead of blown up.
        const minWidth = 300;
        const ratio = width / height;
        let x = box.inner.x - pad,
          y = box.inner.y - pad,
          w = box.inner.width + pad * 2,
          h = box.inner.height + pad * 2;
        if (w < minWidth) {
          x -= (minWidth - w) / 2;
          w = minWidth;
        }
        // Widen or heighten around the component to the card's ratio, inside the stage.
        if (w / h < ratio) {
          const target = h * ratio;
          x -= (target - w) / 2;
          w = target;
        } else {
          const target = w / ratio;
          y -= (target - h) / 2;
          h = target;
        }
        const o = box.outer;
        x = Math.max(o.x, Math.min(x, o.x + o.width - w));
        w = Math.min(w, o.width);
        y = Math.max(o.y, y);
        h = Math.min(h, o.y + o.height - y);
        h = Math.min(h, 1000 - y);
        const png = await page.screenshot({ clip: { x, y, width: w, height: h } });
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
            const scale = Math.min(width / image.width, height / image.height);
            const drawWidth = image.width * scale,
              drawHeight = image.height * scale;
            context.drawImage(
              image,
              (width - drawWidth) / 2,
              (height - drawHeight) / 2,
              drawWidth,
              drawHeight,
            );
            return canvas.toDataURL('image/webp', 0.78).split(',')[1];
          },
          { data: png.toString('base64'), width, height, background: box.background },
        );
        results[`${slug}-${scheme}`] = { webp };
      } catch (error) {
        results[`${slug}-${scheme}`] = { error: String(error).slice(0, 200) };
      }
    }
  }
  return results;
}

const failures = [];
let written = 0;
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=1800000']);
  // Batches keep each run-code response within the CLI's output limit.
  for (let index = 0; index < slugs.length; index += 12) {
    const batch = slugs.slice(index, index + 12);
    const filename = resolve(work, 'capture.js');
    await writeFile(
      filename,
      `async page => {\nreturn (${capture.toString()})(page, ${JSON.stringify({ origin, slugs: batch, width: 480, height: 300 })});\n}`,
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
    console.log(`${Math.min(index + 12, slugs.length)} of ${slugs.length} pages`);
  }
} finally {
  await command(['close']).catch(() => {});
}
console.log(JSON.stringify({ written, failures }, null, 2));
