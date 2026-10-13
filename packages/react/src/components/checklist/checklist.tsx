'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { CopyButton } from '../copy-button/copy-button.js';
import { Progress } from '../progress/progress.js';
import s from './checklist.module.css';

export interface ChecklistItem {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  eyebrow?: ReactNode;
  /** Consecutive items with the same group sit under one heading. */
  group?: string;
}

export interface ChecklistActions {
  /** Offered when every title is plain text. */
  copyMarkdown?: boolean;
  reset?: boolean;
}

export interface ChecklistProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  items: readonly ChecklistItem[];
  /** Names the list and heads the Markdown export. */
  label: string;
  /** The checked ids. */
  value: readonly string[];
  onValueChange: (ids: string[]) => void;
  ordered?: boolean;
  /** Clicking anywhere on a row ticks it, except on links, buttons, labels and the box itself. */
  rowToggle?: boolean;
  showProgress?: boolean;
  actions?: ChecklistActions;
  headingLevel?: 2 | 3 | 4;
}

/** The list as Markdown task lines with the group headings, for a review doc or a ticket. */
export function checklistToMarkdown(
  label: string,
  items: readonly ChecklistItem[],
  checked: readonly string[],
): string {
  const lines: string[] = [`# ${label}`, ''];
  items.forEach((item, index) => {
    if (item.group && item.group !== items[index - 1]?.group) {
      if (lines[lines.length - 1] !== '') lines.push('');
      lines.push(`## ${item.group}`, '');
    }
    lines.push(`- [${checked.includes(item.id) ? 'x' : ' '}] ${String(item.title)}`);
    if (typeof item.detail === 'string') lines.push(`  ${item.detail}`);
  });
  return `${lines.join('\n').trim()}\n`;
}

interface Segment {
  group?: string;
  start: number;
  items: ChecklistItem[];
}
function segments(items: readonly ChecklistItem[]): Segment[] {
  const out: Segment[] = [];
  items.forEach((item, index) => {
    const last = out[out.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else out.push({ group: item.group, start: index + 1, items: [item] });
  });
  return out;
}

/**
 * A tick-off list whose state the host owns. Progress sits at the top, consecutive items
 * with the same group share a heading, Reset offers Undo, and plain-text lists can be
 * copied as Markdown. Persistence is the host's choice; see useStoredChecklist.
 */
export function Checklist({
  items,
  label,
  value,
  onValueChange,
  ordered = true,
  rowToggle = false,
  showProgress = true,
  actions,
  headingLevel = 3,
  className = '',
  ...props
}: ChecklistProps) {
  const id = useId();
  const done = items.filter((item) => value.includes(item.id)).length;
  const plain = items.every((item) => typeof item.title === 'string');
  const [undo, setUndo] = useState<string[] | null>(null);
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = (message: string) => {
    clearTimeout(timer.current);
    setStatus(message);
    timer.current = setTimeout(() => setStatus(''), 4000);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const toggle = (itemId: string, checked: boolean) => {
    setUndo(null);
    onValueChange(
      checked ? [...new Set([...value, itemId])] : value.filter((entry) => entry !== itemId),
    );
  };
  const rowClick = (item: ChecklistItem) => (event: MouseEvent<HTMLLIElement>) => {
    if ((event.target as HTMLElement).closest('a, button, input, label')) return;
    toggle(item.id, !value.includes(item.id));
  };
  const List = ordered ? 'ol' : 'ul';
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const renderItems = (segment: Segment) => (
    <List className={s.list} start={ordered ? segment.start : undefined}>
      {segment.items.map((item) => {
        const checked = value.includes(item.id);
        const titleId = `${id}-${item.id}`;
        return (
          <li
            key={item.id}
            className={s.row}
            data-done={checked || undefined}
            data-row-toggle={rowToggle || undefined}
            onClick={rowToggle ? rowClick(item) : undefined}
          >
            <span className={s.check}>
              <Checkbox
                checked={checked}
                aria-labelledby={titleId}
                onCheckedChange={(next) => toggle(item.id, next)}
              />
            </span>
            <div className={s.body}>
              {item.eyebrow && <p className={s.eyebrow}>{item.eyebrow}</p>}
              <p id={titleId} className={s.title}>
                {item.title}
              </p>
              {item.detail && <p className={s.detail}>{item.detail}</p>}
            </div>
          </li>
        );
      })}
    </List>
  );
  return (
    <div {...props} className={`${s.root} ${className}`} data-part="checklist">
      <div className={s.head}>
        {showProgress && (
          <Progress
            label={`${label} progress`}
            labelVisibility="hidden"
            value={done}
            max={Math.max(items.length, 1)}
            valueText={`${done} of ${items.length}`}
          />
        )}
        {(actions?.copyMarkdown || actions?.reset) && (
          <div className={s.actions}>
            {actions.copyMarkdown && plain && (
              <CopyButton
                value={checklistToMarkdown(label, items, value)}
                label="Copy as Markdown"
                copiedLabel="Copied as Markdown"
                failedLabel="Copy is blocked in this browser. Select the list and copy it instead."
                variant="ghost"
                size="sm"
              />
            )}
            {actions.reset && done > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUndo([...value]);
                  onValueChange([]);
                  say('Progress cleared');
                }}
              >
                Reset
              </Button>
            )}
            {actions.reset && undo && done === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onValueChange(undo);
                  setUndo(null);
                  say('Progress restored');
                }}
              >
                Undo
              </Button>
            )}
            <span role="status" className={s.status}>
              {status}
            </span>
          </div>
        )}
      </div>
      {segments(items).map((segment) =>
        segment.group ? (
          <section
            key={`${segment.group}-${segment.start}`}
            aria-labelledby={`${id}-group-${segment.start}`}
            className={s.group}
          >
            <div className={s.groupHead}>
              <Heading id={`${id}-group-${segment.start}`} className={s.groupTitle}>
                {segment.group}
              </Heading>
              <span className={s.groupCount}>
                {segment.items.filter((item) => value.includes(item.id)).length} /{' '}
                {segment.items.length}
              </span>
            </div>
            {renderItems(segment)}
          </section>
        ) : (
          <div key={`plain-${segment.start}`}>{renderItems(segment)}</div>
        ),
      )}
    </div>
  );
}
