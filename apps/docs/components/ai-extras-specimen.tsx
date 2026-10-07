'use client';
import { useState } from 'react';
import { Button } from '@stackunseen/ui';
import {
  ChainOfThought,
  Checkpoint,
  ModelSelector,
  OpenInChat,
  Plan,
  Reasoning,
  Shimmer,
  Sources,
  Task,
} from '@stackunseen/ui/assistant';
import {
  Commit,
  EnvironmentVariables,
  PackageInfo,
  SchemaDisplay,
  Snippet,
  StackTrace,
  WebPreview,
} from '@stackunseen/ui/devtools';
import { AudioPlayer, Image, Persona, Transcription, VoiceSelector } from '@stackunseen/ui/media';
import type { PersonaState } from '@stackunseen/ui/media';
import '@stackunseen/ui/assistant.css';
import '@stackunseen/ui/devtools.css';
import '@stackunseen/ui/media.css';

const summary =
  'The request asks which accounts are inactive. I should check the activity export first.\n\nThree accounts have no activity in 90 days, so they need an owner review before archival.';
const sources = [
  { id: '1', title: 'Customer operations handbook', description: 'Section 4 · Account reviews' },
  { id: '2', title: 'React documentation', href: 'https://react.dev' },
];

export function AIExtrasSpecimen({ name, state = 'Default' }: { name: string; state?: string }) {
  const [model, setModel] = useState('atlas-fast');
  const [voice, setVoice] = useState('aria');
  const [time, setTime] = useState(3);
  const [notice, setNotice] = useState('');
  const [restoring, setRestoring] = useState(false);
  let content;
  switch (name) {
    case 'Reasoning':
      content = (
        <Reasoning
          key={state}
          summary={summary}
          state={state === 'Streaming' ? 'streaming' : 'complete'}
          durationMs={state === 'Unknown duration' ? undefined : 3200}
          defaultOpen={state !== 'Complete' ? undefined : true}
        />
      );
      break;
    case 'ChainOfThought':
      content = (
        <ChainOfThought
          steps={
            state === 'Empty'
              ? []
              : [
                  {
                    id: '1',
                    label: 'Searched the activity export',
                    state: 'complete',
                    description: '412 accounts checked',
                  },
                  {
                    id: '2',
                    label: 'Matched the review policy',
                    state: 'complete',
                    sources: [
                      { id: 'a', title: 'Operations handbook' },
                      { id: 'b', title: 'react.dev', href: 'https://react.dev' },
                    ],
                  },
                  {
                    id: '3',
                    label: 'Drafting the summary',
                    state: state === 'Active step' ? 'active' : 'complete',
                  },
                ]
          }
        />
      );
      break;
    case 'Plan':
      content = (
        <Plan
          title="Archive inactive accounts"
          description="Review three inactive accounts, request owner approval, then archive them."
          streaming={state === 'Streaming'}
          steps={
            state === 'Without steps'
              ? []
              : [
                  { id: '1', label: 'Export account activity', done: true },
                  { id: '2', label: 'Request owner approval' },
                  { id: '3', label: 'Archive approved accounts' },
                ]
          }
          actions={
            <Button size="sm" onClick={() => setNotice('Build requested from the sample host.')}>
              Build
            </Button>
          }
        />
      );
      break;
    case 'Task':
      content = (
        <Task
          title={state === 'Running' ? 'Searching project files' : 'Found project files'}
          state={state === 'Running' ? 'running' : state === 'Failed' ? 'failed' : 'complete'}
          items={[
            { id: '1', text: 'Searching "app/page.tsx, components structure"' },
            { id: '2', text: 'Read', file: 'page.tsx' },
            { id: '3', text: 'Scanning 52 files' },
            { id: '4', text: 'Reading files', file: 'layout.tsx' },
          ]}
        />
      );
      break;
    case 'Checkpoint':
      content = (
        <Checkpoint
          createdAt="2026-10-06T09:30:00Z"
          restoring={restoring || state === 'Restoring'}
          onRestore={() => {
            setRestoring(true);
            setNotice('Restore requested. The sample host has not confirmed it.');
          }}
        />
      );
      break;
    case 'Shimmer':
      content = <Shimmer>Searching knowledge sources…</Shimmer>;
      break;
    case 'Sources':
      content = (
        <Sources
          key={state}
          sources={state === 'Empty' ? [] : sources}
          defaultOpen={state === 'Expanded'}
        />
      );
      break;
    case 'ModelSelector':
      content = (
        <ModelSelector
          value={model}
          onValueChange={setModel}
          models={[
            {
              id: 'atlas-fast',
              name: 'Atlas Fast',
              provider: 'Demo provider',
              description: 'Quick answers',
            },
            {
              id: 'atlas-deep',
              name: 'Atlas Deep',
              provider: 'Demo provider',
              description: 'Longer analysis',
            },
            {
              id: 'atlas-legacy',
              name: 'Atlas Legacy',
              provider: 'Demo provider',
              disabledReason:
                state === 'Unavailable model' ? 'Not enabled for this workspace' : undefined,
            },
          ]}
        />
      );
      break;
    case 'OpenInChat':
      content = (
        <OpenInChat
          query="Which accounts are inactive?"
          destinations={[
            {
              id: 'example',
              label: 'Example chat',
              href: (query) => `https://chat.example.com/?q=${encodeURIComponent(query)}`,
            },
          ]}
        />
      );
      break;
    case 'Snippet':
      content = <Snippet prefix="$" code="pnpm add @stackunseen/ui" label="Install command" />;
      break;
    case 'Commit':
      content = (
        <Commit
          key={state}
          hash="a3f9c2e81b44d0"
          message={'Normalize search queries\n\nTrim whitespace and compare in a stable locale.'}
          author="Sample author"
          committedAt="2026-10-05T14:12:00Z"
          defaultOpen={state === 'Files open'}
          files={[
            { path: 'src/search.ts', status: 'modified', additions: 3, deletions: 1 },
            { path: 'tests/search.test.ts', status: 'added', additions: 24 },
          ]}
        />
      );
      break;
    case 'EnvironmentVariables':
      content = (
        <EnvironmentVariables
          variables={
            state === 'Empty'
              ? []
              : [
                  { name: 'NODE_ENV', value: 'production' },
                  { name: 'API_BASE_URL', value: 'https://api.example.com' },
                  { name: 'SAMPLE_TOKEN', value: 'sample-not-a-secret', secret: true },
                  { name: 'DATABASE_PASSWORD', secret: true },
                ]
          }
        />
      );
      break;
    case 'PackageInfo':
      content =
        state === 'Added' ? (
          <PackageInfo
            name="zod"
            newVersion="4.6.5"
            changeType="added"
            description="Schema validation for host payloads."
          />
        ) : (
          <PackageInfo
            name="react"
            currentVersion="18.3.1"
            newVersion="19.3.0"
            changeType="major"
            description="Breaking changes in ref handling; review component wrappers."
            dependencies={[{ name: 'react-dom', version: '^19.3.0' }]}
          />
        );
      break;
    case 'SchemaDisplay':
      content = (
        <SchemaDisplay
          method="POST"
          path="/v1/accounts/{id}/archive"
          description="Archives one account after owner approval."
          parameters={[{ name: 'id', in: 'path', type: 'string', required: true }]}
          requestBody={[
            { name: 'reason', type: 'string', required: true },
            {
              name: 'approval',
              type: 'object',
              children: [
                { name: 'commandId', type: 'string', required: true },
                { name: 'version', type: 'string' },
              ],
            },
          ]}
          responseBody={[{ name: 'status', type: '"archived" | "pending"' }]}
        />
      );
      break;
    case 'StackTrace':
      content = (
        <StackTrace
          name="TypeError"
          message="Cannot read properties of undefined (reading 'trim')"
          onOpenFrame={(frame) => setNotice(`Open ${frame.file}:${frame.line} requested.`)}
          frames={[
            { id: '1', fn: 'normalizeQuery', file: 'src/search.ts', line: 4, column: 15 },
            { id: '2', fn: 'SearchField', file: 'src/search-field.tsx', line: 22, column: 9 },
            {
              id: '3',
              fn: 'renderWithHooks',
              file: 'react-dom.development.js',
              line: 15486,
              internal: true,
            },
          ]}
        />
      );
      break;
    case 'WebPreview':
      content = (
        <WebPreview
          url={state === 'Unsafe address' ? 'javascript:alert(1)' : 'https://example.com/'}
          title="Sample page preview"
        />
      );
      break;
    case 'AudioPlayer':
      content = (
        <AudioPlayer
          src={state === 'Unavailable' ? 'javascript:void(0)' : '/fixtures/sample-tone.wav'}
          label="Sample answer audio"
        />
      );
      break;
    case 'Transcription':
      content = (
        <Transcription
          currentTime={time}
          onSeek={setTime}
          segments={
            state === 'Empty'
              ? []
              : [
                  {
                    id: '1',
                    start: 0,
                    end: 2.5,
                    speaker: 'You',
                    text: 'Which accounts are inactive?',
                  },
                  {
                    id: '2',
                    start: 2.5,
                    end: 6,
                    speaker: 'Assistant',
                    text: 'Three accounts have had no activity for 90 days.',
                  },
                  {
                    id: '3',
                    start: 6,
                    end: 9,
                    speaker: 'Assistant',
                    text: 'They need an owner review before archival.',
                  },
                ]
          }
        />
      );
      break;
    case 'VoiceSelector':
      content = (
        <VoiceSelector
          value={voice}
          onValueChange={setVoice}
          onPreview={(id) =>
            setNotice(`Sample for ${id} requested. No audio provider is connected.`)
          }
          voices={[
            { id: 'aria', name: 'Aria', description: 'Clear and neutral' },
            { id: 'ben', name: 'Ben', description: 'Warm and calm' },
            { id: 'cy', name: 'Cy', disabledReason: 'Not licensed for this workspace' },
          ]}
        />
      );
      break;
    case 'Persona': {
      const personaState = (
        ['Listening', 'Thinking', 'Speaking', 'Asleep'].includes(state)
          ? state.toLowerCase()
          : 'idle'
      ) as PersonaState;
      content = <Persona state={personaState} name="Relay" />;
      break;
    }
    case 'Image':
      content =
        state === 'Unavailable' ? (
          <Image src="javascript:alert(1)" alt="Sample generated image" />
        ) : (
          <Image
            src="/fixtures/sample-chart.png"
            alt="Bar chart of weekly sign-ups rising from 90 to 210"
            caption="Sample image from local fixtures; no image model is connected."
            width={480}
            height={270}
            state={state === 'Loading' ? 'loading' : 'ready'}
          />
        );
      break;
    default:
      content = null;
  }
  return (
    <div className="ai-extras-specimen">
      {content}
      {notice && (
        <p role="status" className="generic-demo-status">
          {notice}
        </p>
      )}
    </div>
  );
}
