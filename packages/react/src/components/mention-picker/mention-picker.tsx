'use client';
import type { VariantProps } from '../../shared/variants.js';
import type { PickerProps, ReferenceOption } from '../../shared/command-picker/command-picker.js';
import { SearchPicker } from '../../shared/command-picker/command-picker.js';

export type MentionPickerProps = PickerProps<ReferenceOption> & VariantProps<'MentionPicker'>;

export function MentionPicker(props: MentionPickerProps) {
  return <SearchPicker {...props} reference />;
}
