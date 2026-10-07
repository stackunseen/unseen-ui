'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import {
  AgentSteps,
  ApprovalCard,
  Button,
  Checkbox,
  DataTable,
  Field,
  Input,
  Message,
  PromptInput,
  Select,
  StatusBadge,
  Switch,
  ToolCall,
} from '@stackunseen/ui';
import type { DataTableProps, TableColumn } from '@stackunseen/ui';

type TableRow = DataTableProps['rows'][number];
import { ModelSelector } from '@stackunseen/ui/assistant';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui-core';
import { proposal, steps, tool } from '../lib/fixtures';
import { componentHref } from '../lib/site-paths';
import { updateShowcaseTheme } from '../lib/showcase-theme';
import { useSiteTheme } from './site-shell';

const colors = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Forest', value: '#167145' },
  { name: 'Rose', value: '#b82955' },
];
const checkColumns: TableColumn[] = [
  { id: 'name', label: 'Check', sortable: true },
  { id: 'duration', label: 'Seconds', sortable: true, format: { kind: 'number' } },
  {
    id: 'state',
    label: 'State',
    format: {
      kind: 'status',
      tones: { Passed: 'success', Running: 'primary', Failed: 'danger' },
    },
  },
];
const checkRows: TableRow[] = [
  { id: 'build', cells: { name: 'Build', duration: 67, state: 'Running' } },
  { id: 'search', cells: { name: 'Search tests', duration: 41, state: 'Passed' } },
  { id: 'types', cells: { name: 'Typecheck', duration: 18, state: 'Passed' } },
];

/** One real component per tile, with the page's theme applied to all of them at once. */
function Tile({
  name,
  group,
  span,
  children,
}: {
  name: string;
  group: string;
  span?: 2;
  children: ReactNode;
}) {
  return (
    <article className="home-tile" data-span={span} aria-label={`${name} example`}>
      <div className="home-tile-stage">{children}</div>
      <footer className="home-tile-footer">
        <span>{group}</span>
        <Link prefetch={false} href={componentHref(name)}>
          {name} <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export function HomeShowcase() {
  const { theme, setTheme } = useSiteTheme();
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const [model, setModel] = useState('atlas-fast');
  const [decision, setDecision] = useState<ApprovalProposal>(proposal);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const [name, setName] = useState('Acme Sandbox');
  const [region, setRegion] = useState('eu');
  const [notify, setNotify] = useState(true);
  const [draftKept, setDraftKept] = useState(true);
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' }>({
    columnId: 'name',
    direction: 'asc',
  });
  const rows = [...checkRows].sort((a, b) => {
    const left = a.cells[sort.columnId];
    const right = b.cells[sort.columnId];
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return sort.direction === 'asc' ? order : -order;
  });
  return (
    <section className="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-section-heading">
        <div>
          <p className="web-eyebrow">Real components, local sample data</p>
          <h2 id="home-showcase-title">Pieces for application and AI interfaces.</h2>
        </div>
        <div className="home-showcase-theme" role="group" aria-label="Site primary color">
          <span>Primary</span>
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              aria-label={`${color.name} primary`}
              aria-pressed={theme.seeds.primary === color.value}
              onClick={() => setTheme(updateShowcaseTheme(theme, { primary: color.value }))}
            >
              <span style={{ background: color.value }}>
                {theme.seeds.primary === color.value && <Check size={12} aria-hidden="true" />}
              </span>
            </button>
          ))}
          <Link prefetch={false} className="web-text-link" href="/customize/">
            Theme Studio <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="home-tiles">
        <Tile name="PromptInput" group="Conversation" span={2}>
          <PromptInput
            value={draft}
            onValueChange={setDraft}
            onSubmit={(text) => {
              setSent(text);
              setDraft('');
            }}
            placeholder="Ask about the sample accounts…"
            toolbar={
              <>
                <Button size="sm" variant="ghost" onClick={() => setSent('')}>
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
            }
          />
          <p className="home-tile-status" role="status">
            {sent ? `Your app receives “${sent}”. No model is connected here.` : ''}
          </p>
        </Tile>
        <Tile name="ApprovalCard" group="Review & permissions">
          <ApprovalCard
            proposal={decision}
            submission={submission}
            onDecision={(choice) => {
              setSubmission('acknowledged');
              setDecision({ ...decision, status: choice === 'approve' ? 'approved' : 'rejected' });
            }}
          />
        </Tile>
        <Tile name="Message" group="Conversation">
          <div className="message-exchange">
            <Message
              variant="bubble"
              value={{
                id: 'question',
                role: 'user',
                revision: 1,
                text: 'Which accounts need an owner review?',
                state: 'complete',
              }}
            />
            <Message
              value={{
                id: 'answer',
                role: 'assistant',
                revision: 1,
                text: 'Three accounts have been inactive for 90 days. Each has an owner on file.',
                state: 'complete',
              }}
            />
          </div>
        </Tile>
        <Tile name="ToolCall" group="Tools & execution">
          <ToolCall value={tool} />
        </Tile>
        <Tile name="AgentSteps" group="Tools & execution">
          <AgentSteps steps={steps.slice(0, 3)} />
        </Tile>
        <Tile name="Field" group="Forms">
          <div className="home-form-tile">
            <Field label="Workspace name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Data region">
              <Select
                value={region}
                onValueChange={setRegion}
                options={[
                  { value: 'eu', label: 'European Union' },
                  { value: 'us', label: 'United States' },
                ]}
              />
            </Field>
            <Field label="Email notifications" orientation="horizontal">
              <Switch checked={notify} onCheckedChange={setNotify} />
            </Field>
            <Field label="Keep a local draft" orientation="horizontal">
              <Checkbox checked={draftKept} onCheckedChange={setDraftKept} />
            </Field>
            <div className="home-form-actions">
              <StatusBadge
                state={draftKept ? 'succeeded' : 'idle'}
                label={draftKept ? 'Draft saved' : 'Not saved'}
              />
              <Button size="sm" variant="outline">
                Cancel
              </Button>
              <Button size="sm">Save changes</Button>
            </div>
          </div>
        </Tile>
        <Tile name="DataTable" group="Forms & generated UI" span={2}>
          <DataTable
            caption="Synthetic build checks"
            columns={checkColumns}
            rows={rows}
            sort={sort}
            onSort={setSort}
          />
        </Tile>
      </div>
    </section>
  );
}
