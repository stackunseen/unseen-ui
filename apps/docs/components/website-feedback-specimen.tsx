'use client';
import { useState } from 'react';
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Progress,
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@ai-interaction/react';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteFeedbackSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [notice, setNotice] = useState('');
  const [steps, setSteps] = useState(state === 'Complete' ? 10 : 3);
  const [open, setOpen] = useState(false);
  const [reverted, setReverted] = useState(false);
  if (name === 'Alert') {
    const tone =
      state === 'Success'
        ? 'success'
        : state === 'Warning'
          ? 'warning'
          : state === 'Error'
            ? 'danger'
            : 'info';
    return (
      <>
        <Alert tone={tone}>
          <AlertTitle>
            {state === 'Error'
              ? 'Sample connection unavailable'
              : state === 'Warning'
                ? 'Unsaved sample changes'
                : state === 'Success'
                  ? 'Example of a completed update'
                  : 'Preview environment'}
          </AlertTitle>
          <AlertDescription>
            {state === 'Error'
              ? 'This fixed error example does not represent a live request.'
              : state === 'Success'
                ? 'Use this state only after your application confirms completion.'
                : 'Changes here affect the local example only.'}
          </AlertDescription>
          {state === 'With action' && (
            <AlertActions>
              <Button
                variant="outline"
                onClick={() => setNotice('Preview details requested for this local example.')}
              >
                View details
              </Button>
            </AlertActions>
          )}
        </Alert>
        {notice && <p role="status">{notice}</p>}
      </>
    );
  }
  if (name === 'EmptyState' && notice)
    return (
      <div>
        <h3>Projects</h3>
        <ul>
          <li>Sample project</li>
        </ul>
        <p role="status">{notice}</p>
      </div>
    );
  if (name === 'EmptyState')
    return (
      <>
        <EmptyState>
          <EmptyStateTitle>
            {state === 'No results' ? 'No matching projects' : 'No projects yet'}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {state === 'No results'
              ? 'Try a broader search or remove a filter.'
              : 'Add a project to start your collection.'}
          </EmptyStateDescription>
          {state === 'With action' && (
            <EmptyStateActions>
              <Button onClick={() => setNotice('A sample project was added locally.')}>
                Add sample project
              </Button>
            </EmptyStateActions>
          )}
        </EmptyState>
        {notice && <p role="status">{notice}</p>}
      </>
    );
  if (name === 'Progress')
    return (
      <>
        <Progress
          label="Sample steps completed"
          value={state === 'Indeterminate' ? null : steps}
          max={10}
          valueText={state === 'Indeterminate' ? undefined : `${steps} of 10 sample steps`}
        />
        <p className="generic-demo-status">
          {state === 'Indeterminate'
            ? 'The amount of remaining work is unknown.'
            : `${steps} of 10 local sample steps completed.`}
        </p>
        {state !== 'Indeterminate' && (
          <Button
            variant="outline"
            disabled={steps === 10}
            onClick={() => setSteps((value) => Math.min(value + 1, 10))}
          >
            Complete one sample step
          </Button>
        )}
      </>
    );
  return (
    <ToastProvider>
      <div className="generic-action-row">
        <Button
          variant="outline"
          onClick={() => {
            setReverted(false);
            setOpen(true);
          }}
        >
          Show notification
        </Button>
        {state === 'With action' && (
          <Button
            variant="ghost"
            disabled={reverted}
            onClick={() => {
              setReverted(true);
              setOpen(false);
            }}
          >
            Undo sample change
          </Button>
        )}
      </div>
      <p className="generic-demo-status">
        {reverted
          ? 'The sample change was undone locally.'
          : 'Notifications dismiss after 10 seconds; focus or hover pauses the timer.'}
      </p>
      <Toast open={open} onOpenChange={setOpen} tone={state === 'Error' ? 'danger' : 'neutral'}>
        <ToastTitle>
          {state === 'Error' ? 'Sample request failed' : 'Local sample updated'}
        </ToastTitle>
        <ToastDescription>
          {state === 'Error'
            ? 'This is a simulated error. No network request was made.'
            : 'This notification describes a local demonstration only.'}
        </ToastDescription>
        {state === 'With action' && (
          <ToastAction
            altText="Use the Undo sample change button beside Show notification."
            onClick={() => setReverted(true)}
          >
            Undo
          </ToastAction>
        )}
        <ToastClose />
      </Toast>
      <ToastViewport
        portal={false}
        style={{
          position: 'relative',
          inset: 'auto',
          width: '100%',
          maxHeight: 320,
          marginTop: 16,
        }}
      />
    </ToastProvider>
  );
}
