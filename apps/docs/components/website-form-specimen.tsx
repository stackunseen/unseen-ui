'use client';
import { useState } from 'react';
import {
  Field,
  Input,
  Textarea,
  Checkbox,
  Switch,
  RadioGroup,
  Slider,
} from '@ai-interaction/react';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteFormSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [value, setValue] = useState(
    state === 'Long value'
      ? 'A reusable collection of thoughtful interface components for project documentation and code examples. '.repeat(
          5,
        )
      : name === 'Textarea'
        ? 'A collection of accessible components for my projects.'
        : 'Component library',
  );
  const [checked, setChecked] = useState(state === 'Checked');
  const [mixed, setMixed] = useState(state === 'Indeterminate');
  const [choice, setChoice] = useState('public');
  const [range, setRange] = useState(state === 'Range' ? [25, 75] : [50]);
  const disabled = state === 'Disabled';
  const invalid = state === 'Invalid';
  const description = 'This value is controlled by the local example.';
  if (name === 'Checkbox' || name === 'Switch') {
    const Control = name === 'Checkbox' ? Checkbox : Switch;
    return (
      <>
        <Field
          label={name === 'Checkbox' ? 'Include documentation' : 'Show release notes'}
          description={description}
          disabled={disabled}
          error={invalid ? 'Review this setting before continuing.' : undefined}
        >
          <Control
            checked={checked}
            {...(name === 'Checkbox' ? { indeterminate: mixed } : {})}
            onCheckedChange={(next) => {
              setChecked(next);
              setMixed(false);
            }}
          />
        </Field>
        <p className="generic-demo-status">
          {mixed ? 'Selection is mixed.' : checked ? 'Setting is on.' : 'Setting is off.'}
        </p>
      </>
    );
  }
  if (name === 'RadioGroup')
    return (
      <>
        <Field
          label="Project visibility"
          labelAs="span"
          description={description}
          disabled={disabled}
          error={invalid ? 'Choose the visibility for this project.' : undefined}
        >
          <RadioGroup
            value={choice}
            onValueChange={setChoice}
            orientation={state === 'Horizontal' ? 'horizontal' : 'vertical'}
            options={
              state === 'Empty'
                ? []
                : [
                    { value: 'public', label: 'Public', description: 'Visible to everyone.' },
                    { value: 'private', label: 'Private', description: 'Only visible to you.' },
                    {
                      value: 'team',
                      label: 'Team',
                      description: 'Not available in this example.',
                      disabled: true,
                    },
                  ]
            }
            emptyMessage="No visibility options are available."
          />
        </Field>
        <p className="generic-demo-status">
          {state === 'Empty' ? 'No selection is available.' : `Selected: ${choice}.`}
        </p>
      </>
    );
  if (name === 'Slider')
    return (
      <>
        <Field
          label={state === 'Range' ? 'Visible range' : 'Preview scale'}
          labelAs="span"
          description="Use arrow keys to adjust by one percentage point."
          disabled={disabled}
        >
          <Slider
            value={range}
            onValueChange={setRange}
            min={0}
            max={100}
            step={1}
            thumbLabels={state === 'Range' ? ['Range start', 'Range end'] : ['Preview scale']}
            getValueLabel={(amount) => `${amount}%`}
          />
        </Field>
        <p className="generic-demo-status">{range.map((amount) => `${amount}%`).join(' to ')}</p>
      </>
    );
  const label = name === 'Textarea' ? 'Project description' : 'Project name';
  return (
    <Field
      label={label}
      description={description}
      required={state === 'Required'}
      disabled={disabled}
      error={invalid ? `Enter a ${label.toLowerCase()} before continuing.` : undefined}
    >
      {name === 'Textarea' ? (
        <Textarea
          value={value}
          rows={4}
          readOnly={state === 'Read-only'}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : (
        <Input
          value={value}
          readOnly={state === 'Read-only'}
          onChange={(event) => setValue(event.target.value)}
        />
      )}
    </Field>
  );
}
