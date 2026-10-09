'use client';
import { useId, useRef, useState } from 'react';
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
  const [canvasSelection, setCanvasSelection] = useState<string | null>(null);
  const inspectorStart = useRef<HTMLDivElement>(null);
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
  if (name === 'Sidecar' && state === 'Beside a canvas') {
    const selected = canvasSelection !== null;
    return (
      <div className="generic-demo generic-sidecar-demo" data-demo={name}>
        <p>
          Pick a node on the canvas. The inspector opens from that selection, takes focus, closes on
          Escape from anywhere and stays clear of the header above it.
        </p>
        <div className="generic-canvas" role="group" aria-label="Sample canvas">
          {['Ingest', 'Index', 'Rank'].map((node) => (
            <button
              key={node}
              type="button"
              className="generic-canvas-node"
              aria-pressed={canvasSelection === node}
              onClick={() => setCanvasSelection(canvasSelection === node ? null : node)}
            >
              {node}
            </button>
          ))}
        </div>
        <Sidecar
          presentation="overlay"
          open={selected}
          onOpenChange={(next) => {
            if (!next) setCanvasSelection(null);
          }}
          title={canvasSelection ? `${canvasSelection} node` : 'Node'}
          description="Details for the selected node."
          headingLevel={3}
          inset={{ top: 72, bottom: 16 }}
          narrowPresentation="sheet"
          initialFocusRef={inspectorStart}
          dismissOnInteractOutside={false}
          bodyLabel="Node details"
        >
          <div ref={inspectorStart} tabIndex={-1}>
            <p>Stage: {canvasSelection}</p>
            <p>Owner: Platform team</p>
          </div>
        </Sidecar>
      </div>
    );
  }
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
                  variant={section === label ? 'outline' : 'ghost'}
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
