# Inspection components

Experimental controlled components. Import components from `@stackunseen/ui`, types/helpers from `@stackunseen/ui-core`, and optional validators from `@stackunseen/ui-core/schema`. Load the library stylesheet once. Gallery fixtures and `examples/consumer/src/main.tsx` show runnable composition without provider credentials.

| Component | Data and callbacks | Three styles | Critical behavior |
| --- | --- | --- | --- |
| ConnectionStatus | `value: ConnectionInfo`, optional submission/error, `onResume(cursor)`, `onRefresh()` | banner / card / compact | No automatic reconnect. Resume requires disconnected state, compatible recovery, adapter capability and valid public cursor. Pending/acknowledged/unknown submissions block repeat resume. Snapshot refresh stays available for an unknown outcome |
| ModelControls | `value`, `capabilities`, `onValueChange`, status/stale/error, usage, onRefresh | panel / compact / accordion | Host capability metadata controls options. Invalid selections remain visible until explicitly cleared. Loading/stale/missing provenance locks edits. Mode/tool/temperature values are validated independently of structural schema |
| ContextInspector | `value: ContextInspection`, loading/error, onRefresh | list / table / accordion | Distinguishes selected/included, original/included tokens, truncation and exclusions. Revoked/missing/stale inclusion is unverified. Over-limit data is displayed honestly; unknown usage is not a percentage |
| PolicyStatus | `checks: PolicyCheck[]`, classification/loading/error, onRefresh | list / cards / accordion | Pass requires complete current attestation metadata. Unknown/stale remain explicit. This is a display of host evidence, never client-side authorization |

`ObservationTime` uses a deterministic UTC display. These host payloads use ISO timestamps with timezones; invalid calendar dates are rejected. Counts are nonnegative safe integers. Runtime connection is separate from run success and command submission.

Optional `ConnectionInfo.freshness` reports current/stale/unknown projection separately from transport and protocol compatibility. Legacy absence preserves existing behavior. All three ConnectionStatus styles retain snapshot refresh for connected stale/unknown data and unresolved recovery requests when capability/callback exist. Text does not prescribe unavailable snapshot recovery. A connected or resumed transport does not settle an unknown original command; use the separate [adapter](ADAPTERS.md) command record/lookup path.

```tsx
import { ConnectionStatus, ModelControls } from '@stackunseen/ui';
import { modelCapabilitiesSchema, modelSettingsSchema } from '@stackunseen/ui-core/schema';
import { modelSettingsIssues } from '@stackunseen/ui-core';

// At a host boundary, validate unknown data before rendering it.
const capabilities = modelCapabilitiesSchema.parse(capabilitiesPayload);
const settings = modelSettingsSchema.parse(settingsPayload);
const issues = modelSettingsIssues(capabilities, settings);

// Values and callbacks below belong to the application.
<ModelControls capabilities={capabilities} value={settings} onValueChange={setSettings} />;
<ConnectionStatus value={connection} submission={submission}
  onResume={requestResume} onRefresh={requestSnapshot} />;
```

`modelSettingsIssues` diagnoses model-dependent validity; schema success alone does not establish capability support or permission. The snippet expects application-owned payloads and handlers. Policy metadata is not cryptographically verified by the UI.

Optional schema exports: `connectionInfoSchema`, `modelCapabilitiesSchema`, `modelSettingsSchema`, `modelUsageSchema`, `contextInspectionSchema`, `policyCheckSchema`, `policyChecksSchema`. Objects are strict, arrays bounded, IDs unique where required, and model tool references must resolve. Unknown settings IDs are structurally allowed so a changed host capability does not silently erase the user's draft.

Customization uses the common variant registry, theme variables and IconsProvider. Disclosure state and context filtering are local UI state; model settings, policy freshness, permissions and recovery remain controlled. Context tables retain readable columns in a labelled keyboard-scrollable region on narrow screens.

Current limits: synthetic capability/policy/usage data; no discovery transport, billing authority, policy engine or authorization service. Host freshness is supplied, not inferred from a client clock. Client callbacks express requests, and only subsequent authoritative data can show success.
