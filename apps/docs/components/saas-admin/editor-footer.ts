import type { SettingsSaveState } from '@stackunseen/ui/application';

export type FooterProps = {
  state: SettingsSaveState;
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  onReconcile: () => void;
};
