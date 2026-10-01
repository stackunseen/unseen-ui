import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AITheme,
  Message,
  PromptInput,
  StatusBadge,
  Citation,
  Select,
  Accordion,
  IconsProvider,
  LoadingIndicator,
  Skeleton,
  ModelControls,
  ContextInspector,
  ConnectionStatus,
  PolicyStatus,
  Attachment,
  AttachmentGroup,
  AttachmentPicker,
  DataTable,
} from '@ai-interaction/react';
import type { AttachmentReference, TableColumn, TablePagination } from '@ai-interaction/react';
import type { ModelSettings } from '@ai-interaction/core';
import type { SVGProps } from 'react';
import { createTheme } from '@ai-interaction/react/theme';
import { MarkdownResponse, renderMarkdownPart } from '@ai-interaction/react/markdown';
import '@ai-interaction/react/styles.css';
import { FormExample } from './form-example';
import { GeneratedExample } from './generated-example';
import { ChartExample } from './chart-example';
import { WorkflowExample } from './workflow-example';
import { FileExample } from './file-example';
import { TerminalExample } from './terminal-example';
import { VoiceExample } from './voice-example';
import { WorkspaceExample } from './workspace-example';
import { UploadExample } from './upload-example';
import { RecoveryExample } from './recovery-example';
import { ViewportExample } from './viewport-example';
import { ConversationExample } from './conversation-example';
function BrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
function App() {
  const reference: AttachmentReference = { attachmentId: 'cost-file', version: '1' };
  const columns: TableColumn[] = [
    {
      id: 'amount',
      label: 'Cost',
      format: { kind: 'number', options: { style: 'currency', currency: 'EUR' } },
    },
    { id: 'date', label: 'Recorded (UTC)', format: { kind: 'date' } },
  ];
  const pagination: TablePagination = { pageIndex: 0, pageSize: 1, totalRows: 1 };
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const [mode, setMode] = useState('light');
  const [settings, setSettings] = useState<ModelSettings>({ modelId: 'demo', toolIds: [] });
  return (
    <IconsProvider icons={{ check: BrandIcon }}>
      <AITheme
        theme={createTheme({ primary: '#166534' })}
        appearance={mode === 'dark' ? 'dark' : 'light'}
        style={{ background: 'var(--ai-canvas)', padding: 16 }}
      >
        <h1>Plain React consumer</h1>
        <ConversationExample />
        <ViewportExample />
        <WorkspaceExample />
        <RecoveryExample />
        <UploadExample />
        <VoiceExample />
        <FormExample />
        <GeneratedExample />
        <ChartExample />
        <WorkflowExample />
        <FileExample />
        <TerminalExample />
        <DataTable
          caption="Packed localized table"
          columns={columns}
          rows={[{ id: 'cost', cells: { amount: 1234.5, date: '2026-09-30' } }]}
          locale="de-DE"
          pagination={pagination}
        />
        <Attachment
          name="cost.txt"
          state="ready"
          reference={reference}
          resource={reference}
          preview={{ kind: 'text', text: 'Version 1 preview from the consumer host.' }}
        />
        <MarkdownResponse
          headingLevel={2}
          text={
            '# Packed Markdown\n\nA **formatted** response without Tailwind.\n\n```ts\nconst ready = true;\n```'
          }
          state="complete"
        />
        <StatusBadge state="running" variant="outline" />
        <Message
          renderTextPart={renderMarkdownPart}
          value={{
            id: 'packed-parts',
            role: 'assistant',
            state: 'complete',
            revision: 1,
            parts: [
              {
                id: 'summary',
                type: 'text',
                format: 'markdown',
                text: 'A **stable** message part.',
                state: 'complete',
              },
              { id: 'missing', type: 'attachment', attachmentId: 'unresolved', version: '1' },
            ],
          }}
        />
        <LoadingIndicator variant="bars" label="Waiting for the next response" />
        <Skeleton variant="pulse" lines={2} />
        <ModelControls
          variant="compact"
          value={settings}
          onValueChange={setSettings}
          capabilities={{
            revision: '1',
            source: 'Consumer fixture',
            observedAt: '2026-09-29T12:00:00Z',
            models: [
              {
                id: 'demo',
                label: 'Demo model',
                provider: 'Fixture',
                available: true,
                modes: [],
                toolIds: [],
              },
            ],
            tools: [],
          }}
        />
        <ContextInspector
          variant="table"
          value={{
            revision: '1',
            source: 'Consumer fixture',
            observedAt: '2026-09-29T12:00:00Z',
            items: [],
          }}
        />
        <ConnectionStatus
          variant="compact"
          value={{
            state: 'disconnected',
            recovery: 'none',
            adapter: { name: 'Consumer fixture', version: '1', resume: false, snapshot: false },
          }}
        />
        <PolicyStatus variant="cards" checks={[]} />
        <label>
          Appearance
          <Select
            variant="filled"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </label>
        <Accordion
          variant="separated"
          type="multiple"
          items={[
            {
              value: 'notes',
              title: 'Integration notes',
              content: <p>Scoped colours and icon overrides also follow portalled components.</p>,
            },
          ]}
        />
        <PromptInput
          variant="compact"
          value={draft}
          onValueChange={setDraft}
          attachments={
            <AttachmentGroup>
              <Attachment
                variant="compact"
                name="Consumer notes.txt"
                state="ready"
                mediaType="text/plain"
                preview={{ kind: 'text', text: 'Preview rendered from the packed library.' }}
              />
            </AttachmentGroup>
          }
          toolbar={
            <AttachmentPicker
              onFilesSelected={(files) =>
                setSent(`${files.length} local files selected; no upload performed.`)
              }
            />
          }
          onSubmit={(text) => {
            setSent(text);
            setDraft('');
          }}
        />
        <p role="status">{sent}</p>
        <Citation
          number={1}
          source={{
            id: 'demo',
            title: 'Consumer fixture',
            version: '1',
            kind: 'document',
            locator: 'Page 1',
            access: 'available',
            excerpt: 'A portalled dialog preserves the green theme.',
          }}
        />
      </AITheme>
    </IconsProvider>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
