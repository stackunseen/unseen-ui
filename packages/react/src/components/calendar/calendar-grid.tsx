import type { DateConstraints, DateOnly, DateRange } from './types.js';
import type { getDateFormatters } from './date-only.js';
import type { useCalendarNavigation } from './use-calendar-navigation.js';
import { isUnavailable } from './date-only.js';
import s from './calendar.module.css';

interface CalendarGridProps {
  cells: (DateOnly | null)[];
  format: NonNullable<ReturnType<typeof getDateFormatters>>;
  navigation: ReturnType<typeof useCalendarNavigation>;
  constraints: DateConstraints;
  range: DateRange;
  today?: DateOnly;
  weekStartsOn: number;
  headingId: string;
  descriptionId: string;
  blocked: boolean;
  readOnly: boolean;
  rangeMode: boolean;
  startLabel: string;
  endLabel: string;
  selectedLabel: string;
  onSelect: (date: DateOnly) => void;
}

export function CalendarGrid({
  cells,
  format,
  navigation,
  constraints,
  range,
  today,
  weekStartsOn,
  headingId,
  descriptionId,
  blocked,
  readOnly,
  rangeMode,
  startLabel,
  endLabel,
  selectedLabel,
  onSelect,
}: CalendarGridProps) {
  return (
    <table
      role="grid"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      aria-multiselectable={rangeMode || undefined}
      aria-readonly={readOnly || undefined}
      className={s.grid}
    >
      <thead>
        <tr>
          {Array.from({ length: 7 }, (_, index) => {
            const weekday = format.weekdays[(index + weekStartsOn) % 7]!;
            return (
              <th key={index} scope="col" aria-label={weekday.full}>
                <abbr title={weekday.full}>{weekday.short}</abbr>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }, (_, week) => (
          <tr key={week}>
            {cells.slice(week * 7, week * 7 + 7).map((date, index) => {
              if (!date) return <td key={`empty-${index}`} role="gridcell" aria-hidden="true" />;
              const selected =
                date === range.start ||
                (!!range.start && !!range.end && date >= range.start && date <= range.end);
              const start = rangeMode && date === range.start;
              const end = rangeMode && date === range.end;
              const unavailable = blocked || isUnavailable(date, constraints);
              const suffix = [start && startLabel, end && endLabel, selected && selectedLabel]
                .filter(Boolean)
                .join(', ');
              return (
                <td
                  key={date}
                  role="gridcell"
                  aria-selected={selected}
                  data-in-range={selected || undefined}
                >
                  <button
                    type="button"
                    data-date={date}
                    className={s.day}
                    ref={(button) => {
                      if (button) navigation.buttons.current.set(date, button);
                      else navigation.buttons.current.delete(date);
                    }}
                    disabled={blocked}
                    aria-disabled={unavailable || undefined}
                    aria-current={date === today ? 'date' : undefined}
                    aria-label={`${format.full(date)}${suffix ? `, ${suffix}` : ''}`}
                    tabIndex={date === navigation.tabStop && !blocked ? 0 : -1}
                    data-selected={selected || undefined}
                    data-endpoint={(!rangeMode && selected) || start || end || undefined}
                    onFocus={() => navigation.setFocusedDate(date)}
                    onKeyDown={(event) => {
                      if (!blocked) navigation.navigate(event, date);
                    }}
                    onClick={() => {
                      if (!unavailable && !readOnly) onSelect(date);
                    }}
                  >
                    {format.day(date)}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
