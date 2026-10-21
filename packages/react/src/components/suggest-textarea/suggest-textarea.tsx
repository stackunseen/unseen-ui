'use client';
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import { Textarea } from '../textarea/textarea.js';
import type { TextareaProps } from '../textarea/textarea.js';
import s from '../../shared/styles/styles.module.css';
import css from './suggest-textarea.module.css';

export interface SuggestTextareaProps extends Omit<
  TextareaProps,
  'value' | 'onChange' | 'defaultValue'
> {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Text that would follow the current value, from your completion model. It shows as ghost text
   * at the end; pass undefined or "" when there is none, or when the value changed since you asked.
   */
  suggestion?: string;
  /** Called with the new value after Tab accepts the suggestion. */
  onAccept?: (value: string) => void;
  /** Called when Escape dismisses the suggestion; stop showing it until the text changes. */
  onDismiss?: () => void;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const mirrored = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'boxSizing',
  'textIndent',
] as const;

/**
 * A text area that shows an AI completion as ghost text after the cursor. Tab accepts it and
 * Escape dismisses it; with no suggestion showing, both keys keep their usual behaviour. The host
 * fetches suggestions; this component never calls a model.
 */
export const SuggestTextarea = forwardRef<HTMLTextAreaElement, SuggestTextareaProps>(
  function SuggestTextarea(
    { value, onValueChange, suggestion, onAccept, onDismiss, className = '', ...props },
    forwardedRef,
  ) {
    const ref = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current!);
    const mirror = useRef<HTMLDivElement>(null);
    const hintId = useId();
    const [focused, setFocused] = useState(false);
    const [atEnd, setAtEnd] = useState(true);
    const [style, setStyle] = useState<CSSProperties>({});
    const visible = Boolean(suggestion) && focused && atEnd;

    // Copy the text area's text metrics, so ghost text lines up with what is typed.
    useIsomorphicLayoutEffect(() => {
      const area = ref.current;
      if (!area || typeof getComputedStyle === 'undefined') return;
      const computed = getComputedStyle(area);
      const next: Record<string, string> = {};
      for (const key of mirrored) next[key] = computed[key];
      setStyle(next as CSSProperties);
    }, [className]);

    const trackCaret = () => {
      const area = ref.current;
      if (area)
        setAtEnd(
          area.selectionStart === area.value.length && area.selectionEnd === area.value.length,
        );
    };
    // Accepting moves the caret to the end of the new text.
    const pendingCaret = useRef(false);
    useEffect(() => {
      if (!pendingCaret.current || !ref.current) return;
      pendingCaret.current = false;
      ref.current.setSelectionRange(value.length, value.length);
      setAtEnd(true);
    }, [value]);

    return (
      <div className={css.root} data-part="suggest-textarea" data-suggesting={visible || undefined}>
        <Textarea
          {...props}
          ref={ref}
          value={value}
          className={className}
          aria-describedby={
            [props['aria-describedby'], visible ? hintId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
          onChange={(event) => {
            onValueChange(event.target.value);
            setAtEnd(
              event.target.selectionStart === event.target.value.length &&
                event.target.selectionEnd === event.target.value.length,
            );
          }}
          onSelect={(event) => {
            props.onSelect?.(event);
            trackCaret();
          }}
          // Arrow keys and clicks move the caret; check where it landed.
          onKeyUp={(event) => {
            props.onKeyUp?.(event);
            trackCaret();
          }}
          onClick={(event) => {
            props.onClick?.(event);
            trackCaret();
          }}
          onFocus={(event) => {
            props.onFocus?.(event);
            setFocused(true);
            trackCaret();
          }}
          onBlur={(event) => {
            props.onBlur?.(event);
            setFocused(false);
          }}
          onScroll={(event) => {
            props.onScroll?.(event);
            if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop;
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (event.defaultPrevented || !visible) return;
            if (
              event.key === 'Tab' &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault();
              const next = value + suggestion;
              pendingCaret.current = true;
              onValueChange(next);
              onAccept?.(next);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onDismiss?.();
            }
          }}
        />
        <div ref={mirror} className={css.mirror} style={style} aria-hidden="true">
          <span className={css.typed}>{value}</span>
          {visible && <span className={css.ghost}>{suggestion}</span>}
        </div>
        {visible && (
          <span id={hintId} className={s.srOnly}>
            Suggestion: {suggestion}. Press Tab to accept or Escape to dismiss.
          </span>
        )}
      </div>
    );
  },
);
