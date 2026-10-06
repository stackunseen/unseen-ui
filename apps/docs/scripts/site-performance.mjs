import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
/* global window, PerformanceObserver, performance, document, navigator */
const output = resolve('output/playwright/unseen-performance');
await mkdir(output, { recursive: true });
const session = `unseen-perf-${process.pid}`;
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
const config = resolve(output, 'config.json');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const commands = [];
await writeFile(
  config,
  JSON.stringify({
    browser: {
      browserName: 'chromium',
      isolated: true,
      launchOptions: { headless: true, channel: 'chromium' },
    },
  }),
);
async function command(args, timeout = 30000) {
  try {
    const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
      timeout,
      maxBuffer: 2_000_000,
      windowsHide: true,
    });
    commands.push({ args, stdout: result.stdout, stderr: result.stderr });
    return result.stdout;
  } catch (error) {
    commands.push({ args, error: error.message, stdout: error.stdout, stderr: error.stderr });
    throw error;
  }
}
async function measure(page, origin) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.addInitScript(() => {
    window.siteMeasurement = { lcp: null, cls: 0, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.siteMeasurement.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.siteMeasurement.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.siteMeasurement.longTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  const samples = [];
  for (const route of ['/', '/components/', '/components/button/']) {
    for (let sample = 1; sample <= 3; sample++) {
      await page.goto(origin + route);
      await page.locator('h1').waitFor({ state: 'visible' });
      await page.waitForTimeout(1000);
      const result = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        return {
          browser: navigator.userAgent,
          navigation: {
            responseEndMs: navigation.responseEnd,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            loadMs: navigation.loadEventEnd,
          },
          firstContentfulPaintMs:
            performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
          largestContentfulPaintMs: window.siteMeasurement.lcp,
          cls: window.siteMeasurement.cls,
          longTasksMs: window.siteMeasurement.longTasks,
          totalBlockingTimeMs: window.siteMeasurement.longTasks.reduce(
            (sum, duration) => sum + Math.max(0, duration - 50),
            0,
          ),
          resources: resources.map((entry) => ({
            url: entry.name,
            decodedBytes: entry.decodedBodySize,
            transferBytes: entry.transferSize,
          })),
          headings: document.querySelectorAll('h1').length,
        };
      });
      samples.push({ route, sample, ...result });
    }
  }
  await cdp.detach();
  return samples;
}
try {
  await command(['open', 'about:blank', `--config=${config}`, '--idle-timeout=60000']);
  const filename = resolve(output, 'measure.js');
  await writeFile(
    filename,
    `async page => (${measure.toString()})(page, ${JSON.stringify(origin)})`,
  );
  const samples = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw'], 60000));
  const routeAssets = [];
  for (const route of [...new Set(samples.map((sample) => sample.route))]) {
    const resources = [
      ...new Set(
        samples
          .filter((sample) => sample.route === route)
          .flatMap((sample) => sample.resources.map((resource) => resource.url)),
      ),
    ];
    const assets = [];
    for (const resource of resources) {
      const path = new URL(resource).pathname;
      if (!path.startsWith('/_next/') || !/\.(js|css)$/.test(path)) continue;
      const data = await readFile(resolve('apps/docs/out', '.' + decodeURIComponent(path)));
      assets.push({ path, bytes: data.length, gzipBytes: gzipSync(data).length });
    }
    routeAssets.push({
      route,
      jsBytes: assets
        .filter((asset) => asset.path.endsWith('.js'))
        .reduce((sum, asset) => sum + asset.bytes, 0),
      jsGzipBytes: assets
        .filter((asset) => asset.path.endsWith('.js'))
        .reduce((sum, asset) => sum + asset.gzipBytes, 0),
      cssBytes: assets
        .filter((asset) => asset.path.endsWith('.css'))
        .reduce((sum, asset) => sum + asset.bytes, 0),
      cssGzipBytes: assets
        .filter((asset) => asset.path.endsWith('.css'))
        .reduce((sum, asset) => sum + asset.gzipBytes, 0),
      assets,
    });
  }
  const report = {
    methodology:
      'Chromium headless,1440x960, local uncompressed HTTP, cache disabled with CDP, unthrottled CPU/network,3 navigations per route and1s observation after visible H1. LCP/CLS/TBT are local diagnostic samples, not field Core Web Vitals or production acceptance. Gzip totals are offline sums of assets actually requested across the samples, not measured compressed transfers.',
    samples,
    routeAssets,
  };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        samples: samples.map(
          ({
            route,
            sample,
            firstContentfulPaintMs,
            largestContentfulPaintMs,
            cls,
            totalBlockingTimeMs,
          }) => ({
            route,
            sample,
            firstContentfulPaintMs,
            largestContentfulPaintMs,
            cls,
            totalBlockingTimeMs,
          }),
        ),
        routeAssets: routeAssets.map(({ route, jsBytes, jsGzipBytes, cssBytes, cssGzipBytes }) => ({
          route,
          jsBytes,
          jsGzipBytes,
          cssBytes,
          cssGzipBytes,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  try {
    await command(['close']);
  } catch (error) {
    const snapshot = await command(['snapshot']).catch(
      (snapshotError) => snapshotError.stdout || snapshotError.message,
    );
    if (!snapshot.includes(`The browser '${session}' is not open`)) {
      console.error(error.message);
      process.exitCode = 1;
    } else console.log('Browser closure verified after CLI close timeout.');
  } finally {
    await writeFile(resolve(output, 'commands.json'), JSON.stringify(commands, null, 2));
  }
}
