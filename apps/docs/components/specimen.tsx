'use client';
import { ModelSelector } from '@stackunseen/ui/assistant';
import '@stackunseen/ui/assistant.css';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AgentCard,
  Button,
  Select,
  Accordion,
  Tabs,
  LoadingIndicator,
  Skeleton,
  resolveVariant,
  AIIcon,
  AgentSteps,
  ApprovalCard,
  ArtifactPanel,
  ArtifactPreview,
  Citation,
  ClarificationRequest,
  ContextBar,
  EvidenceGroup,
  ExecutionTimeline,
  GroundingStatus,
  MCPServerCard,
  MCPToolList,
  Message,
  MessageActions,
  PromptInput,
  SourceCard,
  StatusBadge,
  StreamingResponse,
  Suggestions,
  ToolCall,
  ToolGroup,
  ToolResult,
  ToolResultRegistryProvider,
  Workflow,
} from '@stackunseen/ui';
import { artifact, proposal, source, steps, tool } from '../lib/fixtures';
import { markdownStates } from '../lib/markdown-fixtures';
import { partStates } from '../lib/message-parts-fixtures';
import { expandedNames } from '../lib/expanded-catalog';
import { PermissionSpecimen } from './scoped-decision-specimen';
import { ExampleLoading } from './example-loading';
import { genericNames } from '../lib/generic-catalog';

const GenericSpecimen = dynamic(() => import('./generic-specimen').then((m) => m.GenericSpecimen), {
  loading: ExampleLoading,
});

const InspectionSpecimen = dynamic(
  () => import('./inspection-specimen').then((m) => m.InspectionSpecimen),
  { loading: ExampleLoading },
);
const AttachmentSpecimen = dynamic(
  () => import('./attachment-specimen').then((m) => m.AttachmentSpecimen),
  { loading: ExampleLoading },
);
const AttachmentComposer = dynamic(
  () => import('./attachment-specimen').then((m) => m.AttachmentComposer),
  { loading: ExampleLoading },
);
const MCPAppSpecimen = dynamic(() => import('./mcp-app-specimen').then((m) => m.MCPAppSpecimen), {
  loading: ExampleLoading,
});
const RunsSpecimen = dynamic(() => import('./runs-specimen').then((m) => m.RunsSpecimen), {
  loading: ExampleLoading,
});
const FileDropzoneSpecimen = dynamic(
  () => import('./attachment-specimen').then((m) => m.FileDropzoneSpecimen),
  { loading: ExampleLoading },
);
const MarkdownSpecimen = dynamic(
  () => import('./markdown-specimen').then((m) => m.MarkdownSpecimen),
  { loading: ExampleLoading },
);
const MessagePartsSpecimen = dynamic(
  () => import('./message-parts-specimen').then((m) => m.MessagePartsSpecimen),
  { loading: ExampleLoading },
);
const ExpandedSpecimen = dynamic(
  () => import('./expanded-specimen').then((m) => m.ExpandedSpecimen),
  { loading: ExampleLoading },
);

export function Specimen({
  name,
  variant = 'Default',
  presentation,
}: {
  name: string;
  variant?: string;
  presentation?: string;
}) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [model, setModel] = useState('atlas-fast');
  const [removedContext, setRemovedContext] = useState<string[]>([]);
  const failed = variant === 'Failed';
  const empty = variant === 'Empty';
  const longLabels = variant === 'Long labels';
  const message = {
    id: 'preview',
    role: 'assistant' as const,
    revision: 1,
    text: 'I found three accounts that need an owner review. Here’s the context to help you decide.',
    state:
      variant === 'Streaming' || variant === 'Waiting'
        ? ('streaming' as const)
        : variant === 'Interrupted'
          ? ('interrupted' as const)
          : ('complete' as const),
  };
  const sourceValue = {
    ...source,
    access:
      variant === 'Revoked'
        ? ('revoked' as const)
        : variant === 'Missing'
          ? ('missing' as const)
          : ('available' as const),
  };
  let preview;
  switch (name) {
    case 'ConnectionStatus':
    case 'ModelControls':
    case 'ContextInspector':
    case 'PolicyStatus':
      preview = <InspectionSpecimen name={name} state={variant} presentation={presentation} />;
      break;
    case 'Select':
      preview = (
        <label className="specimen-field">
          Environment
          <Select
            variant={resolveVariant('Select', presentation)}
            value={value || 'preview'}
            onValueChange={setValue}
            disabled={variant === 'Disabled'}
            options={[
              {
                value: 'preview',
                label: longLabels ? 'Europe production workspace · customer operations' : 'Preview',
              },
              { value: 'staging', label: 'Staging' },
              { value: 'production', label: 'Production (unavailable)', disabled: true },
            ]}
          />
        </label>
      );
      break;
    case 'Accordion': {
      const items = [
        {
          value: 'inputs',
          title: (
            <>
              {longLabels
                ? 'Input parameters for the customer-account reconciliation workflow'
                : 'Input parameters'}{' '}
              <span className="sr-only">— {presentation ?? 'divided'} style</span>
            </>
          ),
          content: (
            <p>Search accounts in the selected workspace. No external changes will be made.</p>
          ),
        },
        {
          value: 'output',
          title: (
            <>
              Execution results <span className="sr-only">— {presentation ?? 'divided'} style</span>
            </>
          ),
          content: <p>Three synthetic records are available for review.</p>,
        },
        {
          value: 'disabled',
          title: 'Archived results (unavailable)',
          disabled: true,
          content: null,
        },
      ];
      preview =
        variant === 'Single' ? (
          <Accordion
            variant={resolveVariant('Accordion', presentation)}
            type="single"
            collapsible
            items={items}
          />
        ) : (
          <Accordion
            variant={resolveVariant('Accordion', presentation)}
            type="multiple"
            defaultValue={['inputs']}
            items={items}
          />
        );
      break;
    }
    case 'Tabs':
      preview = (
        <Tabs
          variant={resolveVariant('Tabs', presentation)}
          value={value || 'summary'}
          onValueChange={setValue}
          label="Report views"
          items={[
            {
              value: 'summary',
              label: longLabels ? 'Reconciliation summary' : 'Summary',
              content: <p>Three accounts are ready for owner review.</p>,
            },
            {
              value: 'sources',
              label: longLabels ? 'Supporting evidence' : 'Sources',
              content: <p>Account review policy, version 2. Synthetic example.</p>,
            },
            {
              value: 'history',
              label: longLabels ? 'Previous review decisions' : 'History',
              content: <p>Review requested. No decision has been submitted.</p>,
            },
          ]}
        />
      );
      break;
    case 'LoadingIndicator':
      preview = (
        <LoadingIndicator
          variant={resolveVariant('LoadingIndicator', presentation)}
          label={
            longLabels
              ? `Searching workspace references: ${'customer-operations/'.repeat(8)}`
              : 'Searching knowledge sources'
          }
          size={variant === 'Large' ? 'large' : variant === 'Small' ? 'small' : 'medium'}
        />
      );
      break;
    case 'Skeleton':
      preview = (
        <Skeleton
          variant={resolveVariant('Skeleton', presentation)}
          shape={variant === 'Card' ? 'card' : variant === 'Avatar' ? 'avatar' : 'text'}
          lines={4}
        />
      );
      break;
    case 'PromptInput':
      if (variant === 'Attachments') {
        preview = <AttachmentComposer variant={resolveVariant('PromptInput', presentation)} />;
        break;
      }
      preview = (
        <PromptInput
          variant={resolveVariant('PromptInput', presentation)}
          value={variant === 'Too long' ? 'Long draft '.repeat(2001) : value}
          onValueChange={setValue}
          onSubmit={(text) => {
            setResult(`Demo received: ${text}`);
            setValue('');
          }}
          busy={variant === 'Busy'}
          disabled={variant === 'Disabled'}
          disabledReason={variant === 'Disabled' ? 'Connect a host to send messages.' : undefined}
          submitDisabled={variant === 'Send unavailable'}
          submitDisabledReason="Wait for the file upload before sending."
          onCancel={() => setResult('Cancellation requested in demo.')}
          toolbar={
            variant === 'Toolbar' || variant === 'Long toolbar' ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setResult('Command picker requested in demo.')}
                >
                  {variant === 'Long toolbar' ? 'Choose a workspace command' : '/ Commands'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setResult('Reference picker requested in demo.')}
                >
                  {variant === 'Long toolbar' ? 'Add a versioned source reference' : '@ Reference'}
                </Button>
              </>
            ) : variant === 'Default' || variant === 'Busy' ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setResult('Attachment picker requested in demo.')}
                >
                  + Attach
                </Button>
                <ModelSelector
                  className="prompt-model-picker"
                  value={model}
                  onValueChange={setModel}
                  models={[
                    { id: 'atlas-fast', name: 'Atlas Fast', provider: 'Demo provider' },
                    { id: 'atlas-deep', name: 'Atlas Deep', provider: 'Demo provider' },
                  ]}
                />
              </>
            ) : undefined
          }
        />
      );
      break;
    case 'Message':
      if (partStates.includes(variant)) {
        preview = <MessagePartsSpecimen state={variant} presentation={presentation} />;
        break;
      }
      preview = markdownStates.includes(variant) ? (
        <MarkdownSpecimen name="Message" state={variant} presentation={presentation} />
      ) : variant === 'Default' ? (
        <div className="message-exchange">
          <Message
            variant="bubble"
            value={{
              id: 'question',
              role: 'user',
              revision: 1,
              text: 'Which accounts need an owner review before archival?',
              state: 'complete',
            }}
          />
          <Message variant={resolveVariant('Message', presentation)} value={message} />
        </div>
      ) : (
        <Message variant={resolveVariant('Message', presentation)} value={message} />
      );
      break;
    case 'StreamingResponse':
      preview = markdownStates.includes(variant) ? (
        <MarkdownSpecimen name="StreamingResponse" state={variant} presentation={presentation} />
      ) : (
        <StreamingResponse
          variant={resolveVariant('StreamingResponse', presentation)}
          text={variant === 'Waiting' ? '' : message.text}
          state={longLabels ? 'failed' : message.state}
          error={
            longLabels
              ? `The current request failed: ${'workspace-reference/'.repeat(12)}`
              : undefined
          }
        />
      );
      break;
    case 'MessageActions':
      preview = (
        <MessageActions
          variant={resolveVariant('MessageActions', presentation)}
          text={message.text}
          onRetry={() => setResult('Retry requested. The host creates a new attempt.')}
          onFeedback={(helpful) => setResult(helpful ? 'Marked helpful.' : 'Marked not helpful.')}
        />
      );
      break;
    case 'Suggestions':
      preview = (
        <Suggestions
          variant={resolveVariant('Suggestions', presentation)}
          items={['Summarize the findings', 'Show me the sources', 'What needs my review?']}
          disabled={variant === 'Disabled'}
          onSelect={(text) => setResult(`Draft selected: ${text}`)}
        />
      );
      break;
    case 'Attachment':
      preview = (
        <AttachmentSpecimen state={variant} presentation={presentation} onNotice={setResult} />
      );
      break;
    case 'FileDropzone':
      preview = <FileDropzoneSpecimen key={variant} state={variant} onNotice={setResult} />;
      break;
    case 'MCPAppFrame':
      preview = (
        <MCPAppSpecimen
          key={variant}
          state={variant}
          presentation={presentation}
          onNotice={setResult}
        />
      );
      break;
    case 'RunBoard':
    case 'AttentionQueue':
    case 'RunSummaryCard':
    case 'BackgroundStatus':
    case 'RunCompare':
    case 'SubagentTree':
      preview = (
        <RunsSpecimen
          key={`${name}:${variant}`}
          name={name}
          state={variant}
          presentation={presentation}
          onNotice={setResult}
        />
      );
      break;
    case 'AgentSteps':
      preview = (
        <AgentSteps
          variant={resolveVariant('AgentSteps', presentation)}
          steps={
            empty
              ? []
              : failed
                ? steps.map((s, i) => (i === 2 ? { ...s, state: 'failed' } : s))
                : steps.slice(0, 3)
          }
        />
      );
      break;
    case 'ExecutionTimeline':
      preview = (
        <ExecutionTimeline
          variant={resolveVariant('ExecutionTimeline', presentation)}
          entries={
            empty
              ? []
              : [
                  {
                    id: '1',
                    label: 'Searched the demo dataset',
                    state: 'succeeded',
                    timestamp: '2026-09-29T12:00:00Z',
                    durationMs: 820,
                  },
                  {
                    id: '2',
                    label: 'Requested owner review',
                    state: 'waiting-approval',
                    timestamp: '2026-09-29T12:00:01Z',
                  },
                ]
          }
          filter={value === 'failed' ? 'failed' : 'all'}
          onFilterChange={setValue}
        />
      );
      break;
    case 'ToolCall':
      preview = (
        <ToolCall
          variant={resolveVariant('ToolCall', presentation)}
          value={{
            ...tool,
            state: failed
              ? 'failed'
              : variant === 'Failed without details'
                ? 'failed'
                : variant === 'Queued'
                  ? 'queued'
                  : variant === 'Receiving input'
                    ? 'input-streaming'
                    : variant === 'Needs approval'
                      ? 'approval-required'
                      : variant === 'Cancelled'
                        ? 'cancelled'
                        : variant === 'Denied'
                          ? 'denied'
                          : variant === 'Unknown'
                            ? 'outcome-unknown'
                            : variant === 'Running'
                              ? 'running'
                              : 'succeeded',
            output: [
              'Running',
              'Queued',
              'Receiving input',
              'Needs approval',
              'Cancelled',
              'Denied',
              'No output',
              'Failed without details',
            ].includes(variant)
              ? undefined
              : tool.output,
            error: failed ? 'The connector timed out.' : undefined,
          }}
        />
      );
      break;
    case 'ToolResult':
      preview =
        variant === 'Host renderer' ? (
          <ToolResultRegistryProvider
            registry={{
              match: (item) => (item.toolName === 'search_accounts' ? 'accounts' : undefined),
              renderers: {
                accounts: ({ result: item, label }) => (
                  <ul aria-label={label} style={{ margin: 0, paddingInlineStart: 18 }}>
                    {(item.data as { name: string; days: number }[]).map((row) => (
                      <li key={row.name}>
                        {row.name} · inactive {row.days} days
                      </li>
                    ))}
                  </ul>
                ),
              },
            }}
          >
            <ToolResult
              variant={resolveVariant('ToolResult', presentation)}
              label="search_accounts output"
              result={{
                toolName: 'search_accounts',
                mediaType: 'application/json',
                data: [
                  { name: 'Acme Sandbox', days: 120 },
                  { name: 'Example Studio', days: 97 },
                  { name: 'Demo Works', days: 91 },
                ],
              }}
            />
          </ToolResultRegistryProvider>
        ) : (
          <ToolResult
            variant={resolveVariant('ToolResult', presentation)}
            text={
              empty
                ? ''
                : variant === 'Partial'
                  ? '3 inactive accounts found\nAcme Sandbox'
                  : tool.output
            }
            partial={
              variant === 'Partial'
                ? {
                    received: { kind: 'measured', value: 1 },
                    expected: { kind: 'measured', value: 3 },
                    unit: 'accounts',
                  }
                : undefined
            }
            error={failed ? 'The connector timed out.' : undefined}
            onRetry={() => setResult('Retry requested as a new attempt.')}
          />
        );
      break;
    case 'ToolGroup':
      preview = (
        <ToolGroup
          variant={resolveVariant('ToolGroup', presentation)}
          tools={
            empty
              ? []
              : [
                  tool,
                  {
                    ...tool,
                    id: '2',
                    name: 'read_handbook',
                    state: failed ? 'failed' : 'running',
                    output: undefined,
                    error: failed ? 'Access revoked.' : undefined,
                  },
                ]
          }
        />
      );
      break;
    case 'ApprovalCard':
      preview = (
        <ApprovalCard
          variant={resolveVariant('ApprovalCard', presentation)}
          proposal={{
            ...proposal,
            status:
              result === 'Approved' ? 'approved' : result === 'Rejected' ? 'rejected' : 'pending',
          }}
          submission={
            variant === 'Pending'
              ? 'submitting'
              : variant === 'Unknown'
                ? 'outcome-unknown'
                : result
                  ? 'acknowledged'
                  : 'idle'
          }
          stale={variant === 'Changed'}
          expired={variant === 'Expired'}
          onDecision={(decision) => setResult(decision === 'approve' ? 'Approved' : 'Rejected')}
          onReconcile={() => setResult('Demo reconciliation requested.')}
        />
      );
      break;
    case 'PermissionRequest':
      preview = <PermissionSpecimen key={variant} state={variant} presentation={presentation} />;
      break;
    case 'ClarificationRequest':
      preview = (
        <ClarificationRequest
          variant={resolveVariant('ClarificationRequest', presentation)}
          question="Which environment should I use?"
          value={value}
          onValueChange={setValue}
          onSubmit={(answer) => setResult(`Answer received: ${answer}`)}
          choices={
            variant === 'Text'
              ? undefined
              : [
                  { value: 'sandbox', label: 'Sandbox' },
                  { value: 'staging', label: 'Staging' },
                ]
          }
          state={
            variant === 'Pending'
              ? 'submitting'
              : variant === 'Cancelled'
                ? 'cancelled'
                : variant === 'Resolved' || result
                  ? 'resolved'
                  : 'pending'
          }
          error={
            variant === 'Error'
              ? 'This environment is unavailable. Choose another answer.'
              : undefined
          }
        />
      );
      break;
    case 'AgentCard':
      preview = (
        <AgentCard
          variant={resolveVariant('AgentCard', presentation)}
          name={
            longLabels
              ? 'Research agent for cross-workspace source reconciliation and release readiness'
              : 'Research agent'
          }
          description="Finds relevant records and supporting sources."
          state={failed ? 'failed' : variant === 'Idle' ? 'idle' : 'running'}
          activity={variant === 'Default' ? 'Searching the operations handbook' : undefined}
          selected={!!selected}
          onSelect={
            variant === 'Read-only' ? undefined : () => setSelected(selected ? '' : 'agent')
          }
        />
      );
      break;
    case 'SourceCard':
      preview = (
        <SourceCard
          variant={resolveVariant('SourceCard', presentation)}
          source={
            longLabels
              ? {
                  ...sourceValue,
                  title:
                    'Operations handbook — account retention and cross-workspace review requirements',
                }
              : sourceValue
          }
          onOpen={
            variant === 'Host open' || longLabels
              ? () => setResult('Source opening requested in this synthetic fixture.')
              : undefined
          }
        />
      );
      break;
    case 'Citation':
      preview = (
        <>
          <p>Inactive accounts need an owner review before archival.</p>
          <Citation
            variant={resolveVariant('Citation', presentation)}
            source={sourceValue}
            number={1}
          />
        </>
      );
      break;
    case 'EvidenceGroup':
      preview = (
        <EvidenceGroup
          variant={resolveVariant('EvidenceGroup', presentation)}
          sources={
            empty
              ? []
              : [
                  source,
                  {
                    ...source,
                    id: 'policy',
                    title: 'Account retention policy',
                    locator: 'Section 2',
                    excerpt:
                      'Synthetic policy: accounts under a legal hold must remain accessible.',
                  },
                ]
          }
          claim="An owner review is required before archival."
          relationships={{ [source.id]: 'supports', policy: 'related' }}
        />
      );
      break;
    case 'GroundingStatus':
      preview = (
        <GroundingStatus
          variant={resolveVariant('GroundingStatus', presentation)}
          value={
            variant === 'Unknown'
              ? { kind: 'unknown' }
              : {
                  kind: 'coverage',
                  supported: 3,
                  total: 4,
                  method: 'Synthetic fixture: claims with a linked source.',
                }
          }
        />
      );
      break;
    case 'MCPServerCard':
      preview = (
        <MCPServerCard
          variant={resolveVariant('MCPServerCard', presentation)}
          name={
            longLabels
              ? 'Customer relationship management — operations sandbox workspace'
              : 'CRM sandbox'
          }
          status={
            result === 'connected'
              ? 'connected'
              : result === 'disconnected'
                ? 'disconnected'
                : variant === 'Disconnected' || variant === 'Pending'
                  ? 'disconnected'
                  : variant === 'Authorization'
                    ? 'auth-required'
                    : variant === 'Unknown'
                      ? 'unknown'
                      : 'connected'
          }
          toolCount={variant === 'Unknown' ? undefined : 3}
          onConnect={() => setResult('connected')}
          onDisconnect={() => setResult('disconnected')}
          pending={variant === 'Pending'}
        />
      );
      break;
    case 'MCPToolList':
      preview = (
        <MCPToolList
          variant={resolveVariant('MCPToolList', presentation)}
          query={value}
          onQueryChange={setValue}
          tools={[
            {
              id: '1',
              name: 'search_accounts',
              description: 'Find accounts by activity.',
              availability: 'allowed',
              schemaSummary: 'inactive_days: number',
            },
            {
              id: '2',
              name: 'archive_accounts',
              description: 'Archive selected accounts.',
              availability: 'denied',
              schemaSummary: 'account_ids: string[]',
            },
          ]}
        />
      );
      break;
    case 'ContextBar':
      preview = (
        <ContextBar
          variant={resolveVariant('ContextBar', presentation)}
          items={[
            {
              id: '1',
              label: longLabels
                ? 'Operations handbook — retention rules and quarterly access review reference'
                : 'Operations handbook',
              state: 'included' as const,
            },
            {
              id: '2',
              label: 'CRM sandbox',
              state: 'connected' as const,
              reason: 'Not included in model context',
            },
          ].filter((item) => !removedContext.includes(item.id))}
          onRemove={
            variant === 'Read-only'
              ? undefined
              : (id) => {
                  setRemovedContext((current) => [...current, id]);
                  setResult('Synthetic host removed the selected context item.');
                }
          }
          usage={
            variant === 'Unknown'
              ? undefined
              : {
                  used: 2400,
                  limit: 8000,
                  kind: 'estimated',
                  model: 'Demo model',
                  measuredAt: '2026-09-29',
                }
          }
        />
      );
      break;
    case 'ArtifactPanel':
      preview = (
        <>
          <div className="artifact-mini">
            <AIIcon name="document" />
            <div>
              <strong>Account review summary</strong>
              <small>Version 1 · Text document</small>
            </div>
          </div>
          <ArtifactPanel
            variant={resolveVariant('ArtifactPanel', presentation)}
            loading={variant === 'Loading'}
            artifact={empty ? null : artifact}
            open={open}
            onOpenChange={setOpen}
            error={failed ? 'Artifact access was revoked.' : undefined}
          />
        </>
      );
      break;
    case 'ArtifactPreview':
      preview = (
        <ArtifactPreview
          variant={resolveVariant('ArtifactPreview', presentation)}
          tableLabel={`Account review summary — ${presentation ?? 'document'} table preview`}
          artifact={
            variant === 'Table'
              ? {
                  ...artifact,
                  kind: 'table',
                  content: '[["Account","Inactive days"],["Acme Sandbox",124],["Demo Works",97]]',
                }
              : variant === 'Unsupported'
                ? { ...artifact, kind: 'unsupported' }
                : {
                    ...artifact,
                    content:
                      'Account review\n\n3 inactive accounts are ready for an owner review. No changes have been made.',
                  }
          }
        />
      );
      break;
    case 'StatusBadge':
      preview = (
        <div className="status-grid">
          {(longLabels
            ? ['outcome-unknown']
            : variant === 'Unknown'
              ? ['unexpected-value']
              : ['queued', 'running', 'waiting-approval', 'succeeded', 'failed', 'cancelled']
          ).map((state) => (
            <StatusBadge
              variant={resolveVariant('StatusBadge', presentation)}
              key={state}
              state={state}
              label={
                longLabels
                  ? `Waiting for acknowledgement: ${'workspace-reference/'.repeat(10)}`
                  : undefined
              }
            />
          ))}
        </div>
      );
      break;
    case 'Workflow':
      preview = (
        <Workflow
          variant={resolveVariant('Workflow', presentation)}
          steps={
            empty
              ? []
              : failed
                ? steps.map((step, i) => (i === 2 ? { ...step, state: 'failed' } : step))
                : steps
          }
          selectedId={selected}
          onSelect={setSelected}
        />
      );
      break;
    default:
      preview = genericNames.has(name) ? (
        <GenericSpecimen name={name} state={variant} presentation={presentation} />
      ) : expandedNames.has(name) ? (
        <ExpandedSpecimen name={name} state={variant} presentation={presentation} />
      ) : (
        <p>Example unavailable.</p>
      );
  }
  return (
    <div className="specimen-content">
      {preview}
      {result && (
        <p className="specimen-feedback" role="status">
          {result}
        </p>
      )}
    </div>
  );
}
