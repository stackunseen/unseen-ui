# MultiSelect

Controlled searchable multiple selection. The integration lead owns the proposed `@stackunseen/ui/application` and `application.css` exports. Until integrated, import `multi-select.tsx` directly for local development.

```tsx
import { useState } from 'react';
import { MultiSelect } from '@stackunseen/ui/application';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/application.css';

function TeamPicker() {
  const [value, setValue] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  return (
    <MultiSelect
      label="Project teams"
      value={value}
      query={query}
      onValueChange={setValue}
      onQueryChange={setQuery}
      options={[
        { value: 'design', label: 'Design' },
        { value: 'engineering', label: 'Engineering' },
      ]}
    />
  );
}
```

`MultiSelectProps<T extends MultiSelectOption>` accepts `value: readonly string[]`, `onValueChange: (value: readonly string[]) => void`, immutable `options`, controlled `query`, `onQueryChange` and a required visible `label`. It shares Combobox's options and optional state/filter/root props. `required` is an ARIA hint; validate controlled selections and serialize them in the host.

Enter or pointer activation toggles an available choice and keeps the popup open. Explicit selected-chip removal buttons work with keyboard or pointer and restore input focus. Values are deduplicated without mutating caller arrays. Removed option details do not silently remove the selected identity. Filtering does not alter selected values. Loading/error hides stale choices but allows search and removal of current selections; whole-control disabled blocks all actions.

Choices and selected chips each render at most 200 items and explain overflow. Remaining selected values are preserved in callbacks and exposed in the accessible count; they can still be toggled through a matching query. This is a bounded list, not a virtualized collection. Host validation owns limits and unavailable selections.

Keyboard behavior matches Combobox: input focus, disabled-option skipping, arrows, Home/End, Enter, Escape and normal Tab navigation. The focused tests and colocated Storybook examples cover selection, removal, controlled rejection, query/state changes, empty results, unavailable selections and disabled behavior. No networking or persistence is included.
