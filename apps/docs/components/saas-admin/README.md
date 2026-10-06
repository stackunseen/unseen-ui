# Connected local SaaS admin

`SaaSAdmin` is a client template for a dashboard, customer list/detail/create/edit/delete, member roles, organization settings and sample billing. The same saved snapshot drives every screen and both organization scopes. Existing theme, Button, Field, Input, Select, Checkbox, Textarea, Table, Accordion and AlertDialog are reused; the customer list uses the optional public DataGrid.

The container coordinates navigation; `use-admin-workspace.ts` owns draft/submission state; `mock-host.ts` owns immutable records, validation, version checks and exact original action receipts. A draft changes the saved view only after an acknowledged receipt. Rejections preserve drafts. An interrupted receipt blocks further writes/navigation and offers original receipt lookup without replay. A missing original remains explicitly unknown.

Customer fields require bounded names/company, an email and optional notes up to 2,000 characters. The host rejects duplicate emails within an organization and stale edits/deletions. Deletion requires a local confirmation bound to the record version and organization; an acknowledged deletion clears selection and returns focus to the list. Demo roles retain at least one owner. Seat values must be whole numbers, cover the current members and stay at most 50. These are local fixture rules, not security or payment guarantees.

All page/organization/editor navigation passes through the draft guard. The template owns a before-unload guard for unsaved or unresolved work. Guard focus is contained and returns to the requesting control. Internal navigation is local state; URL routing, deep links, durable drafts and authentication are not implemented.

The default host delays saves briefly to expose pending state. The Demo behavior disclosure selects acknowledged, rejected or interrupted-receipt behavior. Fixtures use `.example` addresses and fixed ISO dates, including the sample creation date `2026-10-05`. Everything resets on template reload. No email, payment, account, subscription or permission operation is performed externally.

The integration route should render the template beneath its h1 inside the current `AITheme` and load `@stackunseen/ui/application.css` alongside the base CSS. Optional pattern styles stay outside the base stylesheet budget. All central integration files belong to the lead.

Focused commands from the repository root:

```powershell
pnpm exec vitest run apps/docs/components/saas-admin packages/react/src/components/application-patterns
pnpm --filter @ai-interaction/docs typecheck
pnpm exec eslint apps/docs/components/saas-admin packages/react/src/components/application-patterns
```

The integrated preview is `/templates/saas-admin/` on the local website at port 4175. Build the packages and docs app first, as described in the website guide. Source preview helpers and worker evidence are retained under `output/unseen-expansion-worker-handoffs/`; the current repository handoff records integrated validation and its limits.
