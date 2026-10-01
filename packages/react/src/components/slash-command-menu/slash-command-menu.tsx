'use client';
import type { VariantProps } from '../../shared/variants.js';
import type { PickerProps, CommandOption } from '../../shared/command-picker/command-picker.js';
import { SearchPicker } from '../../shared/command-picker/command-picker.js';

export type SlashCommandMenuProps = PickerProps<CommandOption> & VariantProps<'SlashCommandMenu'>;

export function SlashCommandMenu(props: SlashCommandMenuProps) {
  return <SearchPicker {...props} />;
}
