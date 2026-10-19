# Security

## Reporting a vulnerability

Please don't open a public issue for a security problem. Use **Report a vulnerability** on the repository's Security tab, or email stackunseen@gmail.com.

Include the package version, what you did, what happened, and a minimal reproduction if you have one. You should get a reply within a few days.

## Supported versions

Unseen UI is in alpha. Fixes go into the next release only, so upgrade to the latest version on the `alpha` tag before reporting.

## Scope

The packages render data your app passes in and send callbacks back. They don't make network requests, store credentials or run model output. Model and tool content is shown as text or through sanitized renderers (Markdown, Mermaid, the sandboxed web preview). If you can get any of those to run script, load an unsafe URL, or escape the sandbox, that's in scope.

Your server still has to check every action it receives. A component showing "approved" is not authorization.

The demo hosts under `examples/` are local tools, not production servers, and are out of scope.
