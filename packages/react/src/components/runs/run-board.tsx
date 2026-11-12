'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { useEffect, useId, useMemo, useState } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { heartbeatState } from '@stackunseen/ui-core';
import type { CommandReceipt, Measurement, Run, RunLifecycle } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { ElapsedTime } from '../elapsed-time/elapsed-time.js';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatMoney, formatShortTime, formatTime } from './shared.js';
import type { Money, RunParty } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface RunCard {
  run: Run;
  title: string;
  agent?: RunParty;
  owner?: RunParty;
  startedAt?: string;
  updatedAt?: string;
  /** Last time the host heard from the run. Running cards turn stale when it ages past `staleAfterMs`. */
  heartbeatAt?: string;
  /** What the run is blocked on, when the host knows. */
  waitingOn?: { kind: 'approval' | 'input' | 'handoff'; id: string; label: string };
  cost?: Measurement<Money>;
  /** Public activity text only. */
  summary?: string;
  /** The last public steps, oldest first; the board shows the newest three with their times. */
  steps?: readonly RunStep[];
  /** A formatted model name for the card, such as "Opus 5.5". */
  model?: string;
}
export interface RunStep {
  label: string;
  at?: string;
}
export type RunBoardGroup = 'active' | 'waiting' | 'done';
export type RunAction = 'open' | 'pause' | 'resume' | 'cancel';
export interface RunActionRequest {
  runId: string;
  attemptId: string;
  version: number;
  action: RunAction;
}
export interface RunBoardFilter {
  states: readonly RunLifecycle[];
  agentIds: readonly string[];
  query: string;
}
export interface RunBoardProps
  extends VariantProps<'RunBoard'>, Omit<ComponentProps<'section'>, 'onSelect'> {
  runs: readonly RunCard[];
  filter?: RunBoardFilter;
  onFilterChange?: (filter: RunBoardFilter) => void;
  selectedId?: string | null;
  onSelect?: (runId: string) => void;
  /** A link for each card, so it can open in a new tab; a plain click still calls onSelect. */
  hrefFor?: (card: RunCard) => string | undefined;
  onAction?: (request: RunActionRequest) => void;
  /** Receipts for actions already requested; a pending receipt disables the card's actions. */
  receipts?: readonly CommandReceipt[];
  /** Heartbeat age after which a running card is marked stale. Defaults to five minutes. */
  staleAfterMs?: number;
  /** The host clock, for deterministic rendering. Defaults to the browser clock on the client. */
  now?: string;
  locale?: string;
  timeZone?: string;
  label?: string;
  /** Keeps the label for screen readers only, when the page already shows what the list is. */
  hideLabel?: boolean;
  emptyMessage?: string;
  /** Trusted extra content at the end of each card's title row, such as a DiffStat. */
  renderCardTrailing?: (card: RunCard) => ReactNode;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const groups: { id: RunBoardGroup; label: string; states: RunLifecycle[] }[] = [
  { id: 'active', label: 'Active', states: ['queued', 'running', 'paused'] },
  { id: 'waiting', label: 'Waiting for you', states: ['waiting-input', 'waiting-approval'] },
  { id: 'done', label: 'Finished', states: ['succeeded', 'failed', 'cancelled'] },
];
const allStates = groups.flatMap((group) => group.states);
export const emptyRunBoardFilter: RunBoardFilter = { states: [], agentIds: [], query: '' };

function matches(card: RunCard, filter: RunBoardFilter) {
  if (filter.states.length && !filter.states.includes(card.run.lifecycle)) return false;
  if (filter.agentIds.length && !(card.agent && filter.agentIds.includes(card.agent.id)))
    return false;
  const query = filter.query.trim().toLocaleLowerCase();
  if (query) {
    const text =
      `${card.title} ${card.summary ?? ''} ${card.agent?.name ?? ''}`.toLocaleLowerCase();
    if (!text.includes(query)) return false;
  }
  return true;
}
function actionsFor(lifecycle: RunLifecycle): RunAction[] {
  switch (lifecycle) {
    case 'running':
      return ['pause', 'cancel'];
    case 'paused':
      return ['resume', 'cancel'];
    case 'queued':
    case 'waiting-input':
    case 'waiting-approval':
      return ['cancel'];
    default:
      return [];
  }
}
const actionLabels: Record<RunAction, string> = {
  open: 'Open',
  pause: 'Pause',
  resume: 'Resume',
  cancel: 'Cancel',
};

/** Runs across threads as a board, a list or a compact list. The host owns order, filters and actions. */
export function RunBoard({
  variant = 'board',
  runs,
  filter = emptyRunBoardFilter,
  onFilterChange,
  selectedId = null,
  onSelect,
  hrefFor,
  onAction,
  receipts = [],
  staleAfterMs = 5 * 60_000,
  now,
  locale: localeProp,
  timeZone,
  label = 'Runs',
  hideLabel = false,
  emptyMessage = 'No runs.',
  renderCardTrailing,
  className = '',
  ...rest
}: RunBoardProps) {
  const locale = useLocale(localeProp);
  // Without a host time zone, times read in the viewer's own once the page runs; the first
  // render uses UTC so server and browser agree.
  const [viewerZone, setViewerZone] = useState<string>();
  useEffect(() => setViewerZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const zone = timeZone ?? viewerZone;
  // Short list times need a clock both renders agree on: the host's, or the browser's once running.
  const shortClock = now ? Date.parse(now) : viewerZone ? Date.now() : undefined;
  const id = useId();
  const clock = now ?? (typeof window === 'undefined' ? undefined : new Date().toISOString());
  const shown = useMemo(() => runs.filter((card) => matches(card, filter)), [runs, filter]);
  const agents = useMemo(() => {
    const map = new Map<string, RunParty>();
    for (const card of runs) if (card.agent) map.set(card.agent.id, card.agent);
    return [...map.values()];
  }, [runs]);
  const pending = new Set(
    receipts
      .filter((receipt) => receipt.status === 'submitting')
      .map((receipt) => receipt.commandId),
  );
  const columns = groups
    .map((group) => ({
      ...group,
      cards: shown.filter((card) => group.states.includes(card.run.lifecycle)),
    }))
    .filter((group) => variant === 'board' || group.cards.length > 0);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-run-opener]');
    if (!opener) return;
    const column = opener.closest<HTMLElement>('[data-run-column]');
    if (!column) return;
    const inColumn = [...column.querySelectorAll<HTMLElement>('[data-run-opener]')];
    const index = inColumn.indexOf(opener);
    const columnsList = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-run-column]')];
    const columnIndex = columnsList.indexOf(column);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = inColumn[index + 1];
    else if (event.key === 'ArrowUp') next = inColumn[index - 1];
    else if (event.key === 'Home') next = inColumn[0];
    else if (event.key === 'End') next = inColumn[inColumn.length - 1];
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      for (let i = columnIndex + step; i >= 0 && i < columnsList.length; i += step) {
        const first = columnsList[i]!.querySelector<HTMLElement>('[data-run-opener]');
        if (first) {
          next = first;
          break;
        }
      }
    } else return;
    if (next && next !== opener) {
      event.preventDefault();
      next.focus();
    }
  }

  const activeStates = new Set(filter.states);
  const facetCount = filter.states.length + filter.agentIds.length;
  // The host owns the filter; these only report the toggled value back.
  const toggleState = (state: RunLifecycle) =>
    onFilterChange?.({
      ...filter,
      states: activeStates.has(state)
        ? filter.states.filter((item) => item !== state)
        : [...filter.states, state],
    });
  const toggleAgent = (agentId: string) =>
    onFilterChange?.({
      ...filter,
      agentIds: filter.agentIds.includes(agentId)
        ? filter.agentIds.filter((item) => item !== agentId)
        : [...filter.agentIds, agentId],
    });
  // Rendered inline on wide boards and inside the Filters popover on narrow ones.
  const facets = (where: 'inline' | 'popover') => (
    <div className={r.facets}>
      <div className={r.facet} role="group" aria-labelledby={`${id}-${where}-state`}>
        <span id={`${id}-${where}-state`} className={r.facetLabel}>
          State
        </span>
        <div className={r.chips}>
          {allStates.map((state) => (
            <button
              key={state}
              type="button"
              className={r.chip}
              aria-pressed={activeStates.has(state)}
              onClick={() => toggleState(state)}
            >
              {state.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      {agents.length > 1 && (
        <div className={r.facet} role="group" aria-labelledby={`${id}-${where}-agent`}>
          <span id={`${id}-${where}-agent`} className={r.facetLabel}>
            Agent
          </span>
          <div className={r.chips}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={r.chip}
                aria-pressed={filter.agentIds.includes(agent.id)}
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  return (
    <section
      {...rest}
      className={`${r.board} ${className}`}
      data-part="run-board"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={r.boardHead}>
        <h2 id={`${id}-title`} className={hideLabel ? r.hiddenTitle : r.boardTitle}>
          {label}
        </h2>
        {onFilterChange && (
          <div className={r.filters} role="group" aria-label="Filter runs">
            <input
              className={r.search}
              type="search"
              aria-label="Search runs"
              placeholder="Search runs"
              value={filter.query}
              onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
            />
            <div className={r.facetsInline}>{facets('inline')}</div>
            <Popover>
              <PopoverTrigger
                className={r.filtersTrigger}
                data-active={facetCount > 0 || undefined}
                aria-label={facetCount > 0 ? `Filters, ${facetCount} active` : undefined}
              >
                Filters
                {facetCount > 0 && <span className={r.filtersCount}>{facetCount}</span>}
              </PopoverTrigger>
              <PopoverContent title="Filters" headingLevel={3} className={r.filtersPopover}>
                {facets('popover')}
              </PopoverContent>
            </Popover>
            {(filter.states.length > 0 || filter.agentIds.length > 0 || filter.query) && (
              <Button size="sm" variant="ghost" onClick={() => onFilterChange(emptyRunBoardFilter)}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <p className={s.muted} role="status">
          {runs.length === 0 ? emptyMessage : 'No runs match the current filters.'}
        </p>
      ) : (
        <div className={r.columns} onKeyDown={move}>
          {columns.map((group) => (
            <div key={group.id} className={r.column} data-run-column={group.id}>
              <h3 className={r.columnTitle} id={`${id}-${group.id}`}>
                {group.label}
                <span className={r.count} aria-label={`${group.cards.length} runs`}>
                  {group.cards.length}
                </span>
              </h3>
              <ul className={r.cards} aria-labelledby={`${id}-${group.id}`}>
                {group.cards.length === 0 && (
                  <li className={`${s.muted} ${r.emptyColumn}`}>Nothing here.</li>
                )}
                {group.cards.map((card) => {
                  const stale =
                    card.run.lifecycle === 'running' &&
                    heartbeatState(card.heartbeatAt, clock, staleAfterMs) === 'stale';
                  const commandId = `${card.run.id}:${card.run.attemptId}`;
                  const busy = pending.has(commandId);
                  const selected = selectedId === card.run.id;
                  return (
                    <li key={card.run.id} data-run-card={card.run.id}>
                      <article
                        className={r.card}
                        data-selected={selected || undefined}
                        data-stale={stale || undefined}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <div className={r.cardHead}>
                          {(() => {
                            const open = () => {
                              onSelect?.(card.run.id);
                              onAction?.({
                                runId: card.run.id,
                                attemptId: card.run.attemptId,
                                version: card.run.version,
                                action: 'open',
                              });
                            };
                            const href = hrefFor?.(card);
                            return href ? (
                              <a
                                href={href}
                                className={r.opener}
                                data-run-opener
                                onClick={(event) => {
                                  // Ctrl, Cmd, Shift and middle clicks open a new tab as links do.
                                  if (
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey ||
                                    event.altKey
                                  )
                                    return;
                                  if (onSelect || onAction) {
                                    event.preventDefault();
                                    open();
                                  }
                                }}
                              >
                                {card.title}
                              </a>
                            ) : (
                              <button
                                type="button"
                                className={r.opener}
                                data-run-opener
                                onClick={open}
                              >
                                {card.title}
                              </button>
                            );
                          })()}
                          <StatusBadge
                            state={stale ? 'blocked' : card.run.lifecycle}
                            label={stale ? 'No recent update' : undefined}
                          />
                          {renderCardTrailing?.(card)}
                        </div>
                        {variant !== 'compact' && (
                          <div className={r.cardMeta}>
                            {/* A list row keeps to two lines: what it is about and when, beside each other. */}
                            {variant === 'list' && card.summary && <span>{card.summary}</span>}
                            {card.agent && <span>{card.agent.name}</span>}
                            {card.owner && <span>Owner: {card.owner.name}</span>}
                            {card.updatedAt &&
                              (variant === 'list' ? (
                                <time
                                  dateTime={card.updatedAt}
                                  title={`Updated ${formatTime(card.updatedAt, locale, zone)}`}
                                >
                                  {formatShortTime(card.updatedAt, locale, zone, shortClock)}
                                </time>
                              ) : (
                                <span>Updated {formatTime(card.updatedAt, locale, zone)}</span>
                              ))}
                            {stale && card.heartbeatAt && (
                              <span className={r.stale}>
                                No update since {formatTime(card.heartbeatAt, locale, zone)}
                              </span>
                            )}
                            {card.cost && (
                              <span>
                                Cost:{' '}
                                <MeasuredText
                                  measurement={card.cost}
                                  format={(value) => formatMoney(value, locale)}
                                />
                              </span>
                            )}
                            {card.model && <span>{card.model}</span>}
                            {card.startedAt &&
                              (card.run.lifecycle === 'running' || card.updatedAt) && (
                                <span className={r.elapsed}>
                                  {/* With a host clock the figure is the host's; without one a running card ticks. */}
                                  <ElapsedTime
                                    startedAt={card.startedAt}
                                    endedAt={
                                      card.run.lifecycle === 'running'
                                        ? (now ?? undefined)
                                        : card.updatedAt
                                    }
                                  />
                                </span>
                              )}
                          </div>
                        )}
                        {variant === 'board' && card.steps && card.steps.length > 0 && (
                          <ol className={r.cardSteps} aria-label="Latest steps">
                            {card.steps.slice(-3).map((step, index) => (
                              <li key={`${step.at ?? ''}-${index}`}>
                                <span>{step.label}</span>
                                {step.at && (
                                  <time dateTime={step.at} className={r.stepTime}>
                                    {formatShortTime(step.at, locale, zone, shortClock)}
                                  </time>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                        {variant !== 'compact' && variant !== 'list' && card.summary && (
                          <p className={r.cardSummary}>{card.summary}</p>
                        )}
                        {card.waitingOn && (
                          <p className={r.waiting} data-kind={card.waitingOn.kind}>
                            Waiting on {card.waitingOn.kind}: {card.waitingOn.label}
                          </p>
                        )}
                        {onAction && actionsFor(card.run.lifecycle).length > 0 && (
                          <div className={r.cardActions}>
                            {actionsFor(card.run.lifecycle).map((action) => (
                              <Button
                                key={action}
                                size="sm"
                                variant={action === 'cancel' ? 'ghost' : 'outline'}
                                disabled={busy}
                                aria-label={`${actionLabels[action]} ${card.title}`}
                                onClick={() =>
                                  onAction({
                                    runId: card.run.id,
                                    attemptId: card.run.attemptId,
                                    version: card.run.version,
                                    action,
                                  })
                                }
                              >
                                {actionLabels[action]}
                              </Button>
                            ))}
                            {busy && (
                              <span className={s.muted} role="status">
                                Waiting for the host…
                              </span>
                            )}
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
