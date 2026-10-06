'use client';
import { useId, useState } from 'react';
import { Button, StatusBadge } from '@stackunseen/ui';
import { PanelHeader, WorkspaceShell } from '@stackunseen/ui/workspace';
import { Sidecar } from '@stackunseen/ui/sidecar';

export function LayoutSpecimen({
  name,
  state,
  presentation,
}: {
  name: string;
  state: string;
  presentation?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('Overview');
  const [notice, setNotice] = useState('');
  if (name === 'PanelHeader')
    return (
      <div className="generic-demo" data-demo={name}>
        <PanelHeader
          title={
            state === 'Long title'
              ? 'Project overview for the international documentation and developer experience workspace'
              : 'Project overview'
          }
          description="Current project information and local actions."
          headingLevel={3}
          status={state === 'With status' ? <StatusBadge state="idle" label="Draft" /> : undefined}
          actions={
            state === 'With actions' ? (
              <Button
                variant="outline"
                onClick={() => setNotice('Edit requested for the current project.')}
              >
                Edit project
              </Button>
            ) : undefined
          }
        />
        <p role="status" className="generic-demo-status">
          {notice}
        </p>
      </div>
    );
  if (name === 'Sidecar') {
    const mode = presentation === 'drawer' || presentation === 'overlay' ? presentation : 'docked';
    return (
      <div className="generic-demo generic-sidecar-demo" data-demo={name}>
        <p>Inspect a document while keeping its main content available.</p>
        <Sidecar
          presentation={mode}
          side={state === 'Start side' ? 'start' : 'end'}
          open={open}
          onOpenChange={setOpen}
          title="Document details"
          description="Local document metadata and notes."
          headingLevel={3}
          trigger={<Button variant="outline">Inspect document</Button>}
          bodyLabel="Document metadata"
          footer={<span>Changes remain in this example.</span>}
        >
          <p>Owner: Project team</p>
          <p>Document: Component guide</p>
          {state === 'Long content' && (
            <p>{'Supporting context stays readable within this inspector. '.repeat(35)}</p>
          )}
          <Button variant="outline" onClick={() => setNotice('Document review requested.')}>
            Request review
          </Button>
          <p role="status">{notice}</p>
        </Sidecar>
      </div>
    );
  }
  const variant =
    presentation === 'contained' || presentation === 'compact' ? presentation : 'workspace';
  return (
    <div className="generic-demo" data-demo={name}>
      <WorkspaceShell
        variant={variant}
        label={`Project workspace ${variant}`}
        mainAs="section"
        mainLabel={`Project content ${variant}`}
        navigationLabel={`Project sections ${variant}`}
        inspectorLabel={`Project details ${variant}`}
        header={
          state === 'Minimal' ? undefined : (
            <PanelHeader title="Project workspace" headingLevel={3} />
          )
        }
        navigation={
          state === 'Minimal' ? undefined : (
            <div className="generic-workspace-nav">
              {['Overview', 'Activity'].map((label) => (
                <Button
                  key={label}
                  variant={section === label ? 'secondary' : 'ghost'}
                  aria-pressed={section === label}
                  onClick={() => setSection(label)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )
        }
        main={
          <div>
            <h4 id={`${id}-section`}>{section}</h4>
            <p>
              {section === 'Overview'
                ? 'This section contains the current sample project.'
                : 'No recent activity in this local example.'}
            </p>
            {state === 'Long content' && (
              <p>{'Workspace sections share page scrolling in flow mode. '.repeat(22)}</p>
            )}
          </div>
        }
        inspector={
          state === 'With inspector' ? (
            <div>
              <h4>Details</h4>
              <p>Status: Draft</p>
              <Button variant="outline" onClick={() => setNotice('Project edit requested.')}>
                Edit details
              </Button>
            </div>
          ) : undefined
        }
        footer={state === 'Minimal' ? undefined : <span>Local workspace example</span>}
      />
      <p role="status" className="generic-demo-status">
        {notice}
      </p>
    </div>
  );
}
