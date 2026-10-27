/**
 * The agent operations set: the components for watching many runs at once, named together on
 * the catalog index so the set reads as one thing. The pattern page composes four of them.
 */
export const agentOperationsCollection = {
  id: 'agent-operations',
  title: 'Agent operations',
  description:
    'Every run on one board, a lane per agent, a waterfall of one run, the tree of who started whom, and the plan, context and queue around them. Each shows the state your server reports; a click requests, it never completes.',
  components: [
    'RunBoard',
    'AgentLanes',
    'SubagentTree',
    'ExecutionTimeline',
    'WorkflowGraph',
    'AttentionQueue',
    'RunCompare',
    'ContextBar',
    'Plan',
    'AgentSteering',
    'CostLedger',
    'ContextWindowMeter',
    'MemoryPanel',
  ],
  pattern: { label: 'Agent operations pattern', href: '/patterns/agent-operations/' },
  task: { label: 'Build it by task', href: '/tasks/runs/' },
} as const;
