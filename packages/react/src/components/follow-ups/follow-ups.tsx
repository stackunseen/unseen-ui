'use client';
import type { ComponentProps } from 'react';
import { Button } from '../button/button.js';
import css from './follow-ups.module.css';

export interface FollowUp {
  id: string;
  /** Short, as an instruction: "Shorter", "Add numbers", "More formal". */
  label: string;
}
export interface FollowUpsProps extends Omit<ComponentProps<'div'>, 'onSelect'> {
  items: readonly FollowUp[];
  /** Called with the chosen item; your app sends the follow-up and shows what it did. */
  onSelect: (item: FollowUp) => void;
  /** Printed before the chips; "Then" by default. */
  lead?: string;
  /** Names the group for assistive technology. */
  label?: string;
  disabled?: boolean;
}

/**
 * Short next steps after a response, as chips with a lead word. Picking one only asks; the
 * application sends it and renders the result.
 */
export function FollowUps({
  items,
  onSelect,
  lead = 'Then',
  label = 'Follow-up actions',
  disabled = false,
  className = '',
  ...props
}: FollowUpsProps) {
  const chips = items.filter((item) => item.label.trim().length > 0);
  if (!chips.length) return null;
  return (
    <div
      {...props}
      role="group"
      aria-label={label}
      data-part="follow-ups"
      className={`${css.root} ${className}`}
    >
      {lead && <span className={css.lead}>{lead}</span>}
      {chips.map((item) => (
        <Button
          key={item.id}
          size="sm"
          variant="outline"
          disabled={disabled}
          className={css.chip}
          onClick={() => onSelect(item)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
