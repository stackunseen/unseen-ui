'use client';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { heartbeatState } from '@stackunseen/ui-core';
import type { Run } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import type { RunParty } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface RunNode {
  run: Run;
  title: string;
  agent?: RunParty;
  heartbeatAt?: string;
  /** The parent message that spawned this run, when the host knows. */
  spawnedBy?: { messageId: string; excerpt: string };
  children: readonly RunNode[];
  /** True when the host has more children it has not sent yet. */
  hasMore?: boolean;
}
export interface SubagentTreeProps extends VariantProps<'SubagentTree'> {
  root: RunNode;
  selectedId?: string | null;
  onSelect?: (runId: string) => void;
  /** Ask the host for children it has not sent, for a node with `hasMore` or beyond `maxDepth`. */
  onLoadMore?: (runId: string) => void;
  /** Levels drawn before the tree asks the host for more. Defaults to 6. */
  maxDepth?: number;
  expandedIds?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  staleAfterMs?: number;
  now?: string;
  label?: string;
}

function countDescendants(node: RunNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

/** Parent and child runs as a tree with the message that spawned each child. */
export function SubagentTree({
  variant = 'tree',
  root,
  selectedId = null,
  onSelect,
  onLoadMore,
  maxDepth = 6,
  expandedIds,
  onExpandedChange,
  staleAfterMs = 5 * 60_000,
  now,
  label = 'Agent runs',
}: SubagentTreeProps) {
  const id = useId();
  const clock = now ?? (typeof window === 'undefined' ? undefined : new Date().toISOString());
  const [localExpanded, setLocalExpanded] = useState<string[]>(() => [root.run.id]);
  const expanded = new Set(expandedIds ?? localExpanded);
  const treeRef = useRef<HTMLUListElement>(null);
  const setExpanded = (next: Set<string>) => {
    const ids = [...next];
    setLocalExpanded(ids);
    onExpandedChange?.(ids);
  };
  const toggle = (runId: string) => {
    const next = new Set(expanded);
    if (next.has(runId)) next.delete(runId);
    else next.add(runId);
    setExpanded(next);
  };

  function items() {
    return [...(treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
  }
  function keyboard(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[role="treeitem"]');
    if (!item || item !== target) return;
    const runId = item.dataset.runId!;
    const list = items();
    const index = list.indexOf(item);
    const hasChildren = item.getAttribute('aria-expanded') !== null;
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = list[index + 1];
        break;
      case 'ArrowUp':
        next = list[index - 1];
        break;
      case 'Home':
        next = list[0];
        break;
      case 'End':
        next = list[list.length - 1];
        break;
      case 'ArrowRight':
        if (hasChildren && !expanded.has(runId)) {
          toggle(runId);
          event.preventDefault();
          return;
        }
        if (hasChildren) next = list[index + 1];
        break;
      case 'ArrowLeft':
        if (hasChildren && expanded.has(runId)) {
          toggle(runId);
          event.preventDefault();
          return;
        }
        next = item.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
        break;
      case 'Enter':
      case ' ':
        onSelect?.(runId);
        event.preventDefault();
        return;
      default: {
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const needle = event.key.toLocaleLowerCase();
          const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
          next = ordered.find((candidate) =>
            (candidate.dataset.title ?? '').toLocaleLowerCase().startsWith(needle),
          );
        }
      }
    }
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  function renderNode(node: RunNode, depth: number, position: number, setSize: number) {
    const hasChildren = node.children.length > 0 || !!node.hasMore;
    const open = expanded.has(node.run.id);
    const beyond = depth >= maxDepth && node.children.length > 0;
    const stale =
      node.run.lifecycle === 'running' &&
      heartbeatState(node.heartbeatAt, clock, staleAfterMs) === 'stale';
    const selected = selectedId === node.run.id;
    return (
      <li
        key={node.run.id}
        role="treeitem"
        tabIndex={depth === 0 ? 0 : -1}
        aria-level={depth + 1}
        aria-posinset={position}
        aria-setsize={setSize}
        aria-expanded={hasChildren && !beyond ? open : undefined}
        aria-selected={selected}
        aria-current={selected ? 'true' : undefined}
        aria-labelledby={`${id}-${node.run.id}`}
        data-run-id={node.run.id}
        data-title={node.title}
        data-stale={stale || undefined}
        className={r.treeItem}
        onKeyDown={undefined}
      >
        <div className={r.treeRow} style={{ '--tree-depth': depth } as React.CSSProperties}>
          {hasChildren && !beyond ? (
            <button
              type="button"
              className={r.treeToggle}
              tabIndex={-1}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${node.title}`}
              onClick={(event) => {
                event.stopPropagation();
                toggle(node.run.id);
              }}
            >
              <AIIcon name={open ? 'collapse' : 'expand'} size={12} />
            </button>
          ) : (
            <span className={r.treeToggle} aria-hidden="true" />
          )}
          <button
            type="button"
            id={`${id}-${node.run.id}`}
            className={r.opener}
            tabIndex={-1}
            onClick={() => onSelect?.(node.run.id)}
          >
            {node.title}
          </button>
          <StatusBadge
            state={stale ? 'blocked' : node.run.lifecycle}
            label={stale ? 'No recent update' : undefined}
          />
          {variant !== 'compact' && node.agent && (
            <span className={r.treeMeta}>{node.agent.name}</span>
          )}
        </div>
        {variant !== 'compact' && node.spawnedBy && (
          <p className={r.treeSpawn} style={{ '--tree-depth': depth } as React.CSSProperties}>
            From: “{node.spawnedBy.excerpt}”
          </p>
        )}
        {hasChildren && !beyond && open && (
          <ul role="group" className={r.treeGroup}>
            {node.children.map((child, index) =>
              renderNode(
                child,
                depth + 1,
                index + 1,
                node.children.length + (node.hasMore ? 1 : 0),
              ),
            )}
            {node.hasMore && (
              <li
                role="none"
                className={r.treeMore}
                style={{ '--tree-depth': depth + 1 } as React.CSSProperties}
              >
                {onLoadMore ? (
                  <Button size="sm" variant="ghost" onClick={() => onLoadMore(node.run.id)}>
                    Load more runs
                  </Button>
                ) : (
                  <span className={s.muted}>More runs not loaded.</span>
                )}
              </li>
            )}
          </ul>
        )}
        {beyond && (
          <p className={r.treeMore} style={{ '--tree-depth': depth + 1 } as React.CSSProperties}>
            {countDescendants(node)} more runs below this level.{' '}
            {onLoadMore && (
              <Button size="sm" variant="ghost" onClick={() => onLoadMore(node.run.id)}>
                Show them
              </Button>
            )}
          </p>
        )}
      </li>
    );
  }

  return (
    <section className={r.tree} data-part="subagent-tree" data-variant={variant}>
      <h2 id={`${id}-title`} className={r.boardTitle}>
        {label}
      </h2>
      <ul
        ref={treeRef}
        role="tree"
        aria-labelledby={`${id}-title`}
        className={r.treeGroup}
        onKeyDown={keyboard}
      >
        {renderNode(root, 0, 1, 1)}
      </ul>
    </section>
  );
}
