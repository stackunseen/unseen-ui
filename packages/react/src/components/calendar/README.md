# Calendar integration handoff

Calendar is a controlled Gregorian date grid. Its job is selecting a date or an inclusive interval, with compact month navigation, explicit selected text and keyboard instructions. The implementation uses existing Button and theme tokens, native table/grid semantics and scoped component CSS. No new dependency or copied reference assets are used.

The supplied [frontend-ui-engineering guidance](https://www.ui-skills.com/skills/addyosmani/frontend-ui-engineering) informed colocation, controlled state, keyboard/focus behavior, token use and explicit unavailable states. `.agents` is absent in this workspace. The repository design system provides the visual baseline; this implementation makes no comparative quality claim.

## API

Export `Calendar` from `calendar.tsx` and `CalendarProps`, `CalendarBaseProps`, `CalendarLabels`, `DateOnly`, `DateRange`, `DateConstraints` from `types.ts`. The integration lead confirmed the optional `@stackunseen/ui/application` and `@stackunseen/ui/application.css` contract. Existing shared/root exports, manifests, build maps, routes and CSS were not edited by this task.

- `DateOnly` is a date-only `YYYY-MM-DD` string; runtime validation requires a real Gregorian date in years 0001–9999. No local date parser, implicit clock, timezone or Date-to-ISO conversion is used. Numeric UTC construction supplies stable calendar arithmetic and Intl formatting with an explicit UTC Gregorian calendar.
- Required `locale` formats month/day/weekday names. Unsupported/invalid locales produce unavailable feedback. Interface text is separately replaceable through `labels`; locale does not translate English action/instruction text. `weekStartsOn` defaults to Monday; hosts can explicitly pass 0–6. Host-supplied `today` is optional.
- Required `month` accepts any valid date in the shown month; required `onMonthChange` requests its new first day. Navigation does not change the month until the host updates it. Month arrows, day/week arrows, Home/End, Page Up/Down and Shift+Page Up/Down are supported. RTL reverses horizontal arrows. Keyboard targets clamp to min/max.
- Single selection: `mode="single"` (or omitted), `value: DateOnly | null`, optional `onValueChange(date)`. Range selection: `mode="range"`, `value: { start: DateOnly | null; end: DateOnly | null }`, optional `onValueChange(range)`. Omit the callback for read-only selection. A completed range starts a new range on the next selection; an earlier second date restarts; the same date can complete a one-day interval.
- Optional inclusive `min`, `max`, `disabledDates` constrain all selected dates. Range validation checks disabled dates inside the interval without iterating every calendar day. Invalid host values/bounds are shown as unavailable and never silently fixed. Selecting across an exclusion shows feedback and emits no range request.
- Disabled dates remain discoverable through arrow navigation with `aria-disabled`; Enter/Space/pointer cannot select them. The grid has one roving tab stop and explicit selected cells/start/end labels. `disabled` blocks all day/month actions; `loading` shows a static skeleton/status; `error` shows host feedback and blocks date/month actions. No selectable date in the current month shows an empty message while navigation toward allowed months remains possible.
- Native root `className`, `style`, ref, direction and ARIA attributes are supported. `previousIcon`/`nextIcon` replace decorative navigation content. Date information is also conveyed by text/ARIA and underlines/borders. CSS adds no shared tokens, motion, fonts or base stylesheet bytes.

## Example

```tsx
import { useState } from 'react';
import { Calendar } from '@stackunseen/ui/application';
import type { DateOnly } from '@stackunseen/ui/application';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/application.css';

function AppointmentDate() {
  const [month, setMonth] = useState<DateOnly>('2024-02-01');
  const [value, setValue] = useState<DateOnly | null>(null);
  return (
    <Calendar
      locale="en-US"
      label="Appointment date"
      month={month}
      onMonthChange={setMonth}
      value={value}
      onValueChange={setValue}
      min="2024-02-01"
      max="2024-05-31"
      disabledDates={['2024-02-23']}
    />
  );
}
```

The public example is the requested integration contract; the optional entry is owned by the integration lead. Colocated stories import source directly and include single/range/loading/empty/error/disabled/locale examples.
