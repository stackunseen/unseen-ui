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
import { Alert, AlertDescription, AlertTitle } from '../alert/alert.js';
import { Stepper } from '../stepper/stepper.js';
import { boundedData as boundedGeneratedData } from '../../shared/bounded-data.js';
import {
  approvedImageOrigin,
  inspectGeneratedSurface,
  inspectGeneratedActionPresentations,
} from './generated-model.js';
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
  GeneratedCalloutTone,
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
  /** The choice pressed on an options node. */
  value?: string;
}
export interface GeneratedActionSnapshot extends SurfaceIdentity {
  actionId: string;
  status: 'pending' | 'complete' | 'error' | 'denied' | 'unknown';
  message?: string;
  submissionId?: string;
  /** For options nodes, the choice the host recorded. */
  value?: string;
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
  /** Statements a streaming parser could not show; listed under the result, never hidden. */
  problems?: readonly { line: number; code: string; message: string }[];
  /**
   * Origins (`https://images.example.com`) the host allows generated images to load from.
   * Images from any other origin show a notice instead, so a surface cannot make the browser
   * contact an arbitrary server.
   */
  imageOrigins?: readonly string[];
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
  problems,
  imageOrigins,
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
          This form has more fields than can be shown.
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
  const statusLabels = {
    pending: 'Waiting for confirmation…',
    complete: 'Completed.',
    error: 'The action failed. Try again only if that’s allowed.',
    denied: 'This action was denied.',
    unknown: 'It’s not clear whether this action ran. Check before trying again.',
  };
  /** Host state for one actionId: why it is disabled, its current snapshot and the status id. */
  function actionStatus(actionId: string, nodeId: string, disabledReason?: string) {
    const presentations = safePresentations?.filter(
      (item) => matches(item, surface!) && item.actionId === actionId,
    );
    const presentationError = !presentations
      ? 'Action presentation bindings are invalid or unavailable.'
      : presentations.length > 1
        ? 'Action presentation bindings are ambiguous.'
        : undefined;
    const records: readonly GeneratedActionSnapshot[] | undefined = safeActions?.filter(
      (item: GeneratedActionSnapshot) => item?.actionId === actionId,
    );
    const current =
      records?.length === 1 && matches(records[0]!, surface!) ? records[0] : undefined;
    const invalid =
      !records ||
      (records.length > 0 &&
        (!current ||
          !boundedGeneratedData(current) ||
          !['pending', 'complete', 'error', 'denied', 'unknown'].includes(current.status) ||
          (current.message !== undefined && typeof current.message !== 'string') ||
          (current.value !== undefined && typeof current.value !== 'string')));
    const reason =
      presentationError ||
      disabledReason ||
      (invalid
        ? 'Action state is stale or unavailable.'
        : !onAction
          ? 'Actions aren’t set up here.'
          : undefined);
    return {
      variant: presentationError ? 'outline' : (presentations?.[0]?.variant ?? 'outline'),
      reason,
      current,
      disabled: state !== 'ready' || Boolean(reason || (current && current.status !== 'error')),
      statusId: `${prefix}-${encodeURIComponent(nodeId)}-status`,
    } as const;
  }
  function statusText(status: ReturnType<typeof actionStatus>, chosen?: string) {
    const { reason, current } = status;
    if (!reason && !current) return null;
    return (
      <p id={status.statusId} role="status" className={s.muted}>
        {reason ||
          (current && (
            <>
              {statusLabels[current.status]}
              {chosen ? ` Choice: ${chosen}.` : ''}
              {current.message ? ` ${current.message.slice(0, 2000)}` : ''}
            </>
          ))}
      </p>
    );
  }
  function renderAction(node: Extract<GeneratedNode, { type: 'action' }>) {
    const status = actionStatus(node.actionId, node.id, node.disabledReason);
    return (
      <div className={`${s.root} ${a.local}`}>
        <Button
          size="sm"
          variant={status.variant}
          disabled={status.disabled}
          aria-describedby={status.reason || status.current ? status.statusId : undefined}
          onClick={() => onAction?.({ ...scope, actionId: node.actionId })}
        >
          {node.label}
        </Button>
        {statusText(status)}
      </div>
    );
  }
  function renderOptions(node: Extract<GeneratedNode, { type: 'options' }>) {
    const status = actionStatus(node.actionId, node.id, node.disabledReason);
    // Only the host's snapshot marks a choice as recorded; pressing a button does not.
    const recorded = status.reason
      ? undefined
      : node.choices.find((choice) => choice.value === status.current?.value);
    const labelId = `${prefix}-${encodeURIComponent(node.id)}-label`;
    const described = node.choices.filter((choice) => choice.description);
    return (
      <div role="group" aria-labelledby={labelId} className={`${s.root} ${a.local}`}>
        <strong id={labelId}>{node.label}</strong>
        <div className={css.rail}>
          {node.choices.map((choice) => (
            <Button
              key={choice.value}
              size="sm"
              variant="outline"
              disabled={status.disabled}
              aria-pressed={recorded ? recorded.value === choice.value : undefined}
              aria-describedby={status.reason || status.current ? status.statusId : undefined}
              onClick={() =>
                onAction?.({
                  ...scope,
                  nodeId: node.id,
                  actionId: node.actionId,
                  value: choice.value,
                })
              }
            >
              {choice.label}
            </Button>
          ))}
        </div>
        {described.length > 0 && (
          <ul className={css.choiceNotes}>
            {described.map((choice) => (
              <li key={choice.value}>
                {choice.label}: {choice.description}
              </li>
            ))}
          </ul>
        )}
        {statusText(status, recorded?.label)}
      </div>
    );
  }
  function renderImage(node: Extract<GeneratedNode, { type: 'image' }>) {
    if (approvedImageOrigin(node.src, imageOrigins))
      // A plain image: the Image component lives in the optional /media entry and its styles.
      return (
        <figure className={css.image}>
          <img src={node.src} alt={node.alt} loading="lazy" referrerPolicy="no-referrer" />
          {node.caption && <figcaption className={s.muted}>{node.caption}</figcaption>}
        </figure>
      );
    return (
      <figure className={css.blockedImage}>
        <p className={s.muted}>
          Image not loaded: the host has not approved {new URL(node.src).origin.slice(0, 200)}.
        </p>
        <figcaption>{node.caption ? `${node.alt}. ${node.caption}` : node.alt}</figcaption>
      </figure>
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
        ) : node.type === 'options' ? (
          renderOptions(node)
        ) : node.type === 'list' ? (
          node.ordered ? (
            <ol className={css.list}>
              {node.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className={css.list}>
              {node.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )
        ) : node.type === 'callout' ? (
          <Alert tone={node.tone}>
            <AlertTitle>{node.title}</AlertTitle>
            {node.text && <AlertDescription>{node.text}</AlertDescription>}
          </Alert>
        ) : node.type === 'steps' ? (
          <div className={s.options}>
            <strong>{node.title}</strong>
            <Stepper as="div" label={node.title} presentation="list" steps={node.steps} />
          </div>
        ) : node.type === 'image' ? (
          renderImage(node)
        ) : node.type === 'metricGroup' ? (
          <div role="group" aria-label={node.title}>
            <strong>{node.title}</strong>
            <dl className={css.metrics}>
              {node.metrics.map((metric, index) => (
                <div key={index}>
                  <dt className={s.muted}>{metric.label}</dt>
                  <dd className={g.metric}>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
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
              ? 'Waiting for confirmation…'
              : 'This result is stale. Refresh before acting.'}
      </p>
      {!surface.nodes.length ? (
        <p className={s.muted}>No generated content reported.</p>
      ) : (
        <div className={variant === 'cards' ? g.cards : s.options}>
          {renderNodes(surface.nodes, 0)}
        </div>
      )}

      {Array.isArray(problems) && problems.length > 0 && (
        <div className={css.problems} role="status" data-part="generated-problems">
          <p className={s.muted}>
            {problems.length === 1
              ? '1 statement could not be shown.'
              : `${Math.min(problems.length, 999)} statements could not be shown.`}
          </p>
          <ul className={css.problemList}>
            {problems.slice(0, 5).map((item, index) => (
              <li key={`${item.line}:${index}`}>
                Line {item.line}: {String(item.message).slice(0, 200)}
              </li>
            ))}
            {problems.length > 5 && <li>and {problems.length - 5} more.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
