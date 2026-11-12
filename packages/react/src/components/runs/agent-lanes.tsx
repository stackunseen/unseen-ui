'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { RunParty } from './shared.js';
import { formatTime } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface LaneTask {
  id: string;
  title: string;
  /** A run lifecycle, such as "running", "succeeded" or "waiting-approval". */
  state: string;
  startedAt: string;
  /** Leave it out while the task runs; the block then reaches the host clock. */
  endedAt?: string;
  /** The task in another lane this one handed off to; a line is drawn between them. */
  handoffTo?: string;
  /** A formatted figure for the block, such as "$0.09". */
  cost?: string;
}
export interface AgentLane {
  agent: RunParty;
  tasks: readonly LaneTask[];
}
export interface AgentLanesProps {
  lanes: readonly AgentLane[];
  /** The host clock; running tasks reach it. Defaults to the latest time present. */
  now?: string;
  /** The time span drawn; defaults to the earliest start and the latest end or now. */
  window?: { from: string; to: string };
  selectedId?: string | null;
  onSelect?: (taskId: string) => void;
  label?: string;
  locale?: string;
  timeZone?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const LANE = 44;
const parse = (value: string | undefined) => {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
};

/**
 * Where every agent is right now: a lane per agent, a block per task on one time axis, and a
 * line for each hand-off between lanes. Times come from the host; nothing is estimated.
 */
export function AgentLanes({
  lanes,
  now,
  window: span,
  selectedId = null,
  onSelect,
  label = 'Agent lanes',
  locale: localeProp,
  timeZone,
  className = '',
}: AgentLanesProps) {
  const locale = useLocale(localeProp);
  const id = useId();
  const tasks = lanes.flatMap((lane, index) =>
    lane.tasks.map((task) => ({ ...task, lane: index, agent: lane.agent })),
  );
  const starts = tasks
    .map((task) => parse(task.startedAt))
    .filter((v): v is number => v !== undefined);
  const ends = tasks.map((task) => parse(task.endedAt)).filter((v): v is number => v !== undefined);
  const clock = parse(now) ?? Math.max(...ends, ...starts, 0);
  const from = parse(span?.from) ?? (starts.length ? Math.min(...starts) : clock);
  const to = parse(span?.to) ?? Math.max(clock, ...ends, from + 1);
  const total = Math.max(1, to - from);
  const x = (ms: number) => Math.min(100, Math.max(0, ((ms - from) / total) * 100));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const placed = tasks.map((task) => {
    const start = parse(task.startedAt) ?? from;
    const end = parse(task.endedAt) ?? clock;
    return { ...task, left: x(start), right: x(Math.max(start, end)), live: !task.endedAt };
  });
  const height = Math.max(1, lanes.length) * LANE;
  const handoffs = placed.flatMap((task) => {
    if (!task.handoffTo) return [];
    const target = placed.find((candidate) => candidate.id === task.handoffTo);
    if (!target) return [];
    return [
      {
        key: `${task.id}-${target.id}`,
        x1: task.right * 10,
        y1: task.lane * LANE + LANE / 2,
        x2: target.left * 10,
        y2: target.lane * LANE + LANE / 2,
      },
    ];
  });
  return (
    <section
      className={`${r.lanes} ${className}`}
      data-part="agent-lanes"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className={r.boardTitle}>
        {label}
      </h2>
      <div className={r.lanesBody} style={{ '--lane-height': `${LANE}px` } as CSSProperties}>
        <div className={r.laneNames} aria-hidden="true">
          {lanes.map((lane) => (
            <span key={lane.agent.id} className={r.laneName}>
              {lane.agent.name}
            </span>
          ))}
        </div>
        <div className={r.laneTracks}>
          <svg
            className={r.laneLinks}
            viewBox={`0 0 1000 ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {handoffs.map((link) => (
              <path
                key={link.key}
                d={`M ${link.x1} ${link.y1} C ${link.x1 + 40} ${link.y1}, ${link.x2 - 40} ${link.y2}, ${link.x2} ${link.y2}`}
              />
            ))}
            {clock >= from && clock <= to && (
              <line x1={x(clock) * 10} x2={x(clock) * 10} y1={0} y2={height} data-now="" />
            )}
          </svg>
          {lanes.map((lane, laneIndex) => (
            <div key={lane.agent.id} className={r.lane} role="group" aria-label={lane.agent.name}>
              {placed
                .filter((task) => task.lane === laneIndex)
                .map((task) => {
                  const selected = selectedId === task.id;
                  const handedFrom = tasks.find((candidate) => candidate.handoffTo === task.id);
                  const spoken = [
                    task.title,
                    task.state.replace('-', ' '),
                    `started ${formatTime(task.startedAt, locale, timeZone) ?? task.startedAt}`,
                    task.endedAt
                      ? `ended ${formatTime(task.endedAt, locale, timeZone) ?? task.endedAt}`
                      : 'still running',
                    task.cost,
                    handedFrom
                      ? `handed off from ${byId.get(handedFrom.id)?.agent.name}`
                      : undefined,
                    task.handoffTo
                      ? `hands off to ${byId.get(task.handoffTo)?.agent.name}`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className={r.laneBlock}
                      data-state={task.state}
                      data-live={task.live || undefined}
                      data-selected={selected || undefined}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={spoken}
                      style={{
                        left: `${task.left}%`,
                        width: `${Math.max(1.5, task.right - task.left)}%`,
                      }}
                      onClick={() => onSelect?.(task.id)}
                    >
                      <span className={r.laneBlockTitle}>{task.title}</span>
                      {task.cost && <span className={r.laneBlockCost}>{task.cost}</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <div className={r.laneAxis} aria-hidden="true">
        <span>{formatTime(new Date(from).toISOString(), locale, timeZone)}</span>
        <span>{formatTime(new Date(to).toISOString(), locale, timeZone)}</span>
      </div>
      {/* A hidden table keeps its intrinsic width, so a 1px box holds it off the page. */}
      <div className={s.srOnly}>
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Agent</th>
              <th scope="col">State</th>
              <th scope="col">Started</th>
              <th scope="col">Ended</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <th scope="row">{task.title}</th>
                <td>{task.agent.name}</td>
                <td>
                  <StatusBadge state={task.state} variant="plain" />
                </td>
                <td>{formatTime(task.startedAt, locale, timeZone) ?? task.startedAt}</td>
                <td>{task.endedAt ? formatTime(task.endedAt, locale, timeZone) : 'Running'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
