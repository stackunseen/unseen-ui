import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const repository = 'stackunseen/unseen-ui';
export const registry = 'https://registry.npmjs.org';
export const packages = [
  { folder: 'core', name: '@stackunseen/ui-core' },
  { folder: 'react', name: '@stackunseen/ui' },
];

export function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-alpha\.(0|[1-9]\d*))?$/.exec(value);
  if (!match) throw new Error(`Unsupported release version: ${value}`);
  const parts = match.slice(1).map((part) => (part === undefined ? null : Number(part)));
  if (parts.some((part) => part !== null && !Number.isSafeInteger(part)))
    throw new Error('Release version exceeds the safe integer range.');
  return parts;
}

export function nextVersion(current, bump) {
  let [major, minor, patch, alpha] = parseVersion(current);
  if (bump === 'promote') {
    if (alpha === null) throw new Error('Only an alpha version can be promoted.');
    alpha = null;
  } else if (bump === 'prerelease') {
    if (alpha === null) {
      patch++;
      alpha = 0;
    } else alpha++;
  } else if (bump === 'major') {
    major++;
    minor = 0;
    patch = 0;
    if (alpha !== null) alpha = 0;
  } else if (bump === 'minor') {
    minor++;
    patch = 0;
    if (alpha !== null) alpha = 0;
  } else if (bump === 'patch') {
    patch++;
    if (alpha !== null) alpha = 0;
  } else throw new Error(`Unknown release bump: ${bump}`);
  const version = `${major}.${minor}.${patch}${alpha === null ? '' : `-alpha.${alpha}`}`;
  parseVersion(version);
  return version;
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  if (a[3] === b[3]) return 0;
  if (a[3] === null) return 1;
  if (b[3] === null) return -1;
  return Math.sign(a[3] - b[3]);
}

export function releasePlan(manifests, expected, bump, base) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('A full source commit is required.');
  parseVersion(expected);
  for (let i = 0; i < packages.length; i++) {
    if (manifests[i].name !== packages[i].name || manifests[i].version !== expected)
      throw new Error(
        'Package names/versions do not match the selected release. Refresh expected_version.',
      );
  }
  if (manifests[1].dependencies?.[packages[0].name] !== 'workspace:*')
    throw new Error('React must depend on the exact packed core version through workspace:*.');
  const version = nextVersion(expected, bump);
  return {
    schema: 1,
    repository,
    base,
    previous: expected,
    bump,
    version,
    tag: `v${version}`,
    channel: version.includes('-') ? 'alpha' : 'latest',
  };
}

export function assertPublishable(manifest, licensePresent) {
  if (
    manifest.private !== false ||
    !manifest.license ||
    manifest.license === 'UNLICENSED' ||
    !licensePresent
  )
    throw new Error(
      `${manifest.name}: select a license, include LICENSE, and explicitly set private: false before release.`,
    );
  if (manifest.repository?.url !== `git+https://github.com/${repository}.git`)
    throw new Error('Package repository must match the npm trusted publisher.');
}

export function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

// Read bounded regular tar entries without extracting anything to the filesystem.
// Unexpected extensions/links fail closed rather than broadening the release allowlist.
export function inspectArchive(bytes, expected) {
  const tar = gunzipSync(bytes, { maxOutputLength: 32 * 1024 * 1024 });
  const files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, end) => header.subarray(start, end).toString().split('\0')[0];
    const name = [field(345, 500), field(0, 100)].filter(Boolean).join('/');
    const sizeText = field(124, 136).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('Invalid tar size.');
    const size = parseInt(sizeText, 8);
    if (offset + 512 + size > tar.length) throw new Error('Truncated package archive.');
    const type = field(156, 157);
    if (type !== '' && type !== '0') throw new Error(`Unsupported archive entry: ${name}`);
    if (
      !/^package\/(?:dist\/.+|README\.md|package\.json|LICENSE(?:\.md|\.txt)?)$/.test(name) ||
      name.split('/').some((part) => part === '..' || part === '.') ||
      name.includes('\\') ||
      files.has(name)
    )
      throw new Error(`Unexpected package file: ${name}`);
    files.set(name, tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  const manifest = JSON.parse(files.get('package/package.json')?.toString() ?? '{}');
  if (manifest.name !== expected.name || manifest.version !== expected.version)
    throw new Error('Packed name/version does not match the release.');
  if (expected.license !== undefined && manifest.license !== expected.license)
    throw new Error('Packed license differs from the reviewed package manifest.');
  assertPublishable(
    manifest,
    [...files.keys()].some((name) => /^package\/LICENSE(?:\.md|\.txt)?$/.test(name)),
  );
  if (
    manifest.name === packages[1].name &&
    manifest.dependencies?.[packages[0].name] !== expected.version
  )
    throw new Error('Packed React dependency does not match core.');
  for (const value of Object.values(manifest.exports ?? {})) {
    for (const target of typeof value === 'string' ? [value] : Object.values(value)) {
      if (
        typeof target !== 'string' ||
        !target.startsWith('./dist/') ||
        !files.has(`package/${target.slice(2)}`)
      )
        throw new Error(`Missing or invalid exported file: ${target}`);
    }
  }
  if (!files.has('package/README.md') || !Object.keys(manifest.exports ?? {}).length)
    throw new Error('Package README and exports are required.');
  return { files: files.size, integrity: integrity(bytes) };
}

export function assertRegistryMatch(record, expected) {
  if (
    record &&
    (record.name !== expected.name ||
      record.version !== expected.version ||
      record.dist?.integrity !== expected.integrity)
  )
    throw new Error(
      `Published bytes differ for ${expected.name}@${expected.version}; never overwrite or unpublish them.`,
    );
}

export async function publishInOrder(entries, { lookup, channelVersion, publish, pause }) {
  // Check both versions before making any mutation, including on retries.
  const existing = await Promise.all(entries.map((entry) => lookup(entry)));
  for (let i = 0; i < entries.length; i++) {
    assertRegistryMatch(existing[i], entries[i]);
    const channel = await channelVersion(entries[i]);
    if (!existing[i] && channel && compareVersions(channel, entries[i].version) > 0)
      throw new Error(`Refusing to move ${entries[i].channel} backwards for ${entries[i].name}.`);
  }
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (existing[i]) continue;
    let failure;
    try {
      await publish(entry);
    } catch (error) {
      failure = error;
    }
    let confirmed = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const record = await lookup(entry);
      assertRegistryMatch(record, entry);
      if (record) {
        confirmed = true;
        break;
      }
      if (attempt < 5) await pause();
    }
    if (!confirmed)
      throw new Error(
        `Publication not confirmed for ${entry.name}. Re-run this same workflow; do not bump again. ${failure?.message ?? ''}`,
      );
  }
}
