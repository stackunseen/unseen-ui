# DateRangePicker integration handoff

DateRangePicker composes Calendar with the existing controlled themed Popover and Button. Date values/months use Calendar's date-only contract. The integration lead owns exports through optional `@stackunseen/ui/application` and isolated `application.css`; this task adds no dependencies or shared styles.

Export `DateRangePicker` from `date-range-picker.tsx` and `DateRangePickerProps`, `DateRangePickerLabels` from `types.ts`. Shared `DateOnly`, `DateRange` and `DateConstraints` come from Calendar.

Required props are `value`, `month`, `onMonthChange`, `locale`, `open`, `onOpenChange`. `onValueChange` emits intents only; omitting it makes selection read-only. The host updates all three controlled values. Selection does not automatically dismiss the popover. Done requests closure only after the host has supplied a valid complete range; Clear emits `{ start: null, end: null }`. Escape/outside dismissal requests closure through the existing Popover; it returns focus to the trigger after accepted dismissal. Opening focuses the grid's roving day when one is available.

`label`, `description`, `labels`, `calendarLabels`, `triggerIcon`, native root `className`/`style`/ref/ARIA/direction and Calendar's bounds/exclusions/week-start/today/loading/disabled/error props support small customizations. `locale` formats dates; translate action/feedback text with both label maps. The trigger combines the visible label and current range description, including incomplete/invalid states. Loading/error/disabled states cannot produce selections; invalid ranges can emit a Clear request. The host owns retry/business validation/persistence and form submission. There are no hidden inputs or implicit timezone conversions.

```tsx
import { useState } from 'react';
import { DateRangePicker } from '@stackunseen/ui/application';
import type { DateOnly, DateRange } from '@stackunseen/ui/application';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/application.css';

function ReportingPeriod() {
  const [value, setValue] = useState<DateRange>({ start: null, end: null });
  const [month, setMonth] = useState<DateOnly>('2024-02-01');
  const [open, setOpen] = useState(false);
  return (
    <DateRangePicker
      label="Report dates"
      locale="en-US"
      value={value}
      onValueChange={setValue}
      month={month}
      onMonthChange={setMonth}
      open={open}
      onOpenChange={setOpen}
      min="2024-02-01"
      max="2024-05-31"
      disabledDates={['2024-02-23']}
    />
  );
}
```

The example describes the requested public optional entry, which the lead integrates. Stories import source directly. Read Calendar's handoff for keyboard/date rules and [the validation record](../calendar/VALIDATION.md) for actual checks and limitations.
