# Unseen UI website

The existing Next.js docs app now exports the Unseen UI by Stack Unseen website. It uses the library's public imports and preserves the component specimens. The source is private and the packages are not published; the website describes local setup accordingly.

## Local preview

Build the packages before the docs consumer:

```powershell
pnpm build:packages
pnpm --filter @ai-interaction/docs build
node apps/docs/scripts/preview.mjs
```

The site-only preview serves `apps/docs/out` at `http://127.0.0.1:4175/`. `PORT` can select another port. It handles slash redirects, saved `?view` / `?component` gallery links and real HTTP404 responses. Saved-link requests read the current generated route map, including after a rebuild. The original root preview script and port4173 are independent.

## Content and routes

- `/`: a component showcase first: eight real components (PromptInput, ApprovalCard, Message, ToolCall, AgentSteps, Field controls, DataTable) on tinted tiles that link to their detail pages, with primary-colour swatches that retheme the whole page; then component search and starter links, the light/dark SaaS admin screenshot and setup links.
- `/components/` and `/components/[slug]/`: all 112 entries across UI components (46), AI components (52), application patterns (6) and marketing blocks (8), with global search, actual specimens, visible usage and props, and stable direct links. Application controls and marketing blocks show their optional import and CSS paths.
- `/docs/`, `/getting-started/`, `/docs/customization/`, `/docs/integration/`: local setup, theming, custom headers and footers, and state/callback examples.
- `/templates/`: Agent Workbench, Coding Studio, SaaS Admin, Marketing and Relay.
- `/templates/saas-admin/`: a local dashboard with customer creation, editing and deletion, members and roles, organization settings and illustrative billing. Draft guards, validation and original receipt recovery keep uncertain saves explicit.
- `/templates/marketing/`: eight reusable marketing blocks composed into a fictional product site. Plan selection and contact draft preparation stay local.
- `/patterns/recoverable-chat/`, `/patterns/action-receipts/`, `/patterns/research-answers/`: working local recipes for original receipt recovery, version-bound approvals and execution effects, and claim-linked research evidence.
- `/patterns/agent-workbench/`: usable full-width account-review template. Sessions, accounts, source inspection, cancellation, review decisions and uncertain receipts run through a synthetic local host.
- `/patterns/coding-studio/`: usable full-width editing/review template. Source edits, file selection, staged changes and version-bound apply receipts are local. Tests, terminal output and assistant tasks are explicit sample simulations; edited source is never evaluated.
- `/templates/relay/`: setup and integration guide for the existing separate React/Vite consumer.
- `/patterns/`, `/customize/`, `/design/`: three focused AI recipes, shared theme controls and design foundations.

The two template URLs retain the established pattern route names. Their pages use the full viewport rather than a component-explorer sidebar. Old query links resolve to these routes. Search and presentation states do not create separate indexable component URLs. Directory collection filters use `?collection=ui|ai|application|marketing`; search uses `?q=...` and remains global when typing. Back, forward and direct query links restore those choices.

The application and marketing components are optional public entries, `@stackunseen/ui/application` and `@stackunseen/ui/marketing`. Each has a separate stylesheet alongside `@stackunseen/ui/styles.css`; neither stylesheet joins the base bundle. Their built controls share the root theme, icons and portal direction. This does not change the package's unpublished status.

Appearance, validated theme JSON and icon preferences can persist in local storage. Workspace records and simulated actions are page-session data. Templates disclose their boundaries in the UI.

The site self-hosts Instrument Sans through `next/font/local`. Its variable Latin font is about 30KB; the SIL Open Font License is in `public/fonts/instrument-sans-OFL.txt`. Reading sizes and responsive headings are defined in `app/typography.css`. Component pages keep one quiet control row (32px selects with inline labels) above a tinted preview stage; the stage has no second border, so component-owned borders are the only frame. The explorer sidebar lists only the catalog sections; Getting Started lives in the main navigation. Internal pages use a compact footer. Component-specific integration notes appear with Usage and props.

Modal has optional `header`, `footer`, `className` and `style` props. Its body scrolls between the header and footer. The customization guide shows a footer submit button connected to a form in the body, plus Card and AlertDialog composition examples. `title` and `description` remain required for accessible naming.

## Production origin and SEO

No production domain is assumed. With `SITE_ORIGIN` absent, pages are `noindex, nofollow`, robots disallows crawling, the sitemap is empty and absolute canonical/social URLs are omitted. This is intentional for the local preview.

Once the purchased domain and preferred HTTPS host are confirmed, set `SITE_ORIGIN` to that exact origin in the build environment. Rebuild the static export. It must contain only the HTTPS origin, without a path, credentials, query or fragment. Localhost origins are rejected. A synthetic `https://site.test` build is used only as verification evidence.

The configured export includes:

- 130 unique content pages, including 112 component details, with titles, descriptions and one semantic H1.

- Absolute canonical, Open Graph and Twitter metadata using the verified origin.
- A generated robots file, sitemap and 1200×630 social image.
- Truthful homepage WebSite structured data, with no review, adoption, FAQ or package-publication claims.

Deploy the **contents of `apps/docs/out`** to a static host that serves directory `index.html` paths and the exported404 page. Preserve `_next` assets and the generated metadata files. Redirect HTTP and alternate hostnames to the chosen HTTPS host. Implement the saved-query redirect mapping in `gallery-routes.json` on the chosen host where possible; the homepage includes a browser fallback. Preserve useful style/state/tab/compare query values and discard the removed preview-width setting.

## Cloudflare Pages

The production site is **https://unseenui.com**. The host is Cloudflare Pages, deployed by `.github/workflows/deploy-site.yml` on pushes to `main` (site, package or lockfile changes) and on manual dispatch. The workflow uses that origin unless a `SITE_ORIGIN` repository variable overrides it, builds the packages and the export, runs `scripts/check-static-site.mjs` against the configured origin, then publishes `apps/docs/out` with `wrangler pages deploy`.

Owner setup, once: create the Pages project `unseenui` (direct upload, no Git integration; a different name goes in the `CLOUDFLARE_PAGES_PROJECT` variable) and set secrets `CLOUDFLARE_API_TOKEN` (Cloudflare Pages edit permission) and `CLOUDFLARE_ACCOUNT_ID`. Attach `unseenui.com` and `www.unseenui.com` as custom domains in the Pages project and point DNS at it.

`public/_headers` marks `/_next/static/*` immutable for a year and adds `nosniff`, referrer and permissions headers to every response. `public/_redirects` documents the `www.unseenui.com` → apex intent, but Pages did not apply the host rule in practice; the authoritative redirect is a zone Redirect Rule (Cloudflare's "Redirect from WWW to root" template, 301). DNS for the zone lives on Cloudflare: CNAME `@` and `www` → `unseenui.pages.dev`, proxied. Pages serves directory indexes, `404.html` and HTTPS without configuration, but its redirects ignore query strings, so legacy `?view=`/`?component=` links rely on the homepage fallback. Deploy from CI only, so the published files always match a commit.

## Verification

```powershell
pnpm --filter @ai-interaction/docs typecheck
pnpm exec eslint apps/docs
node apps/docs/scripts/check-static-site.mjs
# Start the local preview before this command:
node apps/docs/scripts/site-browser-check.mjs
node apps/docs/scripts/check-dialogs.mjs
node apps/docs/scripts/check-textareas.mjs
node apps/docs/scripts/check-discovery.mjs
node apps/docs/scripts/site-performance.mjs
```

The static check validates exported content, unique metadata, origin behavior and local links. The browser check uses the repository's installed Playwright CLI and `scripts/audit-page.js`; it exercises actual keyboard, search, theme and recovery flows and checks responsive light/dark pages. `SITE_PREVIEW_URL` can point it at another authorized local preview. Reports and screenshots go to `output/playwright/unseen-site/`. Automated accessibility checks are scoped evidence, not a full accessibility conformance claim.

See [the task evidence](../../docs/evidence/2026-10-05-unseen-ui-website.md) for commands, artifact identities, failed attempts resolved during implementation and remaining acceptance limits.
