import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubagentTree, branchCost } from './subagent-tree.js';
import type { RunNode } from './subagent-tree.js';

const run = (id: string, lifecycle: 'running' | 'succeeded' = 'succeeded') => ({
  id,
  attemptId: 'a1',
  threadId: 't',
  version: 1,
  lifecycle,
});
const tree: RunNode = {
  run: run('root', 'running'),
  title: 'Launch',
  cost: { kind: 'measured', value: { amount: 0.14, currency: 'USD' } },
  children: [
    {
      run: run('child'),
      title: 'Research',
      cost: { kind: 'estimated', value: { amount: 0.09, currency: 'USD' }, basis: 'prices' },
      children: [
        {
          run: run('grandchild'),
          title: 'Scrape',
          cost: { kind: 'measured', value: { amount: 0.01, currency: 'USD' } },
          children: [],
        },
      ],
    },
  ],
};

describe('branch cost', () => {
  it('adds a branch up and marks it estimated when any part is', () => {
    expect(branchCost(tree)).toEqual({
      kind: 'estimated',
      value: { amount: 0.24, currency: 'USD' },
      basis: 'the runs it contains',
    });
    expect(branchCost(tree.children[0]!.children[0]!)).toEqual({
      kind: 'measured',
      value: { amount: 0.01, currency: 'USD' },
    });
  });
  it('is unknown for mixed currencies or an unreported part', () => {
    const mixed: RunNode = {
      ...tree,
      children: [
        {
          run: run('eur'),
          title: 'Euro',
          cost: { kind: 'measured', value: { amount: 1, currency: 'EUR' } },
          children: [],
        },
      ],
    };
    expect(branchCost(mixed)?.kind).toBe('unknown');
    const partial: RunNode = {
      ...tree,
      children: [{ run: run('x'), title: 'No cost', cost: { kind: 'unknown' }, children: [] }],
    };
    expect(branchCost(partial)?.kind).toBe('unknown');
    expect(branchCost({ run: run('bare'), title: 'Bare', children: [] })).toBeUndefined();
  });
  it('prints each run cost and the branch total in the tree', () => {
    render(<SubagentTree root={tree} now="2026-10-15T10:00:00.000Z" />);
    const root = screen.getByRole('treeitem', { name: 'Launch' });
    expect(root).toHaveTextContent('$0.14');
    expect(root).toHaveTextContent(/~\$0\.24, estimated from the runs it contains with sub-agents/);
  });
});
