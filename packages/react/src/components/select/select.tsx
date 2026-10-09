'use client';
import { useId, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { useFieldControl } from '../field/field.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import selectStyles from './select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
/** A labelled group of options, such as "Stacks" and "Mixes" in one control. */
export interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
}
export type SelectChoice = SelectOption | SelectOptionGroup;
function isGroup(choice: SelectChoice): choice is SelectOptionGroup {
  return 'options' in choice;
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
  /** Immutable choices or groups; replace the array when labels or availability change. */
  options: readonly SelectChoice[];
  /** An inline visible label before the trigger, when the control is not inside a Field. */
  label?: ReactNode;
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
  label,
  placeholder = 'Select an option',
  name,
  required,
  disabled,
  dir,
  onCloseAutoFocus,
  className = '',
  ...props
}: SelectProps) {
  // Inside a Field the trigger takes the field's id, label and description like other controls.
  const field = useFieldControl({ ...props, disabled, required });
  const inlineId = useId();
  const triggerId = field.id ?? (label ? `${inlineId}-trigger` : undefined);
  const labelId = `${inlineId}-label`;
  // Reuse option elements during unrelated host updates; replace the readonly array
  // when labels, availability or choices change. Radix still owns item interaction.
  const optionItems = useMemo(() => {
    const item = (option: SelectOption) => (
      <SelectPrimitive.Item
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        textValue={option.label}
        className={`${s.selectItem} ${selectStyles.option}`}
      >
        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className={`${s.selectIndicator} ${selectStyles.indicator}`}>
          <AIIcon name="check" />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
    return options.map((choice, index) =>
      isGroup(choice) ? (
        <SelectPrimitive.Group key={`group-${index}`} className={selectStyles.group}>
          <SelectPrimitive.Label className={selectStyles.groupLabel}>
            {choice.label}
          </SelectPrimitive.Label>
          {choice.options.map(item)}
        </SelectPrimitive.Group>
      ) : (
        item(choice)
      ),
    );
  }, [options]);
  const control = (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      required={field.required}
      disabled={field.disabled}
      dir={dir}
    >
      <SelectPrimitive.Trigger
        {...props}
        id={triggerId}
        aria-labelledby={field['aria-labelledby'] ?? (label ? labelId : undefined)}
        aria-describedby={field['aria-describedby']}
        aria-invalid={field['aria-invalid']}
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
  if (!label) return control;
  return (
    <div className={selectStyles.inline} data-part="select-inline">
      <label id={labelId} htmlFor={triggerId} className={selectStyles.inlineLabel}>
        {label}
      </label>
      {control}
    </div>
  );
}
