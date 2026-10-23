'use client';
import { useEffect, useState } from 'react';
import { Button, GeneratedUI, resolveVariant } from '@stackunseen/ui';
import {
  createSurfaceParser,
  parseSurfaceProgram,
  surfaceExampleProgram,
} from '@stackunseen/ui-core';
import type { SurfaceParseState } from '@stackunseen/ui-core';
import type {
  GeneratedSurface,
  GeneratedActionRequest,
  GeneratedActionSnapshot,
  GeneratedFormSnapshot,
  GeneratedFormRequest,
  GeneratedActionPresentation,
} from '@stackunseen/ui';
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
      ? 'Workspace deployment review, measured sample totals and current ownership'
      : 'Workspace summary',
    description: 'Synthetic sample data; source and totals are supplied by this local server.',
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
        rows: [{ id: 'types', cells: { name: 'Types', result: 'Passed in sample' } }],
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
        { id: 'intro', type: 'text', text: 'Related actions sit beside this result.' },
        actionNode,
        { id: 'export', type: 'action', label: 'Export summary', actionId: 'export' },
        {
          id: 'note',
          type: 'text',
          text: 'Discard is a separate request; this sample executes no external action.',
        },
        { id: 'discard', type: 'action', label: 'Discard draft', actionId: 'discard' },
      ],
    };
  if (state === 'Streamed program')
    return <StreamedProgram presentation={presentation} onEvent={onEvent} />;
  if (state === 'Vocabulary')
    return <VocabularySpecimen presentation={presentation} onEvent={onEvent} />;
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
          message: 'Reported by the simulated server.',
        },
      ]
    : packet && outcome && !packet.form
      ? [
          {
            surfaceId: packet.surfaceId,
            version: packet.version,
            actionId: packet.actionId,
            status: outcome,
            message: 'Acknowledgement from the simulated server.',
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
      <p>Sample server · structure, values and outcomes are supplied locally</p>
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
                    message: 'Current form acknowledged by the simulated server.',
                  },
                });
            }}
          >
            Acknowledge current request
          </Button>
          {packet.version !== version && (
            <p>
              Earlier request belongs to a previous surface version. Reconcile its outcome with the
              server.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const streamedProgram = `${surfaceExampleProgram.replace('root = [summary, open, tickets, next]', 'root = [summary, open, tickets, chart, next]')}
chart = chart("Tickets by week", "tickets", "Local sample", [{label: "W1", value: 4}, {label: "W2", value: 7}, {label: "W3", value: 3}])
broken = metric("Only one argument")
root = [again]`;

function StreamedProgram({
  presentation,
  onEvent,
}: {
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [parse, setParse] = useState<SurfaceParseState | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const parser = createSurfaceParser({ surfaceId: 'surface-stream', version: String(round + 1) });
    const lines = streamedProgram.split('\n');
    let index = 0;
    setParse(parser.state());
    const timer = window.setInterval(() => {
      if (index < lines.length) {
        setParse(parser.push(`${lines[index]}\n`));
        index++;
      } else {
        setParse(parser.finish());
        window.clearInterval(timer);
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [round]);
  const problems = parse?.problems ?? [];
  return (
    <div className={styles.root}>
      <p>
        Synthetic stream · one line every 450 ms from the vocabulary's own example, plus a chart,
        one broken line and a duplicate root
      </p>
      <div className={styles.controls}>
        <Button variant="outline" onClick={() => setRound((value) => value + 1)}>
          Stream again
        </Button>
        <span>
          {parse?.complete
            ? `Finished: ${parse.statements} statements, ${problems.length} problems.`
            : `Streaming: ${parse?.statements ?? 0} statements, waiting for ${parse?.pending.length ?? 0}.`}
        </span>
      </div>
      <GeneratedUI
        variant={resolveVariant('GeneratedUI', presentation)}
        surface={parse?.surface ?? { id: 'surface-stream', version: String(round + 1), nodes: [] }}
        state={parse?.complete ? 'ready' : 'streaming'}
        problems={problems}
        onAction={(request) =>
          onEvent(`${request.actionId} requested for surface ${request.version}`)
        }
      />
    </div>
  );
}

const vocabularyProgram = (
  origin: string,
) => `root = [summary, steps, risk, totals, owner, evidence]
summary = list(["Three tickets are open", "Two are older than a week", "One affects sign-in"])
steps = steps("Triage", [{id: "collect", label: "Collect", state: "done"}, {id: "assign", label: "Assign", state: "current"}, {id: "close", label: "Close", state: "upcoming"}])
risk = callout("warning", "Two tickets are past their target", "Both affect sign-in. The server decides whether to escalate.")
totals = metricGroup("This week", [{label: "Opened", value: "12"}, {label: "Closed", value: "9"}, {label: "Median age", value: "4 days"}])
owner = options("Who should take the oldest ticket?", "assign-owner", [{value: "ana", label: "Ana", description: "on call this week"}, {value: "raj", label: "Raj"}, {value: "later", label: "Decide later"}])
evidence = section("Evidence", [local, remote], "grid")
local = image("${origin}/fixtures/sample-chart.png", "Sample bar chart of tickets per week", "Served by this site")
remote = image("https://images.example.com/trend.png", "Open tickets per day", "From a site your app hasn’t approved")`;

function VocabularySpecimen({
  presentation,
  onEvent,
}: {
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [origin, setOrigin] = useState('');
  const [approved, setApproved] = useState(false);
  const [choice, setChoice] = useState<GeneratedActionSnapshot>();
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;
  const surface = parseSurfaceProgram(vocabularyProgram(origin), {
    surfaceId: 'surface-vocabulary',
    version: '1',
  }).surface;
  return (
    <div className={styles.root}>
      <p>
        Synthetic surface written in the line format. The images and the choice are controlled by
        the simulated server below.
      </p>
      <div className={styles.controls}>
        <Button variant="outline" aria-pressed={approved} onClick={() => setApproved(!approved)}>
          {approved ? 'Revoke this site for images' : 'Approve this site for images'}
        </Button>
        {choice?.status === 'pending' && (
          <Button variant="outline" onClick={() => setChoice({ ...choice, status: 'complete' })}>
            Confirm choice as your server
          </Button>
        )}
        {choice && choice.status !== 'pending' && (
          <Button variant="ghost" onClick={() => setChoice(undefined)}>
            Reset choice
          </Button>
        )}
      </div>
      <GeneratedUI
        variant={resolveVariant('GeneratedUI', presentation)}
        surface={surface}
        state="ready"
        imageOrigins={approved ? [origin] : []}
        actionStates={choice ? [choice] : []}
        onAction={(request) => {
          if (request.value)
            setChoice({
              surfaceId: request.surfaceId,
              version: request.version,
              actionId: request.actionId,
              status: 'pending',
              value: request.value,
            });
          onEvent(
            `${request.actionId}${request.value ? ` (${request.value})` : ''} requested for surface ${request.version}`,
          );
        }}
      />
    </div>
  );
}
