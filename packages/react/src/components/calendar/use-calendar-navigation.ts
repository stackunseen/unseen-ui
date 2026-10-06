import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { addDays, addMonths, dateForFormatting, monthStart, sameMonth } from './date-only.js';
import type { DateOnly } from './types.js';

export function useCalendarNavigation(
  month: DateOnly,
  initialDate: DateOnly | null,
  onMonthChange: (month: DateOnly) => void,
  weekStartsOn: number,
  dir?: string,
  min?: DateOnly,
  max?: DateOnly,
) {
  const buttons = useRef(new Map<DateOnly, HTMLButtonElement>());
  const pending = useRef<{ date: DateOnly; source: HTMLButtonElement } | null>(null);
  const [focusedDate, setFocusedDate] = useState<DateOnly | null>(null);
  const tabStop = focusedDate && sameMonth(focusedDate, month) ? focusedDate : initialDate;

  useEffect(() => {
    const request = pending.current;
    if (request && sameMonth(request.date, month)) {
      const target = buttons.current.get(request.date);
      if (target && !target.disabled) {
        const document = target.ownerDocument;
        if (document.activeElement === request.source || document.activeElement === document.body)
          target.focus();
        pending.current = null;
      }
    }
  }, [month, focusedDate]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: DateOnly) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl =
      (dir ??
        event.currentTarget.closest('[dir]')?.getAttribute('dir') ??
        event.currentTarget.ownerDocument.documentElement.dir) === 'rtl';
    const weekday = (dateForFormatting(date).getUTCDay() - weekStartsOn + 7) % 7;
    let next: DateOnly | null;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(date, rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        next = addDays(date, rtl ? -1 : 1);
        break;
      case 'ArrowUp':
        next = addDays(date, -7);
        break;
      case 'ArrowDown':
        next = addDays(date, 7);
        break;
      case 'Home':
        next = addDays(date, -weekday);
        break;
      case 'End':
        next = addDays(date, 6 - weekday);
        break;
      case 'PageUp':
        next = addMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addMonths(date, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (!next) return;
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    if (sameMonth(next, month)) {
      pending.current = null;
      setFocusedDate(next);
      buttons.current.get(next)?.focus();
    } else {
      pending.current = { date: next, source: event.currentTarget };
      onMonthChange(monthStart(next));
    }
  }

  return {
    buttons,
    tabStop,
    navigate,
    setFocusedDate: (date: DateOnly) => {
      pending.current = null;
      setFocusedDate(date);
    },
  };
}
