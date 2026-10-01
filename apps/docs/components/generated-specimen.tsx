'use client';
import { useState } from 'react';
import { Button, GeneratedUI, resolveVariant } from '@ai-interaction/react';
import type {
  GeneratedSurface,
  GeneratedActionRequest,
  GeneratedActionSnapshot,
  GeneratedFormSnapshot,
  GeneratedFormRequest,
  GeneratedActionPresentation,
} from '@ai-interaction/react';
import styles from './form-specimen.module.css';

export function GeneratedSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [version, setVersion] = useState('1');
  const [revoked, setRevoked] = useState(false);
  const [packet, setPacket] = useState<GeneratedActionRequest>();
  const [outcome, setOutcome] = useState<GeneratedActionSnapshot['status']>();
  const [form, setForm] = useState<GeneratedFormSnapshot>({
    surfaceId: 'surface-1',
    version: '1',
    nodeId: 'questions',
    draftVersion: 'draft-1',
    values: { project: 'Demo workspace' },
    arrayValues: { owners: [{ id: 'owner-1', values: { name: 'Ada' } }] },
    step: 'basics',
    status: ['Denied form', 'Pending with denied form'].includes(state) ? 'denied' : 'ready',
  });
  const [rowSequence, setRowSequence] = useState(2);
  const long = state === 'Long labels';
  const composed = [
    'Sections',
    'Generated form',
    'Live versions',
    'Long labels',
    'Invalid schema',
    'Bounds',
    'Denied form',
    'Pending with denied form',
  ].includes(state);
  const actionNode: GeneratedSurface['nodes'][number] = {
    id: 'action',
    type: 'action',
    label: long
      ? 'Open the deployment change review and inspect the current permission scope'
      : 'Open change review',
    actionId: 'review',
  };
  const formNode: GeneratedSurface['nodes'][number] = {
    id: 'questions',
    type: 'form',
    title: long
      ? 'Deployment information and reviewers responsible for approving the current workspace version'
      : 'Deployment questions',
    actionId: 'deploy',
    fields: [
      {
        id: 'project',
        label: long ? 'Project and workspace name for the deployment under review' : 'Project',
        type: 'text',
        required: true,
      },
    ],
    arrays: [
      {
        id: 'owners',
        label: long
          ? 'Reviewers responsible for permission scope and evidence provenance'
          : 'Owners',
        minItems: 1,
        maxItems: 3,
        reorderable: true,
        fields: [{ id: 'name', label: 'Owner name', type: 'text', required: true }],
      },
    ],
    steps: [
      { id: 'basics', title: 'Project', fieldIds: ['project'] },
      { id: 'owners', title: 'Review owners', fieldIds: ['owners'] },
    ],
  };
  const section: GeneratedSurface['nodes'][number] = {
    id: 'summary',
    type: 'section',
    title: long
      ? 'Workspace deployment review, measured fixture totals and current ownership'
      : 'Workspace summary',
    description: 'Synthetic fixture data; source and totals are supplied by this local host.',
    layout: 'grid',
    nodes: [
      { id: 'metric', type: 'metric', label: 'Changed files', value: '2' },
      {
        id: 'table',
        type: 'table',
        caption: 'Reported checks',
        columns: [
          { id: 'name', label: 'Check' },
          { id: 'result', label: 'Result' },
        ],
        rows: [{ id: 'types', cells: { name: 'Types', result: 'Passed in fixture' } }],
      },
      {
        id: 'chart',
        type: 'chart',
        title: 'Reported records',
        unit: 'records',
        source: 'Synthetic fixture',
        points: [
          { label: 'Before', value: 2 },
          { label: 'After', value: 3 },
        ],
      },
      { id: 'details', type: 'section', title: 'Next action', nodes: [actionNode] },
    ],
  };
  let surface: unknown = {
    id: 'surface-1',
    version,
    nodes:
      state === 'Empty'
        ? []
        : composed
          ? [section, formNode]
          : [
              {
                id: 'title',
                type: 'text',
                text: `The change is ready for review. Surface version ${version}.`,
              },
              { id: 'metric', type: 'metric', label: 'Changed files', value: '2' },
              actionNode,
            ],
  };
  const actionRail = state === 'Action rail';
  const actionPresentations: GeneratedActionPresentation[] = actionRail
    ? [
        { surfaceId: 'surface-1', version, actionId: 'review', variant: 'primary' },
        { surfaceId: 'surface-1', version, actionId: 'export', variant: 'outline' },
        { surfaceId: 'surface-1', version, actionId: 'discard', variant: 'danger' },
      ]
    : [];
  if (actionRail)
    surface = {
      id: 'surface-1',
      version,
      nodes: [
        { id: 'intro', type: 'text', text: 'The host groups related actions beside this result.' },
        actionNode,
        { id: 'export', type: 'action', label: 'Export summary', actionId: 'export' },
        {
          id: 'note',
          type: 'text',
          text: 'Discard is a separate request; this fixture executes no external action.',
        },
        { id: 'discard', type: 'action', label: 'Discard draft', actionId: 'discard' },
      ],
    };
  if (state === 'Unsupported')
    surface = { id: 's', version: '1', nodes: [{ id: 'x', type: 'script', text: 'alert(1)' }] };
  if (state === 'Invalid schema')
    surface = {
      id: 's',
      version: '1',
      nodes: [
        {
          ...formNode,
          fields: [
            { id: 'a', type: 'text', label: 'A', when: { field: 'missing', equals: 'yes' } },
          ],
        },
      ],
    };
  if (state === 'Bounds')
    surface = {
      id: 's',
      version: '1',
      nodes: Array.from({ length: 65 }, (_, i) => ({
        id: `text-${i}`,
        type: 'text',
        text: 'Bounded content',
      })),
    };
  const fixtureOutcome =
    state === 'Action completed'
      ? 'complete'
      : state === 'Action error'
        ? 'error'
        : state === 'Unknown outcome'
          ? 'unknown'
          : undefined;
  const actionStates: GeneratedActionSnapshot[] = fixtureOutcome
    ? [
        {
          surfaceId: 'surface-1',
          version,
          actionId: 'review',
          status: fixtureOutcome,
          message: 'Reported by the simulated host.',
        },
      ]
    : packet && outcome && !packet.form
      ? [
          {
            surfaceId: packet.surfaceId,
            version: packet.version,
            actionId: packet.actionId,
            status: outcome,
            message: 'Acknowledgement from the simulated host.',
          },
        ]
      : [];
  function change(request: GeneratedFormRequest) {
    if (
      request.surfaceId !== 'surface-1' ||
      request.version !== version ||
      request.nodeId !== 'questions'
    )
      return;
    if (request.type === 'values') setForm({ ...form, values: request.values });
    if (request.type === 'step') setForm({ ...form, step: request.step });
    if (request.type === 'array') {
      const intent = request.change;
      const rows = [...(form.arrayValues?.owners ?? [])];
      if (intent.type === 'add') {
        rows.push({ id: `owner-${rowSequence}`, values: { name: '' } });
        setRowSequence(rowSequence + 1);
      }
      if (intent.type === 'remove')
        rows.splice(
          rows.findIndex((r) => r.id === intent.rowId),
          1,
        );
      if (intent.type === 'move')
        rows.splice(
          intent.toIndex,
          0,
          ...rows.splice(
            rows.findIndex((r) => r.id === intent.rowId),
            1,
          ),
        );
      if (intent.type === 'change') {
        const index = rows.findIndex((r) => r.id === intent.rowId);
        if (index >= 0)
          rows[index] = {
            ...rows[index]!,
            values: { ...rows[index]!.values, [intent.fieldId]: intent.value },
          };
      }
      setForm({ ...form, arrayValues: { owners: rows } });
    }
    onEvent(`form ${request.type} requested for surface ${request.version}`);
  }
  const availability = revoked
    ? 'denied'
    : state === 'Streaming'
      ? 'streaming'
      : state === 'Pending' || state === 'Pending with denied form'
        ? 'pending'
        : state === 'Stale'
          ? 'stale'
          : state === 'Loading'
            ? 'loading'
            : state === 'Denied'
              ? 'denied'
              : state === 'Unavailable'
                ? 'unavailable'
                : state === 'Error'
                  ? 'error'
                  : 'ready';
  return (
    <div className={styles.root}>
      <p>Synthetic host · structure, values and outcomes are supplied locally</p>
      {state === 'Live versions' && (
        <div className={styles.controls}>
          <Button
            variant="ghost"
            onClick={() => setVersion((current) => String(Number(current) + 1))}
          >
            Replace surface version
          </Button>
          <Button variant="ghost" onClick={() => setRevoked(true)}>
            Revoke access
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRevoked(false);
              setForm({ ...form, version, status: 'ready', receipt: undefined });
            }}
          >
            Restore current form
          </Button>
        </div>
      )}
      <GeneratedUI
        variant={resolveVariant('GeneratedUI', presentation)}
        surface={surface}
        state={availability}
        forms={{ questions: form }}
        onFormChange={change}
        actionStates={actionStates}
        actionPresentations={actionPresentations}
        onAction={(request) => {
          setPacket(request);
          setOutcome('pending');
          if (request.form) setForm({ ...form, status: 'pending', receipt: undefined });
          onEvent(`${request.actionId} requested for surface ${request.version}`);
        }}
      />
      {packet && (
        <div className={styles.controls}>
          <Button
            disabled={outcome !== 'pending' || revoked || packet.version !== version}
            onClick={() => {
              setOutcome('complete');
              if (packet.form)
                setForm({
                  ...form,
                  status: 'complete',
                  receipt: {
                    surfaceId: packet.surfaceId,
                    version: packet.version,
                    nodeId: packet.nodeId!,
                    draftVersion: packet.form.submission.identity?.draftVersion,
                    message: 'Current form acknowledged by the simulated host.',
                  },
                });
            }}
          >
            Acknowledge current request
          </Button>
          {packet.version !== version && (
            <p>
              Earlier request belongs to a previous surface version. Reconcile its outcome with the
              host.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
