# SaaS admin integration contract

Owned source is limited to this directory and `packages/react/src/components/application-patterns/`.

Optional `@stackunseen/ui/application` should export `PageHeader`, `OrgSwitcher`, `ListToolbar`, `MasterDetail`, `SettingsSaveCancel`, `UnsavedGuard`, and their prop types plus `SettingsSaveState` from `application-patterns.tsx`. Its scoped CSS module must stay in `application.css`, outside the almost-full base CSS budget. No dependencies are added.

`pattern-adapter.ts` now imports the public optional `@stackunseen/ui/application` entry. Existing controls continue using `@stackunseen/ui`. Load optional application CSS in the integrated route wrapper; tests do not import stylesheet entries.

The template entry is the named `SaaSAdmin` export in `saas-admin.tsx`, rendering a client-side connected local workflow. It inherits the site's `AITheme` and does not add a global palette override. The lead owns route/template discovery, export barrels, manifests/build configuration and global validation. It uses h2 page headers beneath the route's h1.

`customer-table-adapter.tsx` now consumes the public DataGrid contract. Rows are filtered, sorted and paged by the local application; its one-based page is adapted to DataGrid's zero-based `pagination.pageIndex`. Customer columns include trusted cells, row headers and native sort requests. No combobox or editable date control is required: filter/role/plan/organization selection uses public Select with explicit accessible names; fixture dates are read-only ISO dates.

Reusable API types remain in `application-patterns.tsx`. `UnsavedGuardProps.returnFocusRef` is an optional React ref to the requesting control, used by this template to restore focus after a triggerless guard closes. No central export changes are needed beyond the lead's existing `UnsavedGuardProps` export.

The current repository handoff records integrated checks and limitations. Internal worker records are retained under `output/unseen-expansion-worker-handoffs/`; no shared source, manifest, lockfile, route, catalog or build file was edited by the SaaS worker.

Outbound thread coordination was attempted with the Codex app tool, but it returned `invalid turn/start params: AbsolutePathBuf deserialized without a base path`. This file provides the concrete handoff contract while work continues.
