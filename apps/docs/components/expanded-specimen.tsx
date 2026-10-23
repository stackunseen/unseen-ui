'use client';
import { lazy, Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { VoiceSpecimen } from './voice-specimen';
import type { NavigationAvailability, NavigationOperation } from '@stackunseen/ui-core';
import {
  Button,
  SlashCommandMenu,
  MentionPicker,
  AccessModeSelector,
  CodeDiff,
  TestResults,
  ThreadList,
  BranchSwitcher,
  MessageQueue,
  ReviewChanges,
  MemoryControls,
  ArtifactDiff,
  AuditTrail,
  RunInspector,
  resolveVariant,
} from '@stackunseen/ui';
import type { QueuedMessage, ThreadSummary } from '@stackunseen/ui';
import { MarkdownCodeBlock } from '@stackunseen/ui/code';
import { HandoffSpecimen } from './scoped-decision-specimen';
import { FormSpecimen } from './form-specimen';
import { GeneratedSpecimen } from './generated-specimen';
import { ChartSpecimen } from './chart-specimen';
import { FileSpecimen } from './file-specimen';
import { WorkflowSpecimen } from './workflow-specimen';
import { ExampleLoading } from './example-loading';
import {
  commands,
  references,
  accessModes,
  before,
  after,
  diagrams,
  richMarkdown,
} from '../lib/coding-fixtures';

const HighlightedCodeBlock = lazy(() =>
  import('@stackunseen/ui/highlight').then((m) => ({ default: m.HighlightedCodeBlock })),
);
const HighlightedCodeDiff = lazy(() =>
  import('@stackunseen/ui/highlight').then((m) => ({ default: m.HighlightedCodeDiff })),
);
const RichMarkdownResponse = lazy(() =>
  import('@stackunseen/ui/rich-markdown').then((m) => ({ default: m.RichMarkdownResponse })),
);
const MathFormula = lazy(() =>
  import('@stackunseen/ui/math').then((m) => ({ default: m.MathFormula })),
);
const MermaidDiagram = lazy(() =>
  import('@stackunseen/ui/mermaid').then((m) => ({ default: m.MermaidDiagram })),
);
const MarkdownSpecimen = dynamic(
  () => import('./markdown-specimen').then((m) => m.MarkdownSpecimen),
  { loading: ExampleLoading },
);
const TerminalSpecimen = dynamic(
  () => import('./terminal-specimen').then((m) => m.TerminalSpecimen),
  { loading: ExampleLoading },
);

function DiffLifecycleSpecimen({ presentation }: { presentation?: string }) {
  const [revision, setRevision] = useState(1);
  const [denied, setDenied] = useState(false);
  return (
    <div data-part="diff-lifecycle-fixture">
      <p>Synthetic host snapshot · revision {revision}</p>
      <div className="specimen-controls">
        <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
          Next version
        </Button>
        <Button variant="outline" onClick={() => setDenied((value) => !value)}>
          {denied ? 'Restore comparison access' : 'Revoke comparison access'}
        </Button>
      </div>
      <HighlightedCodeDiff
        variant={resolveVariant('CodeDiff', presentation)}
        path={revision === 1 ? 'src/a.ts' : 'src/b.ts'}
        baseVersion="base-1"
        nextVersion={`next-${revision}`}
        before={'const value = "base";\n'}
        after={`const value = "revision ${revision}";\n`}
        language="ts"
        status={denied ? 'denied' : 'ready'}
      />
    </div>
  );
}

export function ExpandedSpecimen({
  name,
  state = 'Default',
  presentation,
}: {
  name: string;
  state?: string;
  presentation?: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState('read');
  const [selection, setSelection] = useState<string[]>(['search']);
  const [feedback, setFeedback] = useState('');
  const navContext = {
    workspaceId: 'gallery-conversation',
    snapshotId: 'snapshot-1',
    version: '1',
    threadId: '1',
    branchId: 'revision',
  };
  const navState = {
    context: navContext,
    status:
      (
        {
          Denied: 'denied',
          Loading: 'loading',
          Unavailable: 'unavailable',
          Unknown: 'unknown',
          Stale: 'stale',
        } as Record<string, NavigationAvailability>
      )[state] ?? 'ready',
    connection: state === 'Disconnected' ? ('disconnected' as const) : ('connected' as const),
    operation: ['Outcome unknown', 'Obsolete request'].includes(state)
      ? ({
          context:
            state === 'Obsolete request'
              ? { ...navContext, snapshotId: 'old-snapshot' }
              : navContext,
          requestId: 'fixture-request',
          state: 'outcome-unknown',
        } as NavigationOperation)
      : undefined,
    onReconcile: () => setFeedback('Original sample request checked; no transport invoked.'),
  };
  const [stage, setStage] = useState('');
  const [versions, setVersions] = useState({
    beforeId: 'v1',
    afterId: state === 'No changes' ? 'v1' : 'v2',
  });
  const [threads, setThreads] = useState<ThreadSummary[]>([
    {
      id: '1',
      title:
        state === 'Long titles'
          ? 'Review search accessibility and keyboard interactions across the customer administration workspace'
          : 'Review the search change',
      version: '1',
      detail: 'Updated just now',
      pending: state === 'Pending',
    },
    {
      id: '2',
      title:
        state === 'Long titles'
          ? 'PlanTheCustomerAdministrationSettingsAndPermissionManagementScreenWithCompleteRequirements'
          : 'Plan the settings screen',
      version: '1',
      detail:
        state === 'Long titles'
          ? 'A longer secondary description with workspace and ownership details'
          : 'Yesterday',
    },
  ]);
  const [queue, setQueue] = useState<QueuedMessage[]>([
    {
      id: 'q1',
      version: '1',
      text:
        state === 'Long drafts'
          ? 'Review search accessibility, keyboard interactions, and the placement of actions within the customer administration workspace.\n\nCustomerAdministrationSearchAndPermissionManagementWithoutBreakingLongIdentifiers'.repeat(
              3,
            )
          : 'Add tests for empty search queries.',
      state:
        state === 'Sending'
          ? 'sending'
          : state === 'Failed'
            ? 'failed'
            : state === 'Cancelled'
              ? 'cancelled'
              : 'queued',
      pending: state === 'Pending',
      error: state === 'Failed' ? 'This draft wasn’t accepted. Check it and try again.' : undefined,
    },
    {
      id: 'q2',
      version: '1',
      text: 'Review the accessibility of the search field.',
      state: 'queued',
    },
  ]);
  const empty = state === 'Empty',
    loading = state === 'Loading',
    failed = state === 'Error';
  const status = loading ? 'loading' : failed ? 'error' : 'ready';
  const emit = (message: string) => setFeedback(`Synthetic host: ${message}`);
  let content;
  switch (name) {
    case 'SlashCommandMenu':
      content = (
        <SlashCommandMenu
          variant={resolveVariant('SlashCommandMenu', presentation)}
          items={
            empty
              ? []
              : state === 'Unavailable'
                ? commands.map((item) => ({
                    ...item,
                    disabledReason: 'Unavailable in this workspace.',
                  }))
                : commands
          }
          query={query}
          onQueryChange={setQuery}
          onSelect={(item) => emit(`/${item.label} selected`)}
          status={status}
        />
      );
      break;
    case 'MentionPicker':
      content = (
        <MentionPicker
          variant={resolveVariant('MentionPicker', presentation)}
          items={
            empty
              ? []
              : state === 'Unavailable'
                ? references.map((item) => ({
                    ...item,
                    disabledReason: 'Reference access revoked.',
                  }))
                : references
          }
          query={query}
          onQueryChange={setQuery}
          onSelect={(item) => emit(`@${item.label} · version ${item.version} selected`)}
          status={status}
        />
      );
      break;
    case 'AccessModeSelector':
      content = (
        <AccessModeSelector
          variant={resolveVariant('AccessModeSelector', presentation)}
          modes={accessModes}
          value={mode}
          scope="ai-components workspace"
          version="policy-4"
          status={
            state === 'Pending'
              ? 'pending'
              : state === 'Stale'
                ? 'stale'
                : failed
                  ? 'error'
                  : 'ready'
          }
          onRequest={(request) => {
            setMode(request.modeId);
            emit(`access request acknowledged for ${request.scope}`);
          }}
        />
      );
      break;
    case 'VoiceControl':
      content = (
        <VoiceSpecimen key={state} state={state} presentation={presentation} onEvent={emit} />
      );
      break;
    case 'FileExplorer':
      content = <FileSpecimen state={state} presentation={presentation} onEvent={emit} />;
      break;
    case 'CodeDiff': {
      if (state === 'Live versions') {
        content = <DiffLifecycleSpecimen presentation={presentation} />;
        break;
      }
      const View = state === 'Default' ? CodeDiff : HighlightedCodeDiff;
      content = (
        <View
          variant={resolveVariant('CodeDiff', presentation)}
          path="src/search.ts"
          before={
            state === 'Multiline'
              ? '/* old comment\nshared comment line\n*/\nconst value = 1;\n'
              : state === 'Replacements'
                ? 'same\nold one\nold two\nend\n'
                : state === 'CRLF source'
                  ? 'const value = "old";\r\n'
                  : state === 'Untrusted HTML'
                    ? '<img src="https://example.invalid/diff-image" onerror="alert(1)">'
                    : before
          }
          after={
            state === 'No changes'
              ? before
              : state === 'Large diff'
                ? 'Large source\n'.repeat(6000)
                : state === 'Multiline'
                  ? '/* new comment\nshared comment line\n*/\nconst value = 2;\n'
                  : state === 'Replacements'
                    ? 'same\nnew one\nnew two\nnew three\nend\n'
                    : state === 'CRLF source'
                      ? 'const value = "new";\r\n'
                      : state === 'Highlight limit'
                        ? 'const value = 1;\n'.repeat(310)
                        : state === 'Untrusted HTML'
                          ? '<script>alert("inert")</script>'
                          : after
          }
          baseVersion="a1"
          nextVersion={state === 'Invalid version' ? 'a1' : 'b2'}
          status={
            state === 'Conflict'
              ? 'conflict'
              : state === 'Denied'
                ? 'denied'
                : state === 'Error'
                  ? 'error'
                  : state === 'Unavailable'
                    ? 'unavailable'
                    : loading
                      ? 'loading'
                      : 'ready'
          }
          {...(state === 'Default'
            ? {}
            : {
                language:
                  state === 'Unsupported language'
                    ? 'unknown'
                    : state === 'Untrusted HTML'
                      ? 'html'
                      : 'typescript',
              })}
        />
      );
      break;
    }
    case 'TerminalOutput':
      content = (
        <TerminalSpecimen key={state} state={state} presentation={presentation} onEvent={emit} />
      );
      break;
    case 'TestResults':
      content = (
        <TestResults
          variant={resolveVariant('TestResults', presentation)}
          loading={loading}
          results={
            empty
              ? []
              : [
                  {
                    id: 'one',
                    name: 'normalizes whitespace',
                    state: 'passed',
                    durationMs: 4,
                    file: 'tests/search.test.ts',
                  },
                  {
                    id: 'two',
                    name: 'handles empty queries',
                    state:
                      state === 'Failed' ? 'failed' : state === 'Running' ? 'running' : 'passed',
                    durationMs: state === 'Running' ? undefined : 7,
                    detail:
                      state === 'Failed'
                        ? 'Expected an empty string. Received undefined.\n  at tests/search.test.ts:18'
                        : undefined,
                    file: 'tests/search.test.ts',
                  },
                ]
          }
          onOpenFile={(file) => emit(`opened ${file}`)}
        />
      );
      break;
    case 'ThreadList':
      content = (
        <ThreadList
          {...navState}
          variant={resolveVariant('ThreadList', presentation)}
          {...(state === 'Date groups'
            ? {
                groupBy: 'date' as const,
                now: '2026-10-21T12:00:00.000Z',
                actions: (
                  <Button size="sm" variant="outline" onClick={() => emit('new chat requested')}>
                    New chat
                  </Button>
                ),
              }
            : {})}
          threads={
            empty
              ? []
              : state === 'Date groups'
                ? threads.map((thread, index) => ({
                    ...thread,
                    pinned: index === 0,
                    updatedAt: new Date(
                      Date.parse('2026-10-21T11:00:00.000Z') - index * 3 * 24 * 3600_000,
                    ).toISOString(),
                  }))
                : state === 'Invalid window'
                  ? [threads[0]!, threads[0]!]
                  : threads.filter((thread) =>
                      thread.title.toLowerCase().includes(query.toLowerCase()),
                    )
          }
          selectedId={selected || '1'}
          query={query}
          onQueryChange={setQuery}
          onSelect={(thread) => setSelected(thread.id)}
          onRename={
            state === 'Read-only'
              ? undefined
              : (thread, title) => {
                  setThreads(
                    threads.map((item) =>
                      item.id === thread.id
                        ? { ...item, title, version: String(Number(item.version) + 1) }
                        : item,
                    ),
                  );
                  emit('rename acknowledged');
                }
          }
          onArchive={
            state === 'Read-only'
              ? undefined
              : (thread) => {
                  setThreads(threads.filter((item) => item.id !== thread.id));
                  emit('archive acknowledged');
                }
          }
          loading={loading}
          error={failed ? 'Conversation history could not be loaded.' : undefined}
          pagination={
            ['Paged', 'Unknown total'].includes(state)
              ? {
                  pageIndex: 0,
                  pageSize: threads.length,
                  totalItems: state === 'Paged' ? threads.length * 2 : undefined,
                  hasNextPage: true,
                }
              : undefined
          }
          onPageChange={() => emit('Next page requested. The current page stays until it arrives.')}
        />
      );
      break;
    case 'BranchSwitcher':
      content = (
        <BranchSwitcher
          {...navState}
          variant={resolveVariant('BranchSwitcher', presentation)}
          branches={
            empty
              ? []
              : state === 'Invalid window'
                ? [
                    { id: 'duplicate', label: 'Invalid branch', version: '1' },
                    { id: 'duplicate', label: 'Duplicate', version: '1' },
                  ]
                : [
                    { id: 'original', label: 'Original', version: '1' },
                    { id: 'revision', label: 'Revision', version: '2', parentId: 'original' },
                    { id: 'alternative', label: 'Alternative', version: '3', parentId: 'original' },
                  ]
          }
          value={state === 'Missing' ? 'missing' : selected || 'revision'}
          onValueChange={(branch) => setSelected(branch.id)}
          disabled={state === 'Disabled'}
          changeGuard={
            state === 'Draft guard'
              ? {
                  version: 'draft-1',
                  message: 'Your draft is saved to its original branch before switching.',
                }
              : undefined
          }
        />
      );
      break;
    case 'MessageQueue':
      content = (
        <MessageQueue
          {...navState}
          variant={resolveVariant('MessageQueue', presentation)}
          items={
            empty
              ? []
              : state === 'Invalid window'
                ? [queue[0]!, queue[0]!]
                : queue.map((item) =>
                    state === 'Sent'
                      ? { ...item, state: 'sent' as const }
                      : state === 'Send unknown'
                        ? { ...item, state: 'outcome-unknown' as const }
                        : item,
                  )
          }
          pagination={
            ['Paged', 'Unknown total'].includes(state)
              ? {
                  pageIndex: 1,
                  pageSize: queue.length,
                  totalItems: state === 'Paged' ? queue.length * 3 : undefined,
                  hasNextPage: true,
                }
              : undefined
          }
          onPageChange={() => emit('Next page requested. The current page stays until it arrives.')}
          onEdit={(item, text) => {
            setQueue(
              queue.map((entry) =>
                entry.id === item.id
                  ? { ...entry, text, version: String(Number(entry.version) + 1) }
                  : entry,
              ),
            );
            emit('draft update acknowledged');
          }}
          onCancel={(item) => {
            setQueue(queue.filter((entry) => entry.id !== item.id));
            emit('removal acknowledged');
          }}
          onMove={
            state === 'No reorder'
              ? undefined
              : (item, direction) => {
                  const next = [...queue],
                    index = next.findIndex((entry) => entry.id === item.id),
                    target = index + (direction === 'up' ? -1 : 1);
                  if (next[target]) {
                    [next[index], next[target]] = [next[target]!, next[index]!];
                    setQueue(next);
                    emit('reorder acknowledged');
                  }
                }
          }
        />
      );
      break;
    case 'AgentHandoff':
      content = <HandoffSpecimen key={state} state={state} presentation={presentation} />;
      break;
    case 'ReviewChanges':
      content = (
        <ReviewChanges
          variant={resolveVariant('ReviewChanges', presentation)}
          changes={
            empty
              ? []
              : [
                  {
                    id: 'search',
                    path: 'src/search.ts',
                    before,
                    after,
                    conflict: state === 'Conflict',
                  },
                ]
          }
          baseVersion="a1"
          proposalVersion="b2"
          selectedIds={selection}
          onSelectionChange={setSelection}
          state={
            stage === 'accepted'
              ? 'accepted'
              : stage === 'rejected'
                ? 'rejected'
                : state === 'Pending'
                  ? 'pending'
                  : state === 'Stale'
                    ? 'stale'
                    : state === 'Accepted'
                      ? 'accepted'
                      : 'ready'
          }
          onDecision={(request) => {
            setStage(request.decision === 'accept' ? 'accepted' : 'rejected');
            emit('review decision acknowledged');
          }}
        />
      );
      break;
    case 'AIForm':
      content = <FormSpecimen state={state} presentation={presentation} onEvent={emit} />;
      break;
    case 'GeneratedUI':
      content = <GeneratedSpecimen state={state} presentation={presentation} onEvent={emit} />;
      break;
    case 'Chart':
      content = <ChartSpecimen state={state} presentation={presentation} onEvent={emit} />;
      break;
    case 'MemoryControls':
      content = (
        <MemoryControls
          variant={resolveVariant('MemoryControls', presentation)}
          items={
            empty
              ? []
              : [
                  {
                    id: 'memory-1',
                    version: '3',
                    label: 'Testing preference',
                    value: 'Use Vitest for component tests.',
                    scope: 'This workspace',
                    state:
                      stage === 'pending' || state === 'Pending'
                        ? 'pending'
                        : state === 'Revoked'
                          ? 'revoked'
                          : failed
                            ? 'error'
                            : 'available',
                    error: failed ? 'The deletion request could not be confirmed.' : undefined,
                  },
                ]
          }
          onRequest={(_, action) => {
            setStage('pending');
            emit(`${action} request awaiting confirmation`);
          }}
        />
      );
      break;
    case 'ArtifactDiff':
      content = (
        <ArtifactDiff
          variant={resolveVariant('ArtifactDiff', presentation)}
          path="review.md"
          versions={[
            {
              id: 'v1',
              label: 'Version 1',
              text: '# Review\n\nInspect the search input.\n',
              author: 'Research agent',
              access: 'available',
            },
            {
              id: 'v2',
              label: 'Version 2',
              text: '# Review\n\nInspect the search input and keyboard interactions.\n',
              author: 'Review agent',
              access: state === 'Revoked' ? 'revoked' : 'available',
            },
          ]}
          beforeId={versions.beforeId}
          afterId={state === 'Missing version' ? 'v9' : versions.afterId}
          onVersionsChange={setVersions}
        />
      );
      break;
    case 'WorkflowGraph':
      content = <WorkflowSpecimen state={state} presentation={presentation} onEvent={emit} />;
      break;
    case 'AuditTrail':
      content = (
        <AuditTrail
          variant={resolveVariant('AuditTrail', presentation)}
          records={
            empty
              ? []
              : [
                  {
                    id: 'event-1',
                    time: '2026-09-30 09:41 UTC',
                    actor: 'Workspace owner',
                    action: 'Approved file changes',
                    scope: 'src/search.ts',
                    correlationId: 'run-42',
                    outcome: 'Acknowledged',
                    redacted: state === 'Redacted',
                    detail: 'Proposal b2 against base a1.',
                  },
                  {
                    id: 'event-2',
                    time: '2026-09-30 09:40 UTC',
                    actor: 'Review agent',
                    action: 'Requested change review',
                    scope: 'Current workspace',
                    correlationId: 'run-42',
                    outcome: 'Recorded',
                  },
                ].filter((record) => record.action.toLowerCase().includes(query.toLowerCase()))
          }
          query={query}
          onQueryChange={setQuery}
          loading={loading}
        />
      );
      break;
    case 'RunInspector':
      content = (
        <RunInspector
          variant={resolveVariant('RunInspector', presentation)}
          runId="run-42"
          usage={
            state === 'Unknown usage' ? undefined : { tokens: 2840, source: 'Sample server report' }
          }
          spans={
            empty
              ? []
              : [
                  {
                    id: 's1',
                    name: 'Plan update',
                    kind: 'model',
                    state: 'complete',
                    durationMs: 810,
                    summary: 'Identified the search normalization change.',
                  },
                  {
                    id: 's2',
                    parentId: 's1',
                    name: 'Run tests',
                    kind: 'tool',
                    state:
                      state === 'Failed' ? 'failed' : state === 'Running' ? 'running' : 'complete',
                    durationMs: state === 'Running' ? undefined : 940,
                    summary: 'Ran the synthetic search test suite.',
                  },
                ]
          }
          onSelect={(span) => emit(`inspecting span ${span.id}`)}
        />
      );
      break;
    case 'MarkdownResponse':
      content = (
        <MarkdownSpecimen name="StreamingResponse" state={state} presentation={presentation} />
      );
      break;
    case 'MarkdownCodeBlock': {
      const View = ['Default', 'Long code', 'Empty'].includes(state)
        ? MarkdownCodeBlock
        : HighlightedCodeBlock;
      content = (
        <View
          variant={resolveVariant('MarkdownCodeBlock', presentation)}
          code={
            empty
              ? ''
              : state === 'Long code'
                ? 'const description = "A long explanation of how to preserve keyboard focus and input state during streaming updates across complex workspaces";'
                : state === 'Highlight limit'
                  ? 'const value = 1;\n'.repeat(310)
                  : state === 'Untrusted HTML'
                    ? '<img src="https://example.invalid/blocked.png" onerror="alert(1)">\n<script>alert("inert")</script>'
                    : state === 'CRLF source'
                      ? 'const value = "original";\r\n// preserve the original line endings\r\n'
                      : state === 'Python'
                        ? 'def greet(name):\n    # Show a public message\n    return f"Hello {name}"'
                        : state === 'JSX'
                          ? 'export const Message = () => <div title="Safe">Hello</div>;'
                          : after
          }
          language={
            state === 'Unsupported language'
              ? 'not-a-language'
              : state === 'Untrusted HTML'
                ? 'html'
                : state === 'Python'
                  ? 'python'
                  : state === 'JSX'
                    ? 'jsx'
                    : 'typescript'
          }
          streaming={state === 'Streaming'}
        />
      );
      break;
    }
    case 'MathFormula':
      content = (
        <MathFormula
          variant={resolveVariant('MathFormula', presentation)}
          formula={
            state === 'Matrix'
              ? '\\begin{bmatrix}1 & 0\\\\0 & 1\\end{bmatrix}'
              : state === 'Integral'
                ? '\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}'
                : state === 'Invalid'
                  ? '\\frac{'
                  : state === 'Oversized'
                    ? 'x+'.repeat(6000)
                    : 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'
          }
        />
      );
      break;
    case 'MermaidDiagram':
      content = (
        <MermaidDiagram
          variant={resolveVariant('MermaidDiagram', presentation)}
          code={diagrams[state] ?? diagrams.Default!}
          title={state === 'Default' ? 'Agent workflow' : `${state} diagram`}
          state={state === 'Streaming' ? 'streaming' : 'complete'}
        />
      );
      break;
    case 'RichMarkdownResponse':
      content = (
        <RichMarkdownResponse
          variant={resolveVariant('RichMarkdownResponse', presentation)}
          text={
            state === 'Invalid formula'
              ? 'An invalid formula: $\\notacommand{x}$'
              : state === 'Unsafe diagram'
                ? '```mermaid\n' + diagrams.Restricted + '\n```'
                : richMarkdown
          }
          state={state === 'Streaming' ? 'streaming' : 'complete'}
        />
      );
      break;
    default:
      content = <p>Example unavailable.</p>;
  }
  return (
    <div className="specimen-content">
      <Suspense fallback={<ExampleLoading />}>{content}</Suspense>
      {feedback && (
        <p role="status" className="specimen-feedback">
          {feedback}
        </p>
      )}
    </div>
  );
}
