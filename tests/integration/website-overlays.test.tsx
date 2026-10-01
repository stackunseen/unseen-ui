import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AITheme } from '../../packages/react/src/providers/theme/theme-provider.js';
import { AlertDialog } from '../../packages/react/src/components/alert-dialog/alert-dialog.js';
import { Popover } from '../../packages/react/src/components/popover/popover.js';
import { Tooltip } from '../../packages/react/src/components/tooltip/tooltip.js';

it('renders overlay triggers on the server without portal/document access', () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <AITheme>
        <Popover open={open} onOpenChange={setOpen}>
          <Popover.Trigger>Preferences</Popover.Trigger>
          <Popover.Content title="Preferences">Body</Popover.Content>
        </Popover>
        <Tooltip>
          <Tooltip.Trigger>Help</Tooltip.Trigger>
          <Tooltip.Content>More detail</Tooltip.Content>
        </Tooltip>
        <AlertDialog>
          <AlertDialog.Trigger>Remove</AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Confirm</AlertDialog.Title>
            <AlertDialog.Description>Remove item?</AlertDialog.Description>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          </AlertDialog.Content>
        </AlertDialog>
      </AITheme>
    );
  }
  expect(renderToString(<Host />)).toContain('Preferences');
  expect(renderToString(<Host />)).not.toContain('role="dialog"');
});
