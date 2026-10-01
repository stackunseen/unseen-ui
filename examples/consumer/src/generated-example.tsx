'use client';
import { useState } from 'react';
import { Button, GeneratedUI } from '@ai-interaction/react';
import type {
  GeneratedSurface,
  GeneratedActionRequest,
  GeneratedFormSnapshot,
} from '@ai-interaction/react';
const surface: GeneratedSurface = {
  id: 'consumer-surface',
  version: '1',
  nodes: [
    {
      id: 'section',
      type: 'section',
      title: 'Generated request preview',
      layout: 'grid',
      nodes: [
        { id: 'metric', type: 'metric', label: 'Fixture items', value: '1' },
        {
          id: 'request',
          type: 'form',
          title: 'Request details',
          actionId: 'send-request',
          fields: [
            { id: 'name', label: 'Request name', type: 'text', required: true },
            {
              id: 'environment',
              label: 'Environment',
              type: 'select',
              required: true,
              options: [
                { value: 'preview', label: 'Preview' },
                { value: 'production', label: 'Production' },
              ],
            },
          ],
          steps: [
            { id: 'name', title: 'Name', fieldIds: ['name'] },
            { id: 'environment', title: 'Environment', fieldIds: ['environment'] },
          ],
        },
      ],
    },
  ],
};
export function GeneratedExample() {
  const [form, setForm] = useState<GeneratedFormSnapshot>({
    surfaceId: surface.id,
    version: surface.version,
    nodeId: 'request',
    draftVersion: 'draft-1',
    values: { name: '', environment: 'preview' },
    step: 'name',
  });
  const [pending, setPending] = useState<GeneratedActionRequest>();
  return (
    <section>
      <p>Generated UI consumer · local simulated host; no server or durable storage</p>
      <GeneratedUI
        surface={surface}
        variant="cards"
        state="ready"
        forms={{ request: form }}
        onFormChange={(request) => {
          if (request.type === 'values') setForm({ ...form, values: request.values });
          if (request.type === 'step') setForm({ ...form, step: request.step });
        }}
        onAction={(request) => {
          setPending(request);
          setForm({ ...form, status: 'pending' });
        }}
      />
      {pending && (
        <Button
          disabled={form.status !== 'pending'}
          onClick={() =>
            setForm({
              ...form,
              status: 'complete',
              receipt: {
                surfaceId: pending.surfaceId,
                version: pending.version,
                nodeId: pending.nodeId!,
                draftVersion: pending.form?.submission.identity?.draftVersion,
                message: 'Acknowledged by the local simulated host.',
              },
            })
          }
        >
          Acknowledge generated request
        </Button>
      )}
    </section>
  );
}
