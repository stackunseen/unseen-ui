# Releasing Unseen UI

Use this workflow to publish two public npm packages together: `@stackunseen/ui-core`, then `@stackunseen/ui`. Their versions stay equal, and the GitHub repository remains private. The root workspace, gallery and examples are never published.

Publishing requires a selected license, initial package registration and trusted publisher setup.

## One-time setup

1. Choose the license and add its text as `LICENSE` in both package folders. Set those two manifests to `private: false`; keep other workspaces private. Review the package READMEs and source maps: the current maps include original source, even though GitHub stays private.
2. Confirm CLI identity with `npm whoami --registry=https://registry.npmjs.org`. Browser login alone is insufficient. Complete the first reviewed alpha publication using the account's interactive authentication, core before React. Do not store an npm token in GitHub. Trusted publisher configuration lives in each existing npm package's settings.
3. Approve activation of `.github/workflows/release.yml` and its job permissions: `contents: write` for version commits/tags/GitHub releases, and `id-token: write` for the npm publishing job. Validation has read-only repository access; dependency installation/builds run without write or OIDC permissions.
4. For **each** npm package, add a GitHub trusted publisher with organization/user `stackunseen`, repository `unseen-ui`, workflow filename `release.yml`, and **no environment**. Allow direct `npm publish`. This workflow needs no separate dist-tag management grant, npm secret, paid environment or account-security change.

Repository rules must allow the workflow's version commit and tag writes. If existing protections reject them, the release stops; do not bypass or weaken protections automatically. Keep the GitHub repository private. GitHub-hosted runners, Node 24.13.0 and npm >=11.5.1 are required.

Trusted publishing supports a private source repository. npm provenance does not; publication explicitly disables provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Release a version

Open **Actions → Release packages → Run workflow**, choose **main**, enter the current version of both packages as `expected_version`, and select a bump. Ordinary commits and pull requests never publish.

| Choice | From `0.1.0-alpha.0` | From `1.2.3` |
| --- | --- | --- |
| `prerelease` | `0.1.0-alpha.1` | `1.2.4-alpha.0` |
| `patch` | `0.1.1-alpha.0` | `1.2.4` |
| `minor` | `0.2.0-alpha.0` | `1.3.0` |
| `major` | `1.0.0-alpha.0` | `2.0.0` |
| `promote` | `0.1.0` | Rejected: already stable |

Alpha versions use npm's `alpha` tag and a GitHub prerelease. Stable versions use `latest`. Promotion is an explicit decision; a major bump while in alpha stays alpha.

Preview without changing files:

```sh
pnpm release:plan prerelease 0.1.0-alpha.0
pnpm test:release
```

The workflow validates packages, tests, types, lint, formatting, builds, browser smoke, packed consumers, sizes and Storybook. It packs the exact versioned artifacts and verifies their file allowlist, exports, internal dependency and SHA-512 hashes. It then atomically pushes the version commit and `v<version>` tag, publishes core and confirms it before publishing React, and creates the matching private GitHub release only after both npm artifacts are confirmed.

## Recover a failed release

Use **Re-run failed jobs** on the same workflow run. Re-run all jobs if its retained artifact expired. Do not request another bump to repair a partial publication.

The version commit is deterministic. Existing matching tags and identical npm artifacts are reused; different bytes at an existing version stop the workflow. A stale `expected_version`, an advanced main branch before reservation, an unknown registry result or a conflicting tag also stops it. No force pushes, unpublishing or replacement versions are attempted. A completed retry does not move an older distribution tag backwards.

npm cannot publish two packages atomically. If React fails after core succeeds, core remains public and the reserved Git tag remains. The retry verifies core and continues with React. Publishing/security grants, account login and branch protections still require owner setup; this workflow does not create them.
