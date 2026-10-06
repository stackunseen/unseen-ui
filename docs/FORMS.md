# Controlled forms and repeatable questions

AIForm is a host-controlled React form with **stacked**, **grid** and **compact** presentations. Reuse the same schema, values and availability state across styles. It renders bounded questions and emits requests; it does not persist drafts, authorize actions, execute generated code or call a server.

Import `AIForm` and its types from `@stackunseen/ui`, plus `@stackunseen/ui/styles.css`. No additional renderer, form engine, Tailwind setup or peer is needed. Custom Select uses the existing Radix primitive; text, number, textarea and checkbox controls retain native input semantics. Scoped colours, borders, field surfaces, density and icons remain configurable.

## Schema and values

`fields: readonly AIField[]` defines flat text/textarea/number/select/checkbox questions. `values: FormValues` is a string/boolean record and `onValueChange(next)` requests a host replacement. Numbers remain strings during editing, allowing empty/incomplete drafts; submission checks finite values and declared bounds. Required, disabled select choices, length, type and conditional visibility are validated. Conditions reference another field in the same scope and require that controlling field to be visible. Unknown references, cycles and wrong condition types are rejected. Model content cannot supply callbacks, executable validators or JSX.

`arrays: readonly AIFieldArray[]` defines repeatable groups with `id`, `label`, `fields`, optional `description`, `minItems`, `maxItems`, top-level `when` and `reorderable`. Row fields may condition on other fields in their own row. Nesting repeatable groups is not supported. `arrayValues: AIArrayValues` maps a group ID to `{id, values}` rows. IDs are stable and unique within the group; position is never identity.

`onArrayChange(request: AIArrayChange)` emits `add`, `remove`, `move` or `change` intents with array/row/field identity and the current form identity. Add requests contain no invented row ID. The host allocates IDs, validates the request and supplies the next immutable row snapshot. No optimistic row mutation occurs inside AIForm. Removal respects minimum count; add respects maximum count; movement is bounded to the visible group. Missing change handling disables array edits and structural actions. Host data outside allowed counts stays correctable within the hard preview bound; invalid/duplicate identities hide controls and disable submission.

## Steps, drafts and validation

`steps: readonly AIFormStep[]` assigns every top-level field and array ID exactly once. Each step has `id`, `title`, optional `description` and `fieldIds`. `step` and `onStepChange(id)` are controlled; there is no authoritative internal step index. A missing selected step remains unavailable. Back preserves host values. Forward/jump validates all earlier steps; final submission validates the entire active schema, including unmounted earlier steps. Inactive fields and arrays are omitted from the payload.

Validation errors are associated with controls through `aria-describedby`/`aria-invalid`, required semantics remain explicit, and invalid submission focuses the first invalid field. If that field is on another step, AIForm requests the step and waits for the host's replacement before focusing. Row errors bind stable IDs and values through reordering. Changed values/schema identity stop showing obsolete local errors. External `errors` and `arrayErrors` remain host-owned; the host must remove errors that no longer match its snapshot.

After acknowledged add/remove, focus moves to the new or adjacent row's first field (or Add when empty), while scope replacement cancels obsolete focus requests. Navigation is an ordered step list rather than a tab widget or fabricated execution progress. Native form Enter advances a nonfinal step; only the final step submits.

Resumption is host data: persist and restore `{identity, values, arrayValues, step}`. The gallery demonstrates an in-memory restored snapshot; it does not prove durable storage, cross-session recovery or server reconciliation. Focus reconciliation is scoped to the current identity; when the host replaces a revision, it owns any broader focus/restoration policy.

## Versioned submission and availability

Repeatable/multistep forms require `identity: {formId, schemaVersion, draftVersion?}`. IDs/versions are nonempty; schema versions describe immutable definitions. Optional draftVersion is the host's revision used for concurrency checks; the component does not invent or increment it. Host replacement invalidates local validation/focus from the earlier identity. Revalidate every request on the server regardless of UI disabled state.

Legacy scalar forms preserve `onSubmit(values)` and string receipts. When identity, steps or at least one array is supplied, `onSubmit(values, submission)` adds `{identity, arrayValues}`. Both records contain only active questions and normalize missing checkbox/text values to false/empty string. Rows retain their original IDs. No array data is flattened into ambiguous string paths.

Advanced `receipt: AIFormReceipt` has `{identity, message, submissionId?}`. `status="complete"` requires a matching form/schema/draft identity to display that receipt and the Submitted label. Missing/mismatched receipts remain unavailable and do not display obsolete messages. String receipts are accepted only by the legacy unversioned confirmation path. A pending submission stays locked until authoritative host state changes; reconnect/retry must not repeat a non-idempotent operation automatically.

| State | Behavior |
| --- | --- |
| ready / error | Editable controlled fields; error permits an explicit corrected submission |
| pending | Visible snapshot, locked edits/navigation/submission; no invented success |
| complete | Read-only snapshot; matching receipt displayed, otherwise receipt unavailable |
| loading | Loading indicator, values hidden |
| denied / stale / unavailable | Values hidden and intents disabled; host supplies any current restoration |

```tsx
<AIForm
  variant="grid"
  identity={{ formId: 'deployment', schemaVersion: '2' }}
  fields={fields}
  values={draft.values}
  onValueChange={requestValues}
  arrays={arrays}
  arrayValues={draft.arrayValues}
  onArrayChange={requestArrayChange}
  steps={steps}
  step={draft.step}
  onStepChange={requestStep}
  onSubmit={(values, submission) => requestSubmission({ values, ...submission })}
  status={host.status}
  receipt={host.receipt}
/>
```

Place application callbacks in a Client Component. [The standalone consumer](../examples/consumer/src/form-example.tsx) compiles this boundary in Vite and Next. It simulates acknowledgement locally; it is not a server implementation.

## Bounds and limits

At most 50 field definitions total, 10 arrays, 20 rows per array, 200 potential instantiated controls and 10 steps. Identifiers have an 80-unit cap and exclude reserved prototype keys. Labels have a 1,000-unit cap, descriptions 2,000; fields retain 10,000 input units and select definitions at most 100 unique options. Overlong host input gets a disclosed bounded preview and fails submission validation; the original prop is not silently modified. Invalid/unknown schemas retain an explicit fallback. This is a closed question vocabulary, not complete JSON Schema, arbitrary nesting, an autosave service or protocol compatibility.
