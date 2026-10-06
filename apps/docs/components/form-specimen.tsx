'use client';
import { useRef, useState } from 'react';
import { AIForm, Button, resolveVariant } from '@stackunseen/ui';
import type {
  AIArrayChange,
  AIArrayValues,
  AIFieldArray,
  AIFormIdentity,
  AIFormProps,
  AIFormReceipt,
  AIFormSubmission,
  FormValues,
} from '@stackunseen/ui';
import { formFields } from '../lib/coding-fixtures';
import s from './form-specimen.module.css';

export function FormSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const advanced = !['Default', 'Validation', 'Pending', 'Complete', 'Error'].includes(state);
  const multi = ['Multistep', 'Restored draft', 'Live versions', 'Long labels'].includes(state);
  const nextRow = useRef(3);
  const [revision, setRevision] = useState(1);
  const identity: AIFormIdentity | undefined = advanced
    ? { formId: 'deployment', schemaVersion: String(revision), draftVersion: 'draft-1' }
    : undefined;
  const [step, setStep] = useState(state === 'Restored draft' ? 'review' : 'basics');
  const [values, setValues] = useState<FormValues>({
    environment: 'preview',
    ...(advanced ? { name: 'Agent workspace' } : {}),
  });
  const [arrayValues, setArrayValues] = useState<AIArrayValues>({
    reviewers:
      state === 'Empty array'
        ? []
        : state === 'Invalid rows'
          ? [
              { id: 'r1', values: { name: 'Ada' } },
              { id: 'r1', values: { name: 'Grace' } },
            ]
          : state === 'Array limits'
            ? [
                { id: 'r1', values: { name: 'Ada', role: 'reviewer' } },
                { id: 'r2', values: { name: 'Grace', role: 'owner' } },
              ]
            : [{ id: 'r1', values: { name: 'Ada', role: 'reviewer' } }],
  });
  const [status, setStatus] = useState<AIFormProps['status']>(
    state === 'Pending'
      ? 'pending'
      : state === 'Complete'
        ? 'complete'
        : state === 'Error'
          ? 'error'
          : state === 'Denied'
            ? 'denied'
            : state === 'Loading'
              ? 'loading'
              : state === 'Stale'
                ? 'stale'
                : state === 'Unavailable'
                  ? 'unavailable'
                  : 'ready',
  );
  const [receipt, setReceipt] = useState<string | AIFormReceipt | undefined>(
    state === 'Complete' ? 'Saved as synthetic request #42.' : undefined,
  );
  const [request, setRequest] = useState<{ values: FormValues; submission?: AIFormSubmission }>();
  const long = state === 'Long labels';
  const arrays: AIFieldArray[] = advanced
    ? [
        {
          id: 'reviewers',
          label: long
            ? 'Reviewers responsible for checking deployment permissions and evidence provenance'
            : 'Reviewers',
          description: 'Rows and their stable IDs belong to the simulated host.',
          minItems: 1,
          maxItems: state === 'Array limits' ? 2 : 4,
          reorderable: true,
          fields: [
            {
              id: 'name',
              label: long
                ? 'Reviewer name and team responsible for the final deployment review'
                : 'Reviewer name',
              type: 'text',
              required: true,
            },
            {
              id: 'role',
              label: 'Role',
              type: 'select',
              required: true,
              options: [
                { value: 'reviewer', label: 'Reviewer' },
                { value: 'owner', label: 'Owner' },
              ],
            },
            { id: 'notify', label: 'Send a review notification', type: 'checkbox' },
            {
              id: 'channel',
              label: 'Notification channel',
              type: 'text',
              when: { field: 'notify', equals: true },
              description: 'Included only when notifications are selected.',
            },
          ],
        },
      ]
    : [];
  function changeArray(change: AIArrayChange) {
    if (change.identity?.schemaVersion !== identity?.schemaVersion) return;
    const newId = change.type === 'add' ? `r${nextRow.current++}` : '';
    setArrayValues((current) => {
      const rows = current[change.arrayId] ?? [];
      let next = rows;
      if (change.type === 'add') next = [...rows, { id: newId, values: { role: 'reviewer' } }];
      if (change.type === 'remove') next = rows.filter((row) => row.id !== change.rowId);
      if (change.type === 'change')
        next = rows.map((row) =>
          row.id === change.rowId
            ? { ...row, values: { ...row.values, [change.fieldId]: change.value } }
            : row,
        );
      if (change.type === 'move') {
        const row = rows.find((row) => row.id === change.rowId)!;
        const remaining = rows.filter((row) => row.id !== change.rowId);
        next = [...remaining.slice(0, change.toIndex), row, ...remaining.slice(change.toIndex)];
      }
      return { ...current, [change.arrayId]: next };
    });
    onEvent(`Host applied ${change.type} request`);
  }
  return (
    <div data-part="form-fixture" className={s.root}>
      <p>Synthetic host · values and navigation are controlled</p>
      {state === 'Live versions' && (
        <div className={s.controls}>
          <Button
            variant="outline"
            onClick={() => {
              setRevision((value) => value + 1);
              setValues({ name: 'Replacement draft', environment: 'production', replicas: '2' });
              setStep('basics');
              setRequest(undefined);
              if (status === 'pending') setStatus('stale');
              onEvent('Host replaced the immutable form identity');
            }}
          >
            Replace form version
          </Button>
          <Button
            variant="outline"
            onClick={() => setStatus(status === 'denied' ? 'ready' : 'denied')}
          >
            {status === 'denied' ? 'Restore form access' : 'Revoke form access'}
          </Button>
        </div>
      )}
      <AIForm
        variant={resolveVariant('AIForm', presentation)}
        title={
          long
            ? 'Deployment details and review ownership for the agent workspace'
            : 'Deployment details'
        }
        fields={state === 'Invalid schema' ? [...formFields, formFields[0]!] : formFields}
        values={values}
        onValueChange={setValues}
        arrays={arrays}
        arrayValues={arrayValues}
        onArrayChange={changeArray}
        identity={identity}
        steps={
          multi
            ? [
                {
                  id: 'basics',
                  title: 'Deployment',
                  description: 'Describe the project and environment.',
                  fieldIds: formFields.map((field) => field.id),
                },
                {
                  id: 'review',
                  title: long ? 'Review ownership and notification preferences' : 'Review team',
                  fieldIds: ['reviewers'],
                },
              ]
            : undefined
        }
        step={step}
        onStepChange={setStep}
        status={status}
        errors={
          state === 'Validation'
            ? { name: 'Enter a project name.' }
            : state === 'Error'
              ? { _form: 'The synthetic host rejected this request. Correct the values and retry.' }
              : undefined
        }
        receipt={receipt}
        onSubmit={(values, submission) => {
          setRequest({ values, submission });
          setStatus('pending');
          onEvent('Submission requested; waiting for host acknowledgement');
        }}
      />
      {request && status === 'pending' && (
        <Button
          variant="outline"
          onClick={() => {
            if (request.submission?.identity?.schemaVersion !== identity?.schemaVersion) return;
            setReceipt(
              identity
                ? {
                    identity,
                    message: `Synthetic host accepted revision ${revision}.`,
                    submissionId: 'request-42',
                  }
                : 'Synthetic host accepted request #42.',
            );
            setStatus('complete');
            onEvent('Host acknowledged submission');
          }}
        >
          Acknowledge submission
        </Button>
      )}
    </div>
  );
}
