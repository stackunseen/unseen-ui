import { act, render } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { RuntimeProvider, useRuntimeSelector } from '@ai-interaction/react';
import { createRuntime } from '@ai-interaction/core';

import { initialSnapshot } from '../../../../../apps/docs/lib/fixtures';

describe('controlled interactions', () => {
  it('does not rerender a step subscriber for message deltas', () => {
    const initial = initialSnapshot();
    initial.run.lifecycle = 'running';
    initial.messages = [
      { id: 'text', role: 'assistant', text: '', state: 'streaming', revision: 0 },
    ];
    const runtime = createRuntime(initial);
    const renderProbe = vi.fn();
    function StepSubscriber() {
      const steps = useRuntimeSelector((snapshot) => snapshot.steps);
      renderProbe();
      return <div>{steps.length} steps</div>;
    }
    render(
      <RuntimeProvider runtime={runtime}>
        <StepSubscriber />
      </RuntimeProvider>,
    );
    const renders = renderProbe.mock.calls.length;
    act(() => {
      for (let i = 0; i < 50; i++)
        runtime.ingest({
          schemaVersion: 1,
          eventId: `delta-${i}`,
          streamId: initial.streamId,
          sequence: i + 1,
          threadId: initial.run.threadId,
          runId: initial.run.id,
          attemptId: initial.run.attemptId,
          occurredAt: '2026-09-29T12:00:00Z',
          type: 'message.delta',
          payload: { id: 'text', offset: i, text: 'x' },
        });
    });
    expect(runtime.getSnapshot().messages[0]?.text).toHaveLength(50);
    expect(renderProbe).toHaveBeenCalledTimes(renders);
    runtime.dispose();
  });
});
