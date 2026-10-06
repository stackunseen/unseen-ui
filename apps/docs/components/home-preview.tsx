'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Checkbox, Input, Modal, PromptInput, Switch, Tabs } from '@stackunseen/ui';
import Link from 'next/link';
import { updateShowcaseTheme } from '../lib/showcase-theme';
import { useSiteTheme } from './site-shell';
const colors = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Forest', value: '#167145' },
  { name: 'Rose', value: '#b82955' },
];
export function HomePreview() {
  const [tab, setTab] = useState('composer');
  const [draft, setDraft] = useState('Summarize the account review.');
  const [response, setResponse] = useState(false);
  const [notify, setNotify] = useState(true);
  const [name, setName] = useState('Acme Sandbox');
  const [checked, setChecked] = useState(true);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState('Account review');
  const [projectSaved, setProjectSaved] = useState(false);
  const { theme, setTheme } = useSiteTheme();
  const composer = (
    <section className="home-demo-content home-assistant" aria-labelledby="preview-assistant-title">
      <p className="home-demo-label">Conversation / PromptInput</p>
      <h3 id="preview-assistant-title">Account assistant</h3>
      <div className="home-sample-message">
        <span className="home-assistant-mark" aria-hidden="true">
          u
        </span>
        <p>
          {response
            ? 'The sample review includes 3 inactive accounts. Ask the owner to review them before archiving.'
            : 'The account review is ready. What would you like to look at?'}
        </p>
      </div>
      <PromptInput
        variant="inline"
        value={draft}
        onValueChange={setDraft}
        onSubmit={() => {
          setResponse(true);
          setDraft('');
        }}
        placeholder="Ask about the sample accounts."
      />
      <p className="home-demo-feedback" role="status">
        {response
          ? 'Fixed sample response. No model is connected.'
          : 'Try sending a prompt. This preview uses a fixed response.'}
      </p>
    </section>
  );
  const form = (
    <section className="home-demo-content home-form-demo" aria-labelledby="preview-controls-title">
      <p className="home-demo-label">Forms / Input · Switch · Checkbox · Button</p>
      <h3 id="preview-controls-title">Workspace settings</h3>
      <label className="home-demo-field">
        Workspace name
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
      </label>
      <label className="home-demo-switch">
        <span>Email notifications</span>
        <Switch
          checked={notify}
          onCheckedChange={(value) => {
            setNotify(value);
            setSaved(false);
          }}
        />
      </label>
      <div className="home-demo-save">
        <label>
          <Checkbox checked={checked} onCheckedChange={setChecked} /> Keep a local draft
        </label>
        <Button size="sm" onClick={() => setSaved(true)}>
          Save changes
        </Button>
      </div>
      <p className="home-demo-feedback" role="status">
        {saved ? 'Saved in this preview.' : 'Settings stay in this page until you refresh.'}
      </p>
    </section>
  );
  const dialog = (
    <section className="home-demo-content home-dialog-demo" aria-labelledby="preview-dialog-title">
      <p className="home-demo-label">Overlays / Modal</p>
      <h3 id="preview-dialog-title">Your content. Your actions.</h3>
      <p>
        Pass a custom header and footer. The body scrolls between them, so actions stay within
        reach.
      </p>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit project"
        description="Change the name of this sample project."
        header={
          <div className="home-modal-heading">
            <span>Project settings</span>
            <strong>Edit project</strong>
          </div>
        }
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" form="home-project-form">
              Save project
            </Button>
          </>
        }
        trigger={<Button>Open dialog</Button>}
      >
        <form
          id="home-project-form"
          onSubmit={(event) => {
            event.preventDefault();
            setProjectSaved(true);
            setOpen(false);
          }}
        >
          <label className="home-demo-field">
            Project name
            <Input value={project} onChange={(event) => setProject(event.target.value)} required />
          </label>
          <p className="home-demo-feedback">
            The save button lives in the footer and submits this form through its form ID.
          </p>
        </form>
      </Modal>
      <p className="home-demo-feedback" role="status">
        {projectSaved
          ? `Saved “${project}” in this preview.`
          : 'This dialog changes a local sample only.'}
      </p>
    </section>
  );
  return (
    <div className="home-component-stage" role="group" aria-label="Interactive component examples">
      <div className="home-stage-main">
        <Tabs
          value={tab}
          onValueChange={setTab}
          label="Component playground"
          items={[
            { value: 'composer', label: 'Composer', content: composer },
            { value: 'forms', label: 'Forms', content: form },
            { value: 'dialog', label: 'Dialog', content: dialog },
          ]}
        />
      </div>
      <aside className="home-stage-guide" aria-label="Preview customization and usage">
        <div>
          <p className="home-demo-label">Theme</p>
          <h3>Try your theme</h3>
          <p>
            Pick a primary color and watch this whole showcase change. Theme Studio also controls
            backgrounds, borders and corners.
          </p>
          <div className="home-accent-options" role="group" aria-label="Site primary color">
            {colors.map((color) => (
              <button
                key={color.name}
                type="button"
                aria-label={`${color.name} primary`}
                aria-pressed={theme.seeds.primary === color.value}
                onClick={() => setTheme(updateShowcaseTheme(theme, { primary: color.value }))}
              >
                <span style={{ background: color.value }}>
                  {theme.seeds.primary === color.value && <Check size={14} aria-hidden="true" />}
                </span>
                {color.name}
              </button>
            ))}
          </div>
          <Link prefetch={false} className="web-text-link" href="/customize/">
            Open Theme Studio <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div>
          <p className="home-demo-label">How it connects</p>
          <p>Your app owns the value. A callback reports what changed.</p>
          <pre>
            <code>
              {tab === 'composer'
                ? '<PromptInput\n  value={draft}\n  onValueChange={setDraft}\n  onSubmit={handleSend}\n/>'
                : tab === 'forms'
                  ? '<Input\n  value={name}\n  onChange={(event) =>\n    setName(event.target.value)\n  }\n/>'
                  : '<Modal\n  open={open}\n  onOpenChange={setOpen}\n  header={<ProjectHeader />}\n  footer={<ProjectActions />}\n>…</Modal>'}
            </code>
          </pre>
          <a
            className="web-text-link"
            href={
              tab === 'composer'
                ? '/components/prompt-input/#component-props'
                : tab === 'forms'
                  ? '/components/input/#component-props'
                  : '/docs/customization/#custom-headers-and-footers'
            }
          >
            Read the usage guide <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </aside>
    </div>
  );
}
