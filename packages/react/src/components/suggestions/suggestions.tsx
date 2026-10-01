'use client';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function Suggestions({
  variant = 'chips',
  items,
  onSelect,
  mode = 'fill',
  disabled = false,
}: VariantProps<'Suggestions'> & {
  items: string[];
  onSelect: (text: string, mode: 'fill' | 'send') => void;
  mode?: 'fill' | 'send';
  disabled?: boolean;
}) {
  const prompts = items.filter((item) => item.trim().length > 0);
  if (!prompts.length) return null;
  const occurrences = new Map<string, number>();
  return (
    <div
      className={`${s.actions} ${s.suggestions}`}
      data-variant={variant}
      aria-label="Suggested prompts"
      role="group"
    >
      {prompts.map((item) => {
        const occurrence = occurrences.get(item) ?? 0;
        occurrences.set(item, occurrence + 1);
        return (
          <Button
            key={JSON.stringify([item, occurrence])}
            variant="outline"
            disabled={disabled}
            onClick={() => onSelect(item, mode)}
          >
            {item}
            <AIIcon name="external" />
          </Button>
        );
      })}
    </div>
  );
}
