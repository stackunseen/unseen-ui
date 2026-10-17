'use client';
import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button, IconButton, LoadingIndicator, Modal } from '@stackunseen/ui';
import type { ButtonProps } from '@stackunseen/ui';
import { ExampleLoading } from './example-loading';
import { websiteNames } from '../lib/website-catalog';
import { applicationNames, marketingNames } from '../lib/optional-catalog';
import { aiExtrasNames } from '../lib/ai-extras-catalog';

const ApplicationSpecimen = dynamic(
  () => import('./application-specimen').then((m) => m.ApplicationSpecimen),
  { loading: ExampleLoading },
);
const MarketingSpecimen = dynamic(
  () => import('./marketing-specimen').then((m) => m.MarketingSpecimen),
  { loading: ExampleLoading },
);

const AIExtrasSpecimen = dynamic(
  () => import('./ai-extras-specimen').then((m) => m.AIExtrasSpecimen),
  { loading: ExampleLoading },
);
const WebsiteSpecimen = dynamic(() => import('./website-specimen').then((m) => m.WebsiteSpecimen), {
  loading: ExampleLoading,
});

const LayoutSpecimen = dynamic(() => import('./layout-specimen').then((m) => m.LayoutSpecimen), {
  loading: ExampleLoading,
});
const SplitPaneSpecimen = dynamic(
  () => import('./split-pane-specimen').then((m) => m.SplitPaneSpecimen),
  { loading: ExampleLoading },
);
const buttonVariants = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
] as const satisfies readonly NonNullable<ButtonProps['variant']>[];

export function GenericSpecimen({
  name,
  state = 'Default',
  presentation,
}: {
  name: string;
  state?: string;
  presentation?: string;
}) {
  const id = useId();
  const [count, setCount] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('Component explorer');
  const [notice, setNotice] = useState('');
  const variant =
    buttonVariants.find((item) => item === presentation) ??
    (name === 'IconButton' ? 'ghost' : 'primary');
  if (websiteNames.has(name))
    return <WebsiteSpecimen name={name} state={state} presentation={presentation} />;
  if (applicationNames.has(name)) return <ApplicationSpecimen name={name} state={state} />;
  if (marketingNames.has(name)) return <MarketingSpecimen name={name} state={state} />;
  if (aiExtrasNames.has(name)) return <AIExtrasSpecimen name={name} state={state} />;
  if (name === 'SplitPane') return <SplitPaneSpecimen state={state} presentation={presentation} />;
  if (['Sidecar', 'WorkspaceShell'].includes(name))
    return <LayoutSpecimen name={name} state={state} presentation={presentation} />;
  let content;
  if (name === 'Button' && state === 'Link') {
    content = (
      <>
        <div className="generic-demo-actions" style={{ margin: 0 }}>
          <Button href="/getting-started/" variant={variant}>
            Get started
          </Button>
          <Button
            href="https://www.npmjs.com/package/@stackunseen/ui"
            variant="outline"
            target="_blank"
            rel="noreferrer"
          >
            Open the npm package
          </Button>
        </div>
        <p className="generic-demo-status">With href, Button renders a link with the same look.</p>
      </>
    );
  } else if (name === 'Button') {
    const busy = state === 'Busy';
    content = (
      <>
        <Button
          variant={variant}
          size={state === 'Small' ? 'sm' : 'default'}
          disabled={state === 'Disabled' || busy}
          aria-busy={busy || undefined}
          onClick={() => setCount((value) => value + 1)}
        >
          {busy && <LoadingIndicator variant="spinner" label="Saving" />}
          {busy
            ? 'Saving…'
            : state === 'Long label'
              ? 'Save changes to the selected project'
              : 'Save changes'}
        </Button>
        <p role="status" className="generic-demo-status">
          {count
            ? `Button activated ${count} ${count === 1 ? 'time' : 'times'}.`
            : state === 'Disabled'
              ? 'Saving is unavailable in this example state.'
              : busy
                ? 'The application reports a pending save.'
                : 'Activate the button to test the callback.'}
        </p>
      </>
    );
  } else if (name === 'IconButton') {
    content = (
      <>
        <div className="generic-action-row">
          <span>{state === 'Toggle' ? 'Was this information helpful?' : 'Project records'}</span>
          <IconButton
            variant={variant}
            icon={state === 'Toggle' ? 'helpful' : 'retry'}
            label={
              state === 'Long label'
                ? 'Refresh all project records in the current workspace'
                : state === 'Toggle'
                  ? 'Mark as helpful'
                  : 'Refresh records'
            }
            disabled={state === 'Disabled'}
            aria-pressed={state === 'Toggle' ? pressed : undefined}
            onClick={() => {
              setCount((value) => value + 1);
              setPressed((value) => !value);
            }}
          />
        </div>
        <p role="status" className="generic-demo-status">
          {state === 'Toggle'
            ? pressed
              ? 'Marked helpful in this example.'
              : 'No feedback selected.'
            : count
              ? `Refresh requested ${count} ${count === 1 ? 'time' : 'times'}.`
              : 'Focus or hover the icon to read its label.'}
        </p>
      </>
    );
  } else if (name === 'Modal') {
    const layout =
      presentation === 'sheet' || presentation === 'fullscreen' ? presentation : 'dialog';
    content = (
      <>
        <Modal
          layout={layout}
          open={open}
          onOpenChange={setOpen}
          title="Project details"
          description="Review the local sample project. Changes stay in this example."
          trigger={<Button variant="outline">Open project details</Button>}
          header={
            state === 'Custom header and footer' ? (
              <div className="custom-modal-heading">
                <strong>Project details</strong>
                <span>Local draft</span>
              </div>
            ) : undefined
          }
          footer={
            state === 'Form' ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form={`${id}-project-form`}>
                  Save example
                </Button>
              </>
            ) : (
              <>
                {state === 'Custom header and footer' && (
                  <span className="custom-modal-footer-note">Changes stay in this preview.</span>
                )}
                <Button
                  onClick={() => {
                    setNotice('Project details reviewed.');
                    setOpen(false);
                  }}
                >
                  Done
                </Button>
              </>
            )
          }
        >
          {state === 'Form' ? (
            <form
              id={`${id}-project-form`}
              className="generic-demo-form"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice(`Project name updated to ${draft}.`);
                setOpen(false);
              }}
            >
              <label htmlFor={`${id}-name`}>Project name</label>
              <input
                id={`${id}-name`}
                className="generic-demo-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                required
              />
            </form>
          ) : (
            <>
              <div className="generic-modal-content" role="group" aria-label="Project information">
                {(state === 'Long content' ? Array.from({ length: 14 }) : [0]).map((_, index) => (
                  <p key={index}>
                    This sample project brings reusable controls, clear documentation and accessible
                    interactions together. Review each section before continuing.
                  </p>
                ))}
              </div>
            </>
          )}
        </Modal>
        <p role="status" className="generic-demo-status">
          {notice || 'Open the example, then use Escape to return to its trigger.'}
        </p>
      </>
    );
  }
  return (
    <div className="generic-demo" data-demo={name}>
      {content}
    </div>
  );
}
