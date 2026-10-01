'use client';
import { useState } from 'react';
import { AlertDialog, Button, Field, Input, Popover, Tooltip } from '@ai-interaction/react';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteOverlaySpecimen({ name, state }: WebsiteSpecimenProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('Component library');
  const [notice, setNotice] = useState('');
  if (name === 'Tooltip')
    return (
      <>
        <Tooltip>
          <Tooltip.Trigger asChild>
            <Button variant="outline">Read-only preview</Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {state === 'Long content'
              ? 'This is a local preview. Its values demonstrate the component API and do not change a published project or save anything to a server.'
              : 'Changes stay in this local example.'}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip>
        <p className="generic-demo-status">
          Hover or focus the button to read its supporting description.
        </p>
      </>
    );
  if (name === 'Popover')
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <Button variant="outline">Project details</Button>
          </Popover.Trigger>
          <Popover.Content
            title="Project details"
            headingLevel={3}
            description="Edit the local sample project."
          >
            {state === 'Form' ? (
              <Field label="Project name">
                <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
              </Field>
            ) : (
              <div>
                {(state === 'Long content' ? Array.from({ length: 12 }) : [0]).map((_, index) => (
                  <p key={index}>
                    Components should remain readable and usable within constrained viewports.
                  </p>
                ))}
              </div>
            )}
            <div className="generic-demo-actions">
              <Popover.Close asChild>
                <Button
                  onClick={() =>
                    setNotice(
                      state === 'Form'
                        ? `Local project name: ${draft}.`
                        : 'Project details reviewed.',
                    )
                  }
                >
                  Done
                </Button>
              </Popover.Close>
            </div>
            <Popover.Arrow />
          </Popover.Content>
        </Popover>
        <p role="status" className="generic-demo-status">
          {notice || 'Open the panel to review its content.'}
        </p>
      </>
    );
  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen} busy={state === 'Pending'}>
        <AlertDialog.Trigger asChild>
          <Button variant="outline">Archive sample project</Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content
          error={
            state === 'Error' ? 'The simulated request failed. Nothing was archived.' : undefined
          }
        >
          <AlertDialog.Title>Archive sample project?</AlertDialog.Title>
          <AlertDialog.Description>
            This example only updates local demonstration state. No project files or services are
            changed.
          </AlertDialog.Description>
          <AlertDialog.Actions>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onAction={() => {
                setNotice('The local sample is marked archived.');
                setOpen(false);
              }}
            >
              {state === 'Pending' ? 'Archiving sample…' : 'Archive sample'}
            </AlertDialog.Action>
          </AlertDialog.Actions>
        </AlertDialog.Content>
      </AlertDialog>
      <p role="status" className="generic-demo-status">
        {notice ||
          (state === 'Pending'
            ? 'A fixed pending example; Cancel remains available.'
            : 'Open the confirmation to try its focus and cancellation behavior.')}
      </p>
    </>
  );
}
