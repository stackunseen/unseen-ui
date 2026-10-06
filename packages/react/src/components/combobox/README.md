# Combobox

Controlled searchable single selection. The integration lead owns the proposed `@stackunseen/ui/application` and `application.css` exports. Until integrated, import `combobox.tsx` directly for local development.

```tsx
import { useState } from 'react';
import { Combobox } from '@stackunseen/ui/application';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/application.css';

function WorkspacePicker() {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  return (
    <Combobox
      label="Workspace"
      value={value}
      query={query}
      options={[
        { value: 'product', label: 'Product' },
        { value: 'engineering', label: 'Engineering' },
      ]}
      onQueryChange={setQuery}
      onValueChange={(next) => {
        setValue(next);
        setQuery('');
      }}
    />
  );
}
```

`ComboboxProps<T extends ComboboxOption>` accepts `value: string | null`, `onValueChange`, immutable `options`, controlled `query`, `onQueryChange` and a required visible `label`. Options have unique `value`, `label`, optional `description`, `keywords`, `disabled` and `disabledReason`. A disabled reason disables that choice and stays visible. Extra option fields survive in a typed `filterOption` callback.

Optional props: `placeholder`, `description`, `status: 'ready' | 'loading' | 'error'`, `error`, `disabled`, `invalid`, `required` and `filterOption`. Root `className`, `style`, `dir`, event handlers and other native div attributes are supported. `id` identifies the input. `required` is an ARIA hint: validate the selected value in your host; typing a query does not satisfy a selection requirement. No native form serialization is supplied.

The query and selection are independent. Choosing or clearing emits only `onValueChange`; the host can clear the query, retain it or fetch new choices. Missing selected choices retain their identity with an unavailable-details message. Loading/error hides stale choices while leaving search editable. A disabled control blocks search and clear. Option availability governs new selection; the host controls current value validity.

Default filtering matches label, description or keywords, case-insensitively. `filterOption={false}` uses host-filtered choices; a callback supplies custom matching. Rendered matches are bounded to 200 **after filtering**, with a visible limit message. First occurrence wins for duplicate values. No networking, persistence or generated executable content is introduced.

Focus stays in the input. Arrows skip disabled choices, Home/End choose the first/last active option, Enter requests selection, Escape closes and keeps input focus, and Tab closes and advances normally. Composing Enter does not select. Pointer selection, clear, replacement choices and outside focus are covered by the focused tests. The colocated Storybook examples include selected, loading, error, empty, disabled, unavailable-selection and host-filtered states.
