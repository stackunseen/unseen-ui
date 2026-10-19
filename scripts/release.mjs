import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertPublishable,
  inspectArchive,
  packages,
  publishInOrder,
  registry,
  releasePlan,
  repository,
} from './release-lib.mjs';

const output = resolve('output/release');
const planPath = resolve(output, 'release.json');
const manifestPath = (folder) => `packages/${folder}/package.json`;
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const manifests = () => packages.map(({ folder }) => readJson(manifestPath(folder)));

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      `${command} ${args[0]} failed: ${result.stderr || result.error?.message || result.status}`,
    );
  return result.stdout.trim();
}
const git = (...args) => run('git', args);
function pm(args) {
  if (!process.env.npm_execpath) throw new Error('Run packing through pnpm release:pack.');
  return run(process.execPath, [process.env.npm_execpath, ...args]);
}
function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
function assertActions() {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.GITHUB_REPOSITORY !== repository ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
  )
    throw new Error('Remote release operations run only in the manually dispatched main workflow.');
}
function assertClean() {
  if (git('status', '--porcelain')) throw new Error('Release checkout must be clean.');
}
function bumpFiles(version) {
  for (const { folder } of packages) {
    const file = manifestPath(folder);
    const manifest = readJson(file);
    manifest.version = version;
    writeJson(file, manifest);
  }
}
function checkPlan(plan, sourceManifests) {
  const expected = releasePlan(sourceManifests, plan.previous, plan.bump, plan.base);
  for (const [key, value] of Object.entries(expected))
    if (plan[key] !== value) throw new Error(`Release plan mismatch: ${key}`);
  return plan;
}
function readPlanAtSource() {
  const plan = readJson(planPath);
  if (git('rev-parse', 'HEAD') !== plan.base)
    throw new Error('Source commit differs from the validated release.');
  return checkPlan(plan, manifests());
}
function verifyFiles(plan) {
  if (!Array.isArray(plan.packages) || plan.packages.length !== packages.length)
    throw new Error('Both package artifacts are required.');
  for (let i = 0; i < packages.length; i++) {
    const entry = plan.packages[i];
    const pkg = packages[i];
    const filename = `${pkg.name.slice(1).replace('/', '-')}-${plan.version}.tgz`;
    if (
      entry.name !== pkg.name ||
      entry.version !== plan.version ||
      entry.channel !== plan.channel ||
      entry.filename !== filename
    )
      throw new Error('Artifact identity/order mismatch.');
    const current = readJson(manifestPath(pkg.folder));
    if (current.version !== plan.version || current.name !== pkg.name)
      throw new Error('Release manifest differs from the package artifact.');
    const result = inspectArchive(readFileSync(resolve(output, filename)), {
      ...entry,
      license: current.license,
    });
    if (result.integrity !== entry.integrity) throw new Error('Artifact checksum mismatch.');
  }
  return plan;
}
function verifiedArtifacts() {
  const plan = readJson(planPath);
  const before = packages.map(({ folder }) =>
    JSON.parse(git('show', `${plan.base}:${manifestPath(folder)}`)),
  );
  checkPlan(plan, before);
  if (
    git('rev-parse', 'HEAD^') !== plan.base ||
    git('log', '-1', '--format=%s') !== `chore(release): ${plan.tag}`
  )
    throw new Error('Release commit does not match the validated source.');
  if (
    JSON.stringify(
      git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').sort(),
    ) !== JSON.stringify(packages.map(({ folder }) => manifestPath(folder)).sort())
  )
    throw new Error('Release commit must change only the two package versions.');
  return verifyFiles(plan);
}
async function registryRecord(name, version) {
  const response = await fetch(
    `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    {
      signal: AbortSignal.timeout(20_000),
      headers: { accept: 'application/json' },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm read failed (${response.status}); absence is not confirmed.`);
  return response.json();
}
async function github(path, method = 'GET', body) {
  if (!process.env.GH_TOKEN) throw new Error('This job requires its scoped GitHub token.');
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method,
    signal: AbortSignal.timeout(20_000),
    headers: {
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (method === 'GET' && response.status === 404) return null;
  if (!response.ok)
    throw new Error(
      `GitHub ${method} failed (${response.status}); inspect the existing release before retrying.`,
    );
  return response.json();
}

const [command, bump = process.env.RELEASE_BUMP, expected = process.env.RELEASE_EXPECTED_VERSION] =
  process.argv.slice(2);
if (command === 'plan' || command === 'prepare') {
  const source = manifests();
  const plan = releasePlan(source, expected, bump, git('rev-parse', 'HEAD'));
  if (command === 'prepare') {
    assertClean();
    for (let i = 0; i < packages.length; i++)
      assertPublishable(source[i], existsSync(`packages/${packages[i].folder}/LICENSE`));
    bumpFiles(plan.version);
    mkdirSync(output, { recursive: true });
    writeJson(planPath, plan);
    setOutput('version', plan.version);
    setOutput('tag', plan.tag);
  }
  console.log(JSON.stringify(plan, null, 2));
} else if (command === 'pack') {
  const plan = readJson(planPath);
  const entries = [];
  for (const { folder, name } of packages) {
    const filename = `${name.slice(1).replace('/', '-')}-${plan.version}.tgz`;
    console.log(pm(['--dir', `packages/${folder}`, 'pack', '--pack-destination', output]));
    const expectedPackage = { name, version: plan.version, channel: plan.channel, filename };
    entries.push({
      ...expectedPackage,
      ...inspectArchive(readFileSync(resolve(output, filename)), expectedPackage),
    });
  }
  plan.packages = entries;
  writeJson(planPath, plan);
  console.log(`Verified both release archives for ${plan.tag}.`);
} else if (command === 'reserve') {
  assertActions();
  assertClean();
  const plan = readPlanAtSource();
  bumpFiles(plan.version);
  // Validate the retained bytes before reserving any remote commit or tag.
  verifyFiles(plan);
  git('add', '--', ...packages.map(({ folder }) => manifestPath(folder)));
  const tree = git('write-tree');
  const date = git('show', '-s', '--format=%cI', plan.base);
  // The same source, version and tree produce the same commit on every re-run.
  const commit = run(
    'git',
    ['commit-tree', tree, '-p', plan.base, '-m', `chore(release): ${plan.tag}`],
    {
      GIT_AUTHOR_NAME: 'github-actions[bot]',
      GIT_COMMITTER_NAME: 'github-actions[bot]',
      GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    },
  );
  const refs = git('ls-remote', 'origin', 'refs/heads/main', `refs/tags/${plan.tag}`);
  const remote = new Map(
    refs
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(/\s+/).reverse()),
  );
  const tag = remote.get(`refs/tags/${plan.tag}`);
  if (tag && tag !== commit)
    throw new Error('This release tag already points to different content.');
  if (!tag) {
    const main = remote.get('refs/heads/main');
    if (main !== plan.base && main !== commit)
      throw new Error('main advanced during validation. Start again from its current version.');
    git(
      'push',
      '--atomic',
      'origin',
      `${commit}:refs/heads/main`,
      `${commit}:refs/tags/${plan.tag}`,
    );
  }
  setOutput('commit', commit);
  console.log(`Reserved ${plan.tag} at ${commit}.`);
} else if (command === 'publish') {
  assertActions();
  // A granular npm token (NPM_TOKEN secret) is only for the first release of a package;
  // trusted publishing cannot be configured before the package exists. Afterwards remove the
  // secret and the job falls back to OIDC.
  const token = process.env.NPM_TOKEN?.trim() ?? '';
  if (!token) {
    if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
      throw new Error('The publish job needs the approved npm OIDC trust and id-token: write.');
    const npmVersion = run('npm', ['--version']).split('.').map(Number);
    if (
      npmVersion[0] < 11 ||
      (npmVersion[0] === 11 && (npmVersion[1] < 5 || (npmVersion[1] === 5 && npmVersion[2] < 1)))
    )
      throw new Error('Trusted publishing requires npm >=11.5.1.');
  } else console.log('Publishing with the bootstrap npm token instead of OIDC trust.');
  const plan = verifiedArtifacts();
  await publishInOrder(plan.packages, {
    lookup: (entry) => registryRecord(entry.name, entry.version),
    channelVersion: async (entry) => (await registryRecord(entry.name, entry.channel))?.version,
    publish: async (entry) => {
      console.log(`Publishing ${entry.name}@${entry.version} to ${entry.channel}.`);
      // Publish the pnpm-packed archive, with workspace dependencies already resolved.
      console.log(
        run(
          'npm',
          [
            'publish',
            resolve(output, entry.filename),
            '--access',
            'public',
            '--tag',
            entry.channel,
            '--registry',
            registry,
            '--provenance=false',
            '--ignore-scripts',
          ],
          { NODE_AUTH_TOKEN: token, NPM_TOKEN: '', NPM_CONFIG_PROVENANCE: 'false' },
        ),
      );
    },
    // Up to ten minutes per package.
    pause: () => new Promise((resolvePause) => setTimeout(resolvePause, 15_000)),
    confirmAttempts: 41,
  });
  console.log('Both npm versions have the validated artifact integrity.');
} else if (command === 'complete') {
  assertActions();
  const plan = verifiedArtifacts();
  const ref = await github(`git/ref/tags/${plan.tag}`);
  if (ref?.object?.type !== 'commit' || ref.object.sha !== git('rev-parse', 'HEAD'))
    throw new Error('The reserved GitHub tag is missing or changed; no release was created.');
  for (const entry of plan.packages) {
    const record = await registryRecord(entry.name, entry.version);
    if (record?.dist?.integrity !== entry.integrity)
      throw new Error('Both npm artifacts must be confirmed before the GitHub release.');
  }
  const existing = await github(`releases/tags/${plan.tag}`);
  if (existing) {
    if (existing.draft || existing.prerelease !== (plan.channel === 'alpha'))
      throw new Error('Existing GitHub release has different publication settings.');
    console.log(`Existing GitHub release: ${existing.html_url}`);
  } else {
    const latest =
      plan.channel === 'latest' &&
      (await registryRecord(packages[1].name, 'latest'))?.version === plan.version;
    const release = await github('releases', 'POST', {
      tag_name: plan.tag,
      name: plan.tag,
      target_commitish: git('rev-parse', 'HEAD'),
      draft: false,
      prerelease: plan.channel === 'alpha',
      make_latest: latest ? 'true' : 'false',
      body: `Both packages are published at ${plan.version}.\n\n\`npm install @stackunseen/ui@${plan.version}\`\n\nCore: https://www.npmjs.com/package/@stackunseen/ui-core/v/${plan.version}\nReact: https://www.npmjs.com/package/@stackunseen/ui/v/${plan.version}`,
    });
    console.log(`Created GitHub release: ${release.html_url}`);
  }
} else
  throw new Error(
    'Usage: release.mjs plan|prepare [prerelease|patch|minor|major|promote] <expected-version>, or pack|reserve|publish|complete.',
  );
