'use client';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import selectStyles from './select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends
    VariantProps<'Select'>,
    Omit<
      ComponentProps<typeof SelectPrimitive.Trigger>,
      'value' | 'onChange' | 'children' | 'asChild' | 'dir'
    > {
  value: string;
  onValueChange: (value: string) => void;
  /** Immutable choices; replace the array when labels or availability change. */
  options: readonly SelectOption[];
  placeholder?: string;
  name?: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
  /** Coordinate focus when selecting an option opens another local disclosure. */
  onCloseAutoFocus?: ComponentProps<typeof SelectPrimitive.Content>['onCloseAutoFocus'];
}

export function Select({
  variant = 'outline',
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  name,
  required,
  disabled,
  dir,
  onCloseAutoFocus,
  className = '',
  ...props
}: SelectProps) {
  // Reuse option elements during unrelated host updates; replace the readonly array
  // when labels, availability or choices change. Radix still owns item interaction.
  const optionItems = useMemo(
    () =>
      options.map((option) => (
        <SelectPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          textValue={option.label}
          className={`${s.selectItem} ${selectStyles.option}`}
        >
          <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
          <SelectPrimitive.ItemIndicator
            className={`${s.selectIndicator} ${selectStyles.indicator}`}
          >
            <AIIcon name="check" />
          </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
      )),
    [options],
  );
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      required={required}
      disabled={disabled}
      dir={dir}
    >
      <SelectPrimitive.Trigger
        {...props}
        data-variant={variant}
        className={`${s.selectTrigger} ${selectStyles.trigger} ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <AIIcon name="expand" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <ThemeSurface>
          <SelectPrimitive.Content
            className={s.selectContent}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            onCloseAutoFocus={onCloseAutoFocus}
          >
            <SelectPrimitive.ScrollUpButton className={s.selectScroll}>
              <AIIcon name="collapse" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className={s.selectViewport}>
              {optionItems}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className={s.selectScroll}>
              <AIIcon name="expand" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </ThemeSurface>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
