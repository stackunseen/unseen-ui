'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CommandOption } from '../../shared/command-picker/command-picker.js';
import c from '../../shared/styles/agent-controls.module.css';
import css from './composer-suggestions.module.css';

export type ComposerTrigger = { kind: '/' | '@'; start: number; end: number; query: string };

/** What is being typed at the caret: "/word" at the start of the message, or "@word" after a space. */
export function findTrigger(
  value: string,
  caret: number,
  allow: { commands: boolean; mentions: boolean },
): ComposerTrigger | undefined {
  const before = value.slice(0, caret);
  const slash = allow.commands ? /^\/([^\s/]*)$/.exec(before) : null;
  if (slash) return { kind: '/', start: 0, end: caret, query: slash[1]! };
  const at = allow.mentions ? /(?:^|\s)@([^\s@]*)$/.exec(before) : null;
  if (at) return { kind: '@', start: caret - at[1]!.length - 1, end: caret, query: at[1]! };
  return undefined;
}

function matches(option: CommandOption, query: string) {
  const q = query.toLowerCase();
  if (!q) return true;
  return [option.label, option.description, ...(option.keywords ?? [])].some((text) =>
    text.toLowerCase().includes(q),
  );
}

/**
 * The "/" command and "@" mention list for a composer: which trigger is active, the filtered
 * options, keyboard handling, and what to insert when one is chosen.
 */
export function useComposerSuggestions({
  id,
  value,
  onValueChange,
  input,
  commands,
  onCommand,
  mentions,
  onMention,
  onMentionQueryChange,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  input: React.RefObject<HTMLTextAreaElement | null>;
  commands?: readonly CommandOption[];
  onCommand?: (command: CommandOption, value: string) => void;
  mentions?: readonly CommandOption[];
  onMention?: (item: CommandOption) => void;
  onMentionQueryChange?: (query: string | null) => void;
}) {
  const [trigger, setTrigger] = useState<ComposerTrigger>();
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string>();
  const caretAfter = useRef<number | undefined>(undefined);
  const allow = { commands: Boolean(commands?.length), mentions: Boolean(mentions) };

  const read = () => {
    const area = input.current;
    if (!area || area.selectionStart !== area.selectionEnd) return setTrigger(undefined);
    setTrigger(findTrigger(area.value, area.selectionStart, allow));
  };

  const key = trigger ? `${trigger.kind}${trigger.start}` : undefined;
  const open = Boolean(trigger) && key !== dismissed;
  const options = useMemo(() => {
    if (!trigger) return [];
    const source = trigger.kind === '/' ? (commands ?? []) : (mentions ?? []);
    return source.filter((option) => matches(option, trigger.query)).slice(0, 8);
  }, [trigger, commands, mentions]);
  const shown = open && options.length > 0;

  useEffect(() => setActive(0), [trigger?.kind, trigger?.query]);
  const mentionQuery = trigger?.kind === '@' && open ? trigger.query : null;
  useEffect(() => onMentionQueryChange?.(mentionQuery), [mentionQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  // After an insertion, put the caret after it once the host has applied the new value.
  useEffect(() => {
    if (caretAfter.current === undefined || !input.current) return;
    input.current.setSelectionRange(caretAfter.current, caretAfter.current);
    caretAfter.current = undefined;
    read();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (option: CommandOption) => {
    if (!trigger || option.disabledReason) return;
    if (trigger.kind === '/') {
      const next = value.slice(0, trigger.start) + value.slice(trigger.end).replace(/^\s+/, '');
      caretAfter.current = trigger.start;
      onValueChange(next);
      // The message without "/word", so the host can build on it before its state updates.
      onCommand?.(option, next);
    } else {
      const inserted = `@${option.label} `;
      const next = value.slice(0, trigger.start) + inserted + value.slice(trigger.end);
      caretAfter.current = trigger.start + inserted.length;
      onValueChange(next);
      onMention?.(option);
    }
    setTrigger(undefined);
  };

  /** Returns true when the key was used by the list, so the composer must not act on it. */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shown) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
      return true;
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault();
      choose(options[active]!);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDismissed(key);
      return true;
    }
    return false;
  };

  const listId = `${id}-suggestions`;
  const optionId = (index: number) => `${listId}-${index}`;
  const textareaProps = {
    'aria-autocomplete': allow.commands || allow.mentions ? ('list' as const) : undefined,
    'aria-controls': shown ? listId : undefined,
    'aria-activedescendant': shown ? optionId(active) : undefined,
  };

  const list = shown ? (
    <div className={css.list} data-part="composer-suggestions">
      <ul
        id={listId}
        role="listbox"
        aria-label={trigger!.kind === '/' ? 'Commands' : 'Mentions'}
        className={c.commandList}
      >
        {options.map((option, index) => (
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            aria-disabled={option.disabledReason ? true : undefined}
            data-selected={index === active}
            className={c.commandItem}
            // Keep focus in the composer while choosing with the mouse.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(option)}
          >
            <span>
              <strong>
                {trigger!.kind}
                {option.label}
              </strong>
              <small className={c.muted}>{option.disabledReason ?? option.description}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  // Announced once per open list, not on every keystroke inside it.
  const announcement = shown
    ? `${options.length} ${trigger!.kind === '/' ? 'command' : 'suggestion'}${options.length === 1 ? '' : 's'}. Up and down to choose, Enter to pick, Escape to close.`
    : '';

  return { read, onKeyDown, textareaProps, list, announcement };
}
