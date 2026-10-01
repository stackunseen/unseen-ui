'use client';
import { useState } from 'react';
import { Button } from '@ai-interaction/react';
import { SplitPane } from '@ai-interaction/react/layout';
import type { SplitPaneSizes } from '@ai-interaction/react/layout';

export function SplitPaneSpecimen({
  state,
  presentation,
}: {
  state: string;
  presentation?: string;
}) {
  const [sizes, setSizes] = useState<SplitPaneSizes>(
    state === 'Collapsed secondary' ? [100, 0] : [65, 35],
  );
  const mode = presentation === 'split' || presentation === 'stacked' ? presentation : 'responsive';
  return (
    <div className="generic-demo" data-demo="SplitPane">
      <div className="generic-demo-actions">
        <Button
          variant="outline"
          disabled={state === 'Read-only'}
          onClick={() => setSizes(sizes[1] === 0 ? [65, 35] : [100, 0])}
        >
          {sizes[1] === 0 ? 'Restore details pane' : 'Collapse details pane'}
        </Button>
      </div>
      <div className="generic-split-container">
        <SplitPane
          label={`Document workspace ${mode}`}
          presentation={mode}
          sizes={sizes}
          onSizesChange={setSizes}
          disabled={state === 'Read-only'}
          resizeLabel="Resize document and details"
          primary={{
            id: 'document',
            label: 'Document content',
            scroll: 'auto',
            children: (
              <div className="generic-pane-content">
                <h3>Document</h3>
                <p>Resize the panes using the separator.</p>
                {state === 'Long content' && (
                  <p>{'Keep the document and its supporting context accessible. '.repeat(30)}</p>
                )}
              </div>
            ),
          }}
          secondary={{
            id: 'details',
            label: 'Document details',
            collapsible: true,
            scroll: 'auto',
            children: (
              <div className="generic-pane-content">
                <h3>Details</h3>
                <p>Owner: Project team</p>
              </div>
            ),
          }}
        />
      </div>
      <p className="generic-demo-status" role="status">
        Document {Math.round(sizes[0])}% · Details {Math.round(sizes[1])}%
      </p>
    </div>
  );
}
