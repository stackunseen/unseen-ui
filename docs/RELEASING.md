# Releasing

Two packages are published together and always share a version: `@stackunseen/ui-core` first, then `@stackunseen/ui`. The workspace root, the docs site and the examples are never published.

## Release a version

Open **Actions → Release packages → Run workflow** on `main`. Enter the version both packages are on now as `expected_version`, then pick a bump:

| Bump | From `0.1.0-alpha.0` | From `1.2.3` |
| --- | --- | --- |
| `prerelease` | `0.1.0-alpha.1` | `1.2.4-alpha.0` |
| `patch` | `0.1.1-alpha.0` | `1.2.4` |
| `minor` | `0.2.0-alpha.0` | `1.3.0` |
| `major` | `1.0.0-alpha.0` | `2.0.0` |
| `promote` | `0.1.0` | not allowed, already stable |

Alpha versions go to npm's `alpha` tag with a GitHub prerelease. Stable versions go to `latest`. While the project is in alpha, `latest` is moved by hand with `npm dist-tag`.

The workflow runs the full check suite (lint, types, tests, build, browser smoke tests, packed-consumer installs, size budgets, Storybook), then packs both packages and checks each archive's file list, exports and hash. After that it pushes the version commit and `v<version>` tag, publishes core, waits until npm serves it, publishes the React package, and creates the GitHub release.

npm scans new versions before serving them, which can take about five minutes, so the publish step waits up to ten minutes per package.

**After a release, run Actions → Deploy site by hand.** The version commit is pushed with the workflow's own token, which doesn't trigger other workflows, so the site's shadcn registry keeps pointing at the old version until you redeploy.

To preview a version change without touching anything:

```sh
pnpm release:plan prerelease 0.1.0-alpha.0
pnpm test:release
```

## If a release fails

Use **Re-run failed jobs** on the same run. If its artifact has expired, re-run all jobs. Don't start a new bump to fix a half-finished release.

Re-runs are safe. A tag or npm version that already exists with the same bytes is reused; different bytes at an existing version stop the run. The workflow never force-pushes, unpublishes or moves a dist-tag backwards.

npm can't publish two packages atomically. If the React package fails after core went out, core stays published, and the re-run checks it and carries on with React.

## One-time setup

This is already done for both packages; it's here for reference.

- Each npm package has a trusted publisher: GitHub Actions, owner `stackunseen`, repository `unseen-ui`, workflow `release.yml`, no environment, with **Allow npm publish** ticked. The workflow publishes with GitHub's OIDC token, so there's no npm token secret.
- The site deploy uses two repository secrets: `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit, limited to one account) and `CLOUDFLARE_ACCOUNT_ID`.
- Branch rules must let the workflow push its version commit and tag. If they don't, the release stops rather than working around them.

A brand-new package can't have a trusted publisher until it exists on npm. For a first publish, either publish core and then React from a logged-in terminal with two-factor authentication, or add a short-lived granular token as the `NPM_TOKEN` secret (the workflow uses it when present). Delete the secret and the token as soon as that release is done.

Versions are published with npm provenance (`--provenance` in `scripts/release.mjs`), so each one on npm links to the commit and workflow run that built it. npm accepts provenance only from a public repository; if the repository is ever made private again, a release fails at publish until the flag is removed.
