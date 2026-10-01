'use client';
import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactNode, FocusEvent } from 'react';
import { AIForm } from '../ai-form/ai-form.js';
import type { AIFormProps } from '../ai-form/ai-form.js';
import type {
  AIFormSubmission,
  AIArrayChange,
  AIArrayValues,
  AIArrayErrors,
  FormValues,
} from '../ai-form/form-model.js';
import { DataTable } from '../data-table/data-table.js';
import { Chart } from '../chart/chart.js';
import { Button } from '../button/button.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { boundedData as boundedGeneratedData } from '../../shared/bounded-data.js';
import { inspectGeneratedSurface, inspectGeneratedActionPresentations } from './generated-model.js';
import { inspectArrayValues } from '../ai-form/form-model.js';
import type {
  GeneratedNode,
  GeneratedSurface,
  GeneratedActionPresentation,
} from './generated-model.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import g from '../../shared/styles/structured.module.css';
import a from '../../shared/styles/action-layout.module.css';
import css from './generated-ui.module.css';
export type {
  GeneratedNode,
  GeneratedSurface,
  GeneratedActionPresentation,
} from './generated-model.js';

interface SurfaceIdentity {
  surfaceId: string;
  version: string;
}
interface NodeIdentity extends SurfaceIdentity {
  nodeId: string;
}
export interface GeneratedActionRequest extends SurfaceIdentity {
  actionId: string;
  nodeId?: string;
  form?: { values: FormValues; submission: AIFormSubmission };
}
export interface GeneratedActionSnapshot extends SurfaceIdentity {
  actionId: string;
  status: 'pending' | 'complete' | 'error' | 'denied' | 'unknown';
  message?: string;
  submissionId?: string;
}
export interface GeneratedFormReceipt extends NodeIdentity {
  draftVersion?: string;
  message: string;
  submissionId?: string;
}
export interface GeneratedFormSnapshot extends NodeIdentity {
  draftVersion?: string;
  values: FormValues;
  arrayValues?: AIArrayValues;
  step?: string;
  status?: AIFormProps['status'];
  errors?: Record<string, string>;
  arrayErrors?: AIArrayErrors;
  receipt?: GeneratedFormReceipt;
}
export type GeneratedFormRequest = NodeIdentity & { draftVersion?: string } & (
    | { type: 'values'; values: FormValues }
    | { type: 'array'; change: AIArrayChange }
    | { type: 'step'; step: string }
  );
export interface GeneratedUIProps extends VariantProps<'GeneratedUI'> {
  surface: unknown;
  state:
    'ready' | 'streaming' | 'pending' | 'stale' | 'loading' | 'denied' | 'unavailable' | 'error';
  onAction?: (request: GeneratedActionRequest) => void;
  actionStates?: readonly GeneratedActionSnapshot[];
  /** Trusted, version-bound host emphasis. Generated nodes cannot provide styling. */
  actionPresentations?: readonly GeneratedActionPresentation[];
  forms?: Record<string, GeneratedFormSnapshot>;
  onFormChange?: (request: GeneratedFormRequest) => void;
  error?: string;
}
function matches(snapshot: SurfaceIdentity, surface: GeneratedSurface) {
  return snapshot.surfaceId === surface.id && snapshot.version === surface.version;
}
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function stringRecord(value: unknown) {
  return record(value) && Object.values(value).every((item) => typeof item === 'string');
}
function validFormData(snapshot: GeneratedFormSnapshot) {
  return (
    boundedGeneratedData(snapshot) &&
    record(snapshot.values) &&
    Object.values(snapshot.values).every(
      (value) => typeof value === 'string' || typeof value === 'boolean',
    ) &&
    (snapshot.errors === undefined || stringRecord(snapshot.errors)) &&
    (snapshot.arrayErrors === undefined ||
      (record(snapshot.arrayErrors) &&
        Object.values(snapshot.arrayErrors).every(
          (error) =>
            record(error) &&
            (error.message === undefined || typeof error.message === 'string') &&
            (error.rows === undefined ||
              (record(error.rows) && Object.values(error.rows).every(stringRecord))),
        ))) &&
    (snapshot.receipt === undefined ||
      (record(snapshot.receipt) && typeof snapshot.receipt.message === 'string')) &&
    (snapshot.step === undefined || typeof snapshot.step === 'string') &&
    (snapshot.draftVersion === undefined || typeof snapshot.draftVersion === 'string') &&
    (snapshot.status === undefined ||
      [
        'ready',
        'pending',
        'complete',
        'error',
        'loading',
        'denied',
        'stale',
        'unavailable',
      ].includes(snapshot.status))
  );
}
const hiddenFormStates = new Set<NonNullable<AIFormProps['status']>>([
  'loading',
  'denied',
  'stale',
  'unavailable',
]);
function formAvailability(
  snapshot: GeneratedFormSnapshot | undefined,
  state: GeneratedUIProps['state'],
  connected: boolean,
): NonNullable<AIFormProps['status']> {
  if (!snapshot) return 'stale';
  const status = snapshot.status ?? 'ready';
  if (hiddenFormStates.has(status)) return status;
  if (state === 'stale') return 'stale';
  if (state === 'streaming') return 'loading';
  if (status === 'complete') return 'complete';
  if (state === 'pending') return 'pending';
  if (!connected && status !== 'pending') return 'unavailable';
  return status;
}

export function GeneratedUI({
  surface: input,
  state,
  onAction,
  actionStates = [],
  actionPresentations = [],
  forms = {},
  onFormChange,
  error,
  variant = 'stack',
}: GeneratedUIProps) {
  const prefix = useId();
  const rootElement = useRef<HTMLDivElement>(null);
  const focused = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (focused.current && !focused.current.isConnected && document.activeElement === document.body)
      rootElement.current?.focus({ preventScroll: true });
  }, [input, state, forms, actionStates, actionPresentations]);
  const root = {
    ref: rootElement,
    tabIndex: -1,
    role: 'group',
    'aria-label': 'Generated result',
    className: `${g.root} ${css.root}`,
    'data-part': 'generated-ui',
    'data-variant': variant,
    onFocusCapture: (event: FocusEvent<HTMLDivElement>) => {
      focused.current = event.target as HTMLElement;
    },
    onBlurCapture: (event: FocusEvent<HTMLDivElement>) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
        focused.current = null;
    },
  };
  if (['loading', 'denied', 'unavailable', 'error'].includes(state))
    return (
      <div {...root}>
        {state === 'loading' ? (
          <LoadingIndicator label="Loading generated result" />
        ) : (
          <p role="status" className={state === 'error' ? g.error : s.muted}>
            {state === 'denied'
              ? 'Access to this generated result is denied.'
              : state === 'error'
                ? error?.slice(0, 1000) || 'The generated result could not be loaded.'
                : 'This generated result is unavailable.'}
          </p>
        )}
      </div>
    );
  const surface = inspectGeneratedSurface(input);
  if (!surface)
    return (
      <div {...root}>
        <p role="status" className={g.error}>
          This generated surface contains unsupported content or exceeds the preview limits.
        </p>
      </div>
    );
  const scope: SurfaceIdentity = { surfaceId: surface.id, version: surface.version };
  const safePresentations = inspectGeneratedActionPresentations(actionPresentations);
  const safeActions =
    Array.isArray(actionStates) && actionStates.length <= 64 && boundedGeneratedData(actionStates)
      ? actionStates
      : undefined;

  function readFormSnapshot(nodeId: string) {
    const snapshot =
      forms && typeof forms === 'object'
        ? (Object.getOwnPropertyDescriptor(forms, nodeId)?.value as
            GeneratedFormSnapshot | undefined)
        : undefined;
    return snapshot &&
      validFormData(snapshot) &&
      matches(snapshot, surface!) &&
      snapshot.nodeId === nodeId
      ? snapshot
      : undefined;
  }
  let actualControls = 0;
  function formSnapshotsFit(nodes: GeneratedNode[]): boolean {
    return nodes.every((node) => {
      if (node.type === 'section') return formSnapshotsFit(node.nodes);
      if (node.type !== 'form' || !['ready', 'pending'].includes(state)) return true;
      const snapshot = readFormSnapshot(node.id);
      if (
        !snapshot ||
        hiddenFormStates.has(
          formAvailability(snapshot, state, Boolean(onFormChange && onAction)),
        ) ||
        inspectArrayValues(node.arrays ?? [], snapshot.arrayValues ?? {}, node.fields.length)
      )
        return true;
      actualControls +=
        node.fields.length +
        (node.arrays ?? []).reduce(
          (sum, array) =>
            sum + (snapshot.arrayValues?.[array.id]?.length ?? 0) * array.fields.length,
          0,
        );
      return actualControls <= 200;
    });
  }
  if (!formSnapshotsFit(surface.nodes))
    return (
      <div {...root}>
        <p role="status" className={g.error}>
          The host form snapshots exceed the generated control limit.
        </p>
      </div>
    );

  function renderForm(node: Extract<GeneratedNode, { type: 'form' }>) {
    const snapshot = readFormSnapshot(node.id);
    const current = snapshot !== undefined;
    const identity = {
      formId: node.id,
      schemaVersion: surface!.version,
      draftVersion: current ? snapshot.draftVersion : undefined,
    };
    const requestScope = { ...scope, nodeId: node.id, draftVersion: identity.draftVersion };
    const status = formAvailability(snapshot, state, Boolean(onFormChange && onAction));
    const receipt =
      current &&
      snapshot.receipt &&
      matches(snapshot.receipt, surface!) &&
      snapshot.receipt.nodeId === node.id
        ? {
            identity: {
              formId: node.id,
              schemaVersion: snapshot.receipt.version,
              draftVersion: snapshot.receipt.draftVersion,
            },
            message: snapshot.receipt.message,
            submissionId: snapshot.receipt.submissionId,
          }
        : undefined;
    return (
      <AIForm
        key={`${surface!.id}/${surface!.version}/${node.id}`}
        title={node.title}
        fields={node.fields}
        arrays={node.arrays}
        steps={node.steps}
        variant={variant === 'cards' ? 'grid' : variant === 'compact' ? 'compact' : 'stacked'}
        identity={identity}
        values={current ? snapshot.values : {}}
        arrayValues={current ? snapshot.arrayValues : undefined}
        step={current ? snapshot.step : undefined}
        status={status}
        errors={current ? snapshot.errors : undefined}
        arrayErrors={current ? snapshot.arrayErrors : undefined}
        receipt={receipt}
        onValueChange={(values) => {
          if (state === 'ready' && current)
            onFormChange?.({ ...requestScope, type: 'values', values });
        }}
        onArrayChange={
          onFormChange
            ? (change) => {
                if (state === 'ready' && current)
                  onFormChange({ ...requestScope, type: 'array', change });
              }
            : undefined
        }
        onStepChange={
          onFormChange
            ? (step) => {
                if (state === 'ready' && current)
                  onFormChange({ ...requestScope, type: 'step', step });
              }
            : undefined
        }
        onSubmit={(values, submission) => {
          if (state === 'ready' && current && submission)
            onAction?.({
              ...scope,
              nodeId: node.id,
              actionId: node.actionId,
              form: { values, submission },
            });
        }}
      />
    );
  }
  function renderAction(node: Extract<GeneratedNode, { type: 'action' }>) {
    const presentations = safePresentations?.filter(
      (item) => matches(item, surface!) && item.actionId === node.actionId,
    );
    const presentationError = !presentations
      ? 'Action presentation bindings are invalid or unavailable.'
      : presentations.length > 1
        ? 'Action presentation bindings are ambiguous.'
        : undefined;
    const records: readonly GeneratedActionSnapshot[] | undefined = safeActions?.filter(
      (item: GeneratedActionSnapshot) => item?.actionId === node.actionId,
    );
    const current =
      records?.length === 1 && matches(records[0]!, surface!) ? records[0] : undefined;
    const invalid =
      !records ||
      (records.length > 0 &&
        (!current ||
          !boundedGeneratedData(current) ||
          !['pending', 'complete', 'error', 'denied', 'unknown'].includes(current.status) ||
          (current.message !== undefined && typeof current.message !== 'string')));
    const reason =
      presentationError ||
      node.disabledReason ||
      (invalid
        ? 'Action state is stale or unavailable.'
        : !onAction
          ? 'No host action handler is connected.'
          : undefined);
    const locked = current && current.status !== 'error';
    const labels = {
      pending: 'Awaiting host confirmation…',
      complete: 'Host reported completion.',
      error: 'The host reported an error. Retry only if permitted.',
      denied: 'The host denied this action.',
      unknown: 'The action outcome is unknown. Reconcile with the host before retrying.',
    };
    const statusId = `${prefix}-${encodeURIComponent(node.id)}-status`;
    return (
      <div className={`${s.root} ${a.local}`}>
        <Button
          size="sm"
          variant={presentationError ? 'outline' : (presentations?.[0]?.variant ?? 'outline')}
          disabled={state !== 'ready' || Boolean(reason || locked)}
          aria-describedby={reason || current ? statusId : undefined}
          onClick={() => onAction?.({ ...scope, actionId: node.actionId })}
        >
          {node.label}
        </Button>
        {(reason || current) && (
          <p id={statusId} role="status" className={s.muted}>
            {reason ||
              (current && (
                <>
                  {labels[current.status]}
                  {current.message ? ` ${current.message.slice(0, 2000)}` : ''}
                </>
              ))}
          </p>
        )}
      </div>
    );
  }
  function renderNode(node: GeneratedNode, depth: number, grouped = false) {
    return (
      <div
        key={`node:${node.id}`}
        data-node-id={node.id}
        data-node-type={node.type}
        className={
          grouped ? css.actionNode : variant === 'cards' && depth === 0 ? g.card : undefined
        }
      >
        {node.type === 'text' ? (
          <p className={g.generatedText}>{node.text}</p>
        ) : node.type === 'metric' ? (
          <div>
            <p className={s.muted}>{node.label}</p>
            <strong className={g.metric}>{node.value}</strong>
          </div>
        ) : node.type === 'table' ? (
          <DataTable
            caption={node.caption}
            columns={node.columns}
            rows={node.rows}
            variant={variant === 'cards' ? 'cards' : variant === 'compact' ? 'compact' : 'table'}
          />
        ) : node.type === 'chart' ? (
          <Chart
            title={node.title}
            unit={node.unit}
            source={node.source}
            points={node.points}
            series={node.series}
            asOf={node.asOf}
            locale={node.locale}
            state={state === 'streaming' ? 'streaming' : 'ready'}
          />
        ) : node.type === 'form' ? (
          renderForm(node)
        ) : node.type === 'action' ? (
          renderAction(node)
        ) : (
          <div role="group" aria-label={node.title} className={g.generatedSection}>
            <strong>{node.title}</strong>
            {node.description && <p className={s.muted}>{node.description}</p>}
            <div className={node.layout === 'grid' ? g.cards : s.options}>
              {renderNodes(node.nodes, depth + 1)}
            </div>
          </div>
        )}
      </div>
    );
  }
  function renderNodes(nodes: GeneratedNode[], depth: number) {
    const rendered: ReactNode[] = [];
    let previous = 'origin';
    for (let index = 0; index < nodes.length;) {
      const node = nodes[index]!;
      if (node.type !== 'action') {
        rendered.push(renderNode(node, depth));
        previous = `node:${node.id}`;
        index++;
        continue;
      }
      const actions: GeneratedNode[] = [];
      while (nodes[index]?.type === 'action') actions.push(nodes[index++]!);
      rendered.push(
        <div
          key={`actions:${previous}`}
          role="group"
          aria-label="Generated actions"
          data-part="generated-action-rail"
          className={`${css.rail} ${variant === 'cards' && depth === 0 ? g.card : ''}`}
        >
          {actions.map((action) => renderNode(action, depth, true))}
        </div>,
      );
    }
    return rendered;
  }
  return (
    <div {...root}>
      <p role="status" className={s.muted}>
        {state === 'ready'
          ? 'Interactive result'
          : state === 'streaming'
            ? 'Receiving result… Actions are disabled until it is ready.'
            : state === 'pending'
              ? 'Awaiting host confirmation…'
              : 'This result is stale. Refresh before acting.'}
      </p>
      {!surface.nodes.length ? (
        <p className={s.muted}>No generated content reported.</p>
      ) : (
        <div className={variant === 'cards' ? g.cards : s.options}>
          {renderNodes(surface.nodes, 0)}
        </div>
      )}
    </div>
  );
}
