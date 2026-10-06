import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertPublishable,
  compareVersions,
  inspectArchive,
  integrity,
  nextVersion,
  packages,
  publishInOrder,
  releasePlan,
  repository,
} from './release-lib.mjs';

const base = 'a'.repeat(40);
const version = '0.1.0-alpha.0';
function manifest(index = 0, overrides = {}) {
  return {
    name: packages[index].name,
    version,
    private: false,
    license: 'MIT',
    repository: { type: 'git', url: `git+https://github.com/${repository}.git` },
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
    ...(index === 1 ? { dependencies: { [packages[0].name]: 'workspace:*' } } : {}),
    ...overrides,
  };
}
function archive(files) {
  const blocks = [];
  for (const [name, value] of Object.entries(files)) {
    const bytes = Buffer.from(value);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write(bytes.length.toString(8).padStart(11, '0'), 124, 12);
    header.write('0', 156);
    header.write('ustar', 257);
    blocks.push(header, bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}
function fixture(pkg = manifest(), extra = {}) {
  return archive({
    'package/package.json': JSON.stringify(pkg),
    'package/README.md': '# Example',
    'package/LICENSE': 'Test fixture license',
    'package/dist/index.js': 'export const example = 1;',
    'package/dist/index.d.ts': 'export declare const example = 1;',
    ...extra,
  });
}

test('patch/minor/major preserve alpha and only promote makes the current alpha stable', () => {
  assert.equal(nextVersion(version, 'prerelease'), '0.1.0-alpha.1');
  assert.equal(nextVersion(version, 'patch'), '0.1.1-alpha.0');
  assert.equal(nextVersion(version, 'minor'), '0.2.0-alpha.0');
  assert.equal(nextVersion(version, 'major'), '1.0.0-alpha.0');
  assert.equal(nextVersion(version, 'promote'), '0.1.0');
  assert.equal(nextVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(nextVersion('1.2.3', 'prerelease'), '1.2.4-alpha.0');
});

test('reject invalid versions, arbitrary bump input and accidental second promotion', () => {
  for (const value of ['01.0.0', 'v1.0.0', '1.0.0-beta.0', '1.0.0;echo fail', '1.0.0-alpha.01'])
    assert.throws(() => nextVersion(value, 'patch'));
  assert.throws(() => nextVersion('1.0.0', 'promote'));
  assert.throws(() => nextVersion(version, 'latest'));
  assert.throws(() => nextVersion('9007199254740991.0.0', 'major'));
});

test('stale, divergent or wrongly scoped packages cannot produce a release plan', () => {
  const source = [manifest(), manifest(1)];
  const plan = releasePlan(source, version, 'prerelease', base);
  assert.equal(plan.version, '0.1.0-alpha.1');
  assert.equal(plan.channel, 'alpha');
  assert.equal(releasePlan(source, version, 'promote', base).channel, 'latest');
  assert.throws(() => releasePlan(source, '0.0.1', 'patch', base));
  assert.throws(() =>
    releasePlan([manifest(), manifest(1, { version: '0.2.0' })], version, 'patch', base),
  );
  assert.throws(() => releasePlan(source, version, 'patch', 'main'));
  assert.throws(() =>
    releasePlan([manifest(0, { name: '@wrong/core' }), manifest(1)], version, 'patch', base),
  );
  assert.throws(() =>
    releasePlan([manifest(), manifest(1, { dependencies: {} })], version, 'patch', base),
  );
});

test('publication is gated by explicit flags, license file and matching repository', () => {
  assert.doesNotThrow(() => assertPublishable(manifest(), true));
  for (const overrides of [
    { private: true },
    { private: undefined },
    { license: 'UNLICENSED' },
    { repository: {} },
  ])
    assert.throws(() => assertPublishable(manifest(0, overrides), true));
  assert.throws(() => assertPublishable(manifest(), false));
});

test('archive includes only approved files with real exported targets and exact internal version', () => {
  const bytes = fixture();
  assert.deepEqual(inspectArchive(bytes, manifest()), { files: 5, integrity: integrity(bytes) });
  assert.throws(() =>
    inspectArchive(fixture(manifest(), { 'package/.npmrc': 'fixture' }), manifest()),
  );
  assert.throws(() =>
    inspectArchive(fixture(manifest(), { 'package/docs/ai/HANDOFF.md': 'fixture' }), manifest()),
  );
  assert.throws(() =>
    inspectArchive(fixture(manifest(), { 'package/dist/../secret': 'fixture' }), manifest()),
  );
  assert.throws(() =>
    inspectArchive(fixture(manifest(0, { exports: { '.': './dist/missing.js' } })), manifest()),
  );
  assert.throws(() => inspectArchive(fixture(manifest(1)), manifest(1)));
  assert.throws(
    () => inspectArchive(fixture(), manifest(0, { license: 'Apache-2.0' })),
    /license differs/,
  );
  const react = manifest(1, { dependencies: { [packages[0].name]: version } });
  assert.doesNotThrow(() => inspectArchive(fixture(react), react));
});

const entries = packages.map(({ name }) => ({
  name,
  version,
  channel: 'alpha',
  integrity: `sha512-${name}`,
}));
const record = (entry) => ({
  name: entry.name,
  version: entry.version,
  dist: { integrity: entry.integrity },
});
function publisher(initial = new Map(), onPublish) {
  const state = new Map(initial);
  const calls = [];
  return {
    state,
    calls,
    options: {
      lookup: async (entry) => state.get(entry.name) ?? null,
      channelVersion: async () => null,
      publish: async (entry) => {
        calls.push(entry.name);
        if (onPublish) await onPublish(entry, state);
        else state.set(entry.name, record(entry));
      },
      pause: async () => {},
    },
  };
}

test('core is confirmed before React; retry after a completed release publishes nothing', async () => {
  const p = publisher();
  await publishInOrder(entries, p.options);
  assert.deepEqual(
    p.calls,
    packages.map(({ name }) => name),
  );
  await publishInOrder(entries, p.options);
  assert.equal(p.calls.length, 2);
});

test('partial release retries only React and accepts a lost acknowledgement when bytes match', async () => {
  const p = publisher(new Map([[entries[0].name, record(entries[0])]]), async (entry, state) => {
    state.set(entry.name, record(entry));
    throw new Error('connection lost after upload');
  });
  await publishInOrder(entries, p.options);
  assert.deepEqual(p.calls, [entries[1].name]);
});

test('an unknown core outcome stops before React; retries do not invent success', async () => {
  const p = publisher(new Map(), async () => {
    throw new Error('connection lost');
  });
  await assert.rejects(publishInOrder(entries, p.options), /not confirmed/);
  assert.deepEqual(p.calls, [entries[0].name]);
});

test('either existing checksum mismatch stops before any package is published', async () => {
  const p = publisher(
    new Map([[entries[1].name, { ...record(entries[1]), dist: { integrity: 'different' } }]]),
  );
  await assert.rejects(publishInOrder(entries, p.options), /bytes differ/);
  assert.deepEqual(p.calls, []);
});

test('registry errors and attempts to roll distribution tags backwards fail before publication', async () => {
  const p = publisher();
  p.options.lookup = async () => {
    throw new Error('401');
  };
  await assert.rejects(publishInOrder(entries, p.options), /401/);
  assert.deepEqual(p.calls, []);
  const q = publisher();
  q.options.channelVersion = async () => '0.2.0-alpha.0';
  await assert.rejects(publishInOrder(entries, q.options), /backwards/);
  assert.deepEqual(q.calls, []);
  assert.equal(compareVersions('1.0.0', '1.0.0-alpha.99'), 1);
  assert.equal(compareVersions('1.0.0-alpha.2', '1.0.0-alpha.10'), -1);
});

test('isolated Git fixture reserves one deterministic commit/tag; stale branches and conflicting tags cannot be overwritten', () => {
  const temp = mkdtempSync(join(tmpdir(), 'unseen-release-test-'));
  const origin = join(temp, 'origin.git');
  const seed = join(temp, 'seed');
  const exec = (cwd, command, args, env = {}) => {
    const result = spawnSync(command, args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...env },
      maxBuffer: 2_000_000,
    });
    if (result.status !== 0)
      throw new Error(result.stderr || result.stdout || result.error?.message);
    return result.stdout.trim();
  };
  exec(temp, 'git', ['init', '--bare', '--initial-branch=main', origin]);
  exec(temp, 'git', ['clone', origin, seed]);
  exec(seed, 'git', ['config', 'user.name', 'Release test']);
  exec(seed, 'git', ['config', 'user.email', 'test@example.invalid']);
  mkdirSync(join(seed, 'scripts'));
  for (const file of ['release.mjs', 'release-lib.mjs'])
    copyFileSync(resolve('scripts', file), join(seed, 'scripts', file));
  writeFileSync(join(seed, '.gitignore'), 'output/\n');
  for (let i = 0; i < packages.length; i++) {
    const dir = join(seed, 'packages', packages[i].folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest(i), null, 2)}\n`);
    writeFileSync(join(dir, 'LICENSE'), 'Test fixture license');
  }
  exec(seed, 'git', ['add', '.']);
  exec(seed, 'git', ['commit', '-m', 'Fixture source']);
  exec(seed, 'git', ['push', 'origin', 'main']);
  const source = exec(seed, 'git', ['rev-parse', 'HEAD']);
  const plan = releasePlan([manifest(), manifest(1)], version, 'prerelease', source);
  const environment = {
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: repository,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  };
  const checkout = (name, artifact = plan) => {
    const dir = join(temp, name);
    exec(temp, 'git', ['clone', origin, dir]);
    exec(dir, 'git', ['checkout', '--detach', source]);
    mkdirSync(join(dir, 'output/release'), { recursive: true });
    const artifacts = packages.map((pkg, index) => {
      const packed = manifest(index, {
        version: artifact.version,
        ...(index === 1 ? { dependencies: { [packages[0].name]: artifact.version } } : {}),
      });
      const bytes = fixture(packed);
      const filename = `${pkg.name.slice(1).replace('/', '-')}-${artifact.version}.tgz`;
      writeFileSync(join(dir, 'output/release', filename), bytes);
      return {
        name: pkg.name,
        version: artifact.version,
        channel: artifact.channel,
        filename,
        ...inspectArchive(bytes, packed),
      };
    });
    writeFileSync(
      join(dir, 'output/release/release.json'),
      JSON.stringify({ ...artifact, packages: artifacts }),
    );
    return dir;
  };
  const first = checkout('first');
  const damaged = checkout('damaged');
  const damagedPlan = JSON.parse(
    readFileSync(join(damaged, 'output/release/release.json'), 'utf8'),
  );
  damagedPlan.packages[1].integrity = 'sha512-wrong';
  writeFileSync(join(damaged, 'output/release/release.json'), JSON.stringify(damagedPlan));
  assert.throws(
    () => exec(damaged, process.execPath, ['scripts/release.mjs', 'reserve'], environment),
    /checksum mismatch/,
  );
  assert.equal(exec(seed, 'git', ['ls-remote', 'origin', `refs/tags/${plan.tag}`]), '');
  exec(first, process.execPath, ['scripts/release.mjs', 'reserve'], environment);
  const reserved = exec(seed, 'git', ['ls-remote', 'origin', `refs/tags/${plan.tag}`]).split(
    /\s+/,
  )[0];
  assert.match(reserved, /^[a-f0-9]{40}$/);
  const retry = checkout('retry');
  exec(retry, process.execPath, ['scripts/release.mjs', 'reserve'], environment);
  assert.equal(
    exec(seed, 'git', ['ls-remote', 'origin', `refs/tags/${plan.tag}`]).split(/\s+/)[0],
    reserved,
  );
  const main = exec(seed, 'git', ['ls-remote', 'origin', 'refs/heads/main']);
  const stale = checkout('stale', releasePlan([manifest(), manifest(1)], version, 'minor', source));
  assert.throws(
    () => exec(stale, process.execPath, ['scripts/release.mjs', 'reserve'], environment),
    /main advanced/,
  );
  assert.equal(exec(seed, 'git', ['ls-remote', 'origin', 'refs/heads/main']), main);
  const conflictPlan = releasePlan([manifest(), manifest(1)], version, 'minor', source);
  exec(seed, 'git', ['tag', conflictPlan.tag, source]);
  exec(seed, 'git', ['push', 'origin', `refs/tags/${conflictPlan.tag}`]);
  const conflict = checkout('conflict', conflictPlan);
  assert.throws(
    () => exec(conflict, process.execPath, ['scripts/release.mjs', 'reserve'], environment),
    /tag already points to different content/,
  );
  assert.equal(
    exec(seed, 'git', ['ls-remote', 'origin', `refs/tags/${conflictPlan.tag}`]).split(/\s+/)[0],
    source,
  );
  assert.equal(
    readFileSync(join(retry, 'packages/core/package.json'), 'utf8').includes(plan.version),
    true,
  );
});
