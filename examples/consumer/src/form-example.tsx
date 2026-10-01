'use client';
import { useRef, useState } from 'react';
import { AIForm } from '@ai-interaction/react';
import type {
  AIArrayChange,
  AIArrayValues,
  AIField,
  AIFieldArray,
  AIFormIdentity,
  AIFormReceipt,
  AIFormStep,
  FormValues,
} from '@ai-interaction/react';
const identity: AIFormIdentity = { formId: 'consumer-request', schemaVersion: '1' };
const fields: AIField[] = [{ id: 'project', label: 'Project name', type: 'text', required: true }];
const arrays: AIFieldArray[] = [
  {
    id: 'reviewers',
    label: 'Reviewers',
    minItems: 1,
    maxItems: 3,
    fields: [{ id: 'name', label: 'Reviewer name', type: 'text', required: true }],
  },
];
const steps: AIFormStep[] = [
  { id: 'project', title: 'Project', fieldIds: ['project'] },
  { id: 'reviewers', title: 'Reviewers', fieldIds: ['reviewers'] },
];
export function FormExample() {
  const sequence = useRef(1);
  const [values, setValues] = useState<FormValues>({});
  const [rows, setRows] = useState<AIArrayValues>({ reviewers: [] });
  const [step, setStep] = useState('project');
  const [receipt, setReceipt] = useState<AIFormReceipt>();
  function change(request: AIArrayChange) {
    if (
      request.identity?.formId !== identity.formId ||
      request.identity.schemaVersion !== identity.schemaVersion
    )
      return;
    const newId = request.type === 'add' ? `reviewer-${sequence.current++}` : '';
    setRows((current) => {
      const existing = current[request.arrayId] ?? [];
      if (request.type === 'add')
        return { ...current, [request.arrayId]: [...existing, { id: newId, values: {} }] };
      if (request.type === 'remove')
        return {
          ...current,
          [request.arrayId]: existing.filter((row) => row.id !== request.rowId),
        };
      if (request.type === 'change')
        return {
          ...current,
          [request.arrayId]: existing.map((row) =>
            row.id === request.rowId
              ? { ...row, values: { ...row.values, [request.fieldId]: request.value } }
              : row,
          ),
        };
      return current;
    });
  }
  return (
    <section>
      <h2>Controlled multistep form</h2>
      <p>This local consumer simulates host validation and acknowledgement.</p>
      <AIForm
        variant="grid"
        title="Create an agent workspace"
        identity={identity}
        fields={fields}
        values={values}
        onValueChange={setValues}
        arrays={arrays}
        arrayValues={rows}
        onArrayChange={change}
        steps={steps}
        step={step}
        onStepChange={setStep}
        status={receipt ? 'complete' : 'ready'}
        receipt={receipt}
        onSubmit={(_values, submission) => {
          if (
            submission?.identity?.formId === identity.formId &&
            submission.identity.schemaVersion === identity.schemaVersion
          )
            setReceipt({ identity, message: 'Accepted by the local simulated host.' });
        }}
      />
    </section>
  );
}
