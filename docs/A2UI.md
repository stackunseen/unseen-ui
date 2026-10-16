# Reading A2UI into GeneratedUI

`@stackunseen/ui-core` can read a stream of [A2UI](https://a2ui.org) protocol v1.0 messages (as published on 2026-10-16) and build the `{ id, version, nodes }` snapshot that GeneratedUI validates and renders. It is a partial, declared mapping: what the basic catalog can express in our vocabulary is mapped, and everything else is reported in `unsupported` with the component or message id and a reason, so the host can show a fallback instead of guessing. Nothing is evaluated: catalog functions are not run, `openUrl` never opens anything, and actions reach the host as ids.

```ts
import { createA2UISession } from '@stackunseen/ui-core';

const session = createA2UISession({ version: '1' });
for await (const line of stream) {
  const state = session.accept(line); // an envelope object or one JSONL line
  render(<GeneratedUI surface={state.surface} state={done ? 'ready' : 'streaming'} forms={seed(state.formValues)} />);
}
```

`mapA2UIStream(messages, options)` maps a whole list or a JSONL string in one call.

## What is read

| A2UI | GeneratedUI |
| --- | --- |
| `createSurface` with optional `components` and `dataModel` | starts the surface; the session maps the first surface created, or the `surfaceId` given in options |
| `updateComponents` | merges components by id and re-maps |
| `updateDataModel` with a JSON Pointer `path` | replaces that part of the data model (null deletes) and re-maps; `/` replaces all |
| `deleteSurface` | `surface` becomes null and `deleted` true |
| `callRendererFunction`, `agentFunctionResponse`, other keys | reported as `message`; function calls stay with the host |
| `version` other than `v1.0` or `1.0` | reported as `version`; no partial reading of older protocols |

| Component | Mapping |
| --- | --- |
| `Text` | `text`; a leading `# heading` inside a container becomes that container's section title |
| `Column`, `Row`, `List`, `Card` | flattened into the parent, or a `section` when they start with a heading (Row sections use the grid layout); list templates `{ path, componentId }` expand per item (up to 100) with relative bindings resolved against the item |
| `Tabs` | one `section` per tab titled by the tab |
| `Button` | an `action` labelled by its Text child, with `actionId` from `action.event.name`; a Button that follows input fields becomes the form's submit |
| `TextField`, `CheckBox`, `ChoicePicker`, `Slider`, `DateTimeInput` | consecutive inputs in one container become one `form`; types map to text, textarea, number, checkbox and select; a `required` check marks the field required; current values from the data model come back in `formValues` keyed by form node id for the host's `forms` prop |
| `Image` | an `image` node with the URL and its description as alt text; GeneratedUI loads it only when the host lists the origin in `imageOrigins`, otherwise it shows the alt text with a notice |
| `Video`, `AudioPlayer` | a `text` node saying the media is not shown, plus its description; reported |
| `Modal` | content shown inline; reported |
| `Icon`, `Divider` | omitted |
| anything else | reported as `component` |

Bindings `{"@path": "/pointer"}` resolve against the data model; relative paths resolve against the current template item. `formatString` interpolates `${/pointer}` placeholders. Any other `@call` is reported and resolves to nothing. Obscured text fields, multiple-selection pickers and date inputs are mapped to the nearest field type and reported.

## What the host still does

Validate the snapshot through GeneratedUI, decide what each `actionId` means, seed `forms` from `formValues` with its own surface and version identity, show `unsupported` entries where they matter, and keep running the transport. The mapping declares the protocol version it reads; a later A2UI version needs a new declaration, not silent acceptance.
