import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedUI } from '@ai-interaction/react';
import type {
  GeneratedSurface,
  GeneratedFormSnapshot,
  GeneratedFormRequest,
  GeneratedActionSnapshot,
} from '@ai-interaction/react';

const formSurface: GeneratedSurface = {
  id: 'deployment',
  version: '2',
  nodes: [
    {
      id: 'review',
      type: 'section',
      title: 'Deployment review',
      layout: 'grid',
      nodes: [
        { id: 'total', type: 'metric', label: 'Reviewers', value: '1' },
        {
          id: 'questions',
          type: 'form',
          title: 'Deployment questions',
          actionId: 'deploy',
          fields: [{ id: 'project', label: 'Project', type: 'text', required: true }],
          arrays: [
            {
              id: 'owners',
              label: 'Owners',
              maxItems: 3,
              minItems: 1,
              fields: [{ id: 'name', label: 'Owner name', type: 'text', required: true }],
            },
          ],
          steps: [
            { id: 'basics', title: 'Basics', fieldIds: ['project'] },
            { id: 'owners', title: 'Review', fieldIds: ['owners'] },
          ],
        },
      ],
    },
  ],
};
const snapshot: GeneratedFormSnapshot = {
  surfaceId: 'deployment',
  version: '2',
  nodeId: 'questions',
  draftVersion: 'draft-3',
  values: { project: 'Demo' },
  arrayValues: { owners: [{ id: 'owner-1', values: { name: 'Ada' } }] },
  step: 'basics',
};
const actionSurface: GeneratedSurface = {
  id: 'result',
  version: '1',
  nodes: [{ id: 'action', type: 'action', label: 'Open review', actionId: 'review' }],
};
const variants = ['stack', 'cards', 'compact'] as const;

describe('generated surface composition and host ownership', () => {
  it.each(['denied', 'loading', 'stale', 'unavailable'] as const)(
    'parent pending/streaming cannot expose a hidden form snapshot: %s',
    (status) => {
      const props = {
        surface: formSurface,
        forms: { questions: { ...snapshot, status } },
        onFormChange: vi.fn(),
        onAction: vi.fn(),
      };
      const { rerender } = render(<GeneratedUI {...props} state="ready" />);
      for (const state of ['ready', 'pending', 'streaming'] as const) {
        rerender(<GeneratedUI {...props} state={state} />);
        expect(screen.queryByLabelText(/Project/)).toBeNull();
        expect(screen.queryByDisplayValue('Demo')).toBeNull();
      }
    },
  );
  it('preserves a matching completed form receipt while another surface action is pending', () => {
    render(
      <GeneratedUI
        surface={formSurface}
        state="pending"
        forms={{
          questions: {
            ...snapshot,
            status: 'complete',
            receipt: {
              surfaceId: snapshot.surfaceId,
              version: snapshot.version,
              nodeId: snapshot.nodeId,
              draftVersion: snapshot.draftVersion,
              message: 'Earlier form acknowledged',
            },
          },
        }}
        onAction={() => {}}
        onFormChange={() => {}}
      />,
    );
    expect(screen.getByText('Earlier form acknowledged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submitted' })).toBeDisabled();
  });
  it('bounds actual host row controls across forms even when declared maxima are small', () => {
    const fields = Array.from({ length: 10 }, (_, index) => ({
      id: `field-${index}`,
      type: 'text' as const,
      label: `Field ${index}`,
    }));
    const nodes = ['a', 'b'].map((id) => ({
      id,
      type: 'form' as const,
      title: `Form ${id}`,
      actionId: `submit-${id}`,
      fields: [],
      arrays: [{ id: 'rows', label: 'Rows', fields, maxItems: 1 }],
    }));
    const forms = Object.fromEntries(
      nodes.map((node) => [
        node.id,
        {
          surfaceId: 's',
          version: '1',
          nodeId: node.id,
          values: {},
          arrayValues: {
            rows: Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}`, values: {} })),
          },
        },
      ]),
    );
    render(
      <GeneratedUI
        surface={{ id: 's', version: '1', nodes }}
        state="ready"
        forms={forms}
        onFormChange={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('host form snapshots exceed');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('retains correctable rows above a declared count while within the global control bound', async () => {
    const change = vi.fn();
    const nodes = [
      {
        id: 'form',
        type: 'form',
        title: 'Correct rows',
        actionId: 'submit',
        fields: [],
        arrays: [
          {
            id: 'rows',
            label: 'Rows',
            maxItems: 1,
            fields: [{ id: 'name', label: 'Name', type: 'text' }],
          },
        ],
      },
    ];
    render(
      <GeneratedUI
        surface={{ id: 's', version: '1', nodes }}
        state="ready"
        forms={{
          form: {
            surfaceId: 's',
            version: '1',
            nodeId: 'form',
            values: {},
            arrayValues: {
              rows: [
                { id: 'a', values: { name: 'Ada' } },
                { id: 'b', values: { name: 'Grace' } },
              ],
            },
          },
        }}
        onFormChange={change}
        onAction={() => {}}
      />,
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Rows item 1' }));
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'array',
        change: expect.objectContaining({ type: 'remove', rowId: 'a' }),
      }),
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });
  it('rejects accessor-bearing action records without invoking them', () => {
    const getter = vi.fn(() => 'review');
    const record = {
      surfaceId: 'result',
      version: '1',
      get actionId() {
        return getter();
      },
      status: 'complete' as const,
      message: 'Obsolete completion',
    };
    render(
      <GeneratedUI
        surface={actionSurface}
        state="ready"
        onAction={() => {}}
        actionStates={[record]}
      />,
    );
    expect(getter).not.toHaveBeenCalled();
    expect(screen.queryByText(/Obsolete completion/)).toBeNull();
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('retains valid multilingual and emoji identities in accessible action references', async () => {
    const action = vi.fn();
    const surface = {
      id: '結果',
      version: '1',
      nodes: [{ id: '確認🚀', type: 'action', label: 'Review', actionId: '確認' }],
    };
    render(
      <GeneratedUI
        surface={surface}
        state="ready"
        onAction={action}
        actionStates={[
          {
            surfaceId: '結果',
            version: '1',
            actionId: '確認',
            status: 'error',
            message: 'Current error',
          },
        ]}
      />,
    );
    expect(screen.getByRole('button')).toHaveAccessibleDescription(/Current error/);
    await userEvent.click(screen.getByRole('button'));
    expect(action).toHaveBeenCalledWith({ surfaceId: '結果', version: '1', actionId: '確認' });
  });
  it.each(['errors', 'arrayErrors', 'receipt', 'values', 'status'])(
    'hides malformed host form data: %s',
    (property) => {
      const invalid = {
        ...snapshot,
        [property]:
          property === 'values'
            ? { project: {} }
            : property === 'errors'
              ? { project: 5 }
              : property === 'arrayErrors'
                ? { owners: { rows: { 'owner-1': { name: 5 } } } }
                : property === 'receipt'
                  ? { message: {} }
                  : 'unrecognized',
      } as unknown as GeneratedFormSnapshot;
      render(
        <GeneratedUI
          surface={formSurface}
          state="ready"
          forms={{ questions: invalid }}
          onFormChange={() => {}}
          onAction={() => {}}
        />,
      );
      expect(screen.queryByLabelText(/Project/)).toBeNull();
      expect(
        screen.getByText('The form version changed. Request a current host snapshot.'),
      ).toBeInTheDocument();
    },
  );
  it.each(variants)(
    'composes a controlled form and submits versioned data: %s',
    async (variant) => {
      const submit = vi.fn();
      function Host() {
        const [form, setForm] = useState(snapshot);
        function change(request: GeneratedFormRequest) {
          expect(request).toMatchObject({
            surfaceId: 'deployment',
            version: '2',
            nodeId: 'questions',
            draftVersion: 'draft-3',
          });
          if (request.type === 'step') setForm({ ...form, step: request.step });
          if (request.type === 'values') setForm({ ...form, values: request.values });
          if (request.type === 'array' && request.change.type === 'change') {
            const intent = request.change;
            setForm({
              ...form,
              arrayValues: { owners: [{ id: 'owner-1', values: { name: String(intent.value) } }] },
            });
          }
        }
        return (
          <GeneratedUI
            variant={variant}
            surface={formSurface}
            state="ready"
            forms={{ questions: form }}
            onFormChange={change}
            onAction={submit}
          />
        );
      }
      render(<Host />);
      expect(screen.getByRole('group', { name: 'Deployment review' })).toBeInTheDocument();
      await userEvent.clear(screen.getByLabelText(/Project/));
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByLabelText(/Project/)).toHaveFocus();
      await userEvent.type(screen.getByLabelText(/Project/), 'Release');
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      await userEvent.clear(screen.getByLabelText(/Owner name/));
      await userEvent.type(screen.getByLabelText(/Owner name/), 'Grace');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(submit).toHaveBeenCalledWith({
        surfaceId: 'deployment',
        version: '2',
        nodeId: 'questions',
        actionId: 'deploy',
        form: {
          values: { project: 'Release' },
          submission: {
            identity: { formId: 'questions', schemaVersion: '2', draftVersion: 'draft-3' },
            arrayValues: { owners: [{ id: 'owner-1', values: { name: 'Grace' } }] },
          },
        },
      });
      expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
      expect(screen.queryByText(/Host reported completion/)).toBeNull();
    },
  );
  it('emits edits without mutating the host snapshot', async () => {
    const change = vi.fn();
    render(
      <GeneratedUI
        surface={formSurface}
        state="ready"
        forms={{ questions: snapshot }}
        onFormChange={change}
        onAction={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Project/), 'x');
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'values', values: { project: 'Demox' } }),
    );
    expect(screen.getByLabelText(/Project/)).toHaveValue('Demo');
    expect(snapshot.values.project).toBe('Demo');
  });
  it('does not infer an action outcome from a click', async () => {
    const action = vi.fn();
    render(<GeneratedUI surface={actionSurface} state="ready" onAction={action} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open review' }));
    expect(action).toHaveBeenCalledWith({ surfaceId: 'result', version: '1', actionId: 'review' });
    expect(screen.getByRole('button', { name: 'Open review' })).toBeEnabled();
    expect(screen.queryByText(/Awaiting host/)).toBeNull();
  });
  it.each(['pending', 'complete', 'error', 'denied', 'unknown'] as const)(
    'reflects only a matching action snapshot: %s',
    (status) => {
      const action = vi.fn();
      const current: GeneratedActionSnapshot = {
        surfaceId: 'result',
        version: '1',
        actionId: 'review',
        status,
        message: 'Current host message',
      };
      const { rerender } = render(
        <GeneratedUI
          surface={actionSurface}
          state="ready"
          onAction={action}
          actionStates={[current]}
        />,
      );
      expect(screen.getByText(/Current host message/)).toBeInTheDocument();
      if (status === 'error') expect(screen.getByRole('button')).toBeEnabled();
      else expect(screen.getByRole('button')).toBeDisabled();
      rerender(
        <GeneratedUI
          surface={{ ...actionSurface, version: '2' }}
          state="ready"
          onAction={action}
          actionStates={[current]}
        />,
      );
      expect(screen.queryByText(/Current host message/)).toBeNull();
      expect(screen.getByText(/Action state is stale/)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
      expect(action).not.toHaveBeenCalled();
    },
  );
  it('rejects ambiguous action acknowledgements and absent handlers', () => {
    const current: GeneratedActionSnapshot = {
      surfaceId: 'result',
      version: '1',
      actionId: 'review',
      status: 'complete',
      message: 'Old completion',
    };
    const { rerender } = render(
      <GeneratedUI
        surface={actionSurface}
        state="ready"
        onAction={() => {}}
        actionStates={[current, current]}
      />,
    );
    expect(screen.queryByText(/Old completion/)).toBeNull();
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<GeneratedUI surface={actionSurface} state="ready" />);
    expect(screen.getByText(/No host action handler/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('binds form drafts and receipts to surface, version, node and draft', () => {
    const current: GeneratedFormSnapshot = {
      ...snapshot,
      step: 'owners',
      status: 'complete',
      receipt: {
        surfaceId: 'deployment',
        version: '2',
        nodeId: 'questions',
        draftVersion: 'draft-3',
        message: 'Matching receipt',
      },
    };
    const props = { state: 'ready' as const, onAction: vi.fn(), onFormChange: vi.fn() };
    const { rerender } = render(
      <GeneratedUI {...props} surface={formSurface} forms={{ questions: current }} />,
    );
    expect(screen.getByText('Matching receipt')).toBeInTheDocument();
    rerender(
      <GeneratedUI
        {...props}
        surface={formSurface}
        forms={{ questions: { ...current, receipt: { ...current.receipt!, surfaceId: 'other' } } }}
      />,
    );
    expect(screen.queryByText('Matching receipt')).toBeNull();
    expect(screen.getByRole('button', { name: 'Receipt unavailable' })).toBeDisabled();
    rerender(
      <GeneratedUI
        {...props}
        surface={{ ...formSurface, version: '3' }}
        forms={{ questions: current }}
      />,
    );
    expect(screen.queryByLabelText(/Owner name/)).toBeNull();
    expect(screen.queryByText('Matching receipt')).toBeNull();
    rerender(
      <GeneratedUI
        {...props}
        surface={formSurface}
        forms={{ questions: { ...current, draftVersion: 'draft-4' } }}
      />,
    );
    expect(screen.queryByText('Matching receipt')).toBeNull();
    expect(screen.getByRole('button', { name: 'Receipt unavailable' })).toBeDisabled();
  });
  it('discards validation on an immutable surface replacement', async () => {
    const props = { state: 'ready' as const, onAction: vi.fn(), onFormChange: vi.fn() };
    const { rerender } = render(
      <GeneratedUI
        {...props}
        surface={formSurface}
        forms={{ questions: { ...snapshot, values: { project: '' } } }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    rerender(
      <GeneratedUI
        {...props}
        surface={{ ...formSurface, version: '3' }}
        forms={{ questions: { ...snapshot, version: '3' } }}
      />,
    );
    expect(screen.queryByText('This field is required.')).toBeNull();
    expect(screen.getByLabelText(/Project/)).toHaveValue('Demo');
  });
  it.each(['loading', 'denied', 'unavailable', 'error'] as const)(
    'hides content and handlers without reading surface accessors: %s',
    (state) => {
      const getter = vi.fn(() => actionSurface.nodes);
      render(
        <GeneratedUI
          surface={{
            id: 'result',
            version: '1',
            get nodes() {
              return getter();
            },
          }}
          state={state}
          onAction={vi.fn()}
        />,
      );
      expect(getter).not.toHaveBeenCalled();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Open review')).toBeNull();
    },
  );
  it.each(['streaming', 'pending', 'stale'] as const)(
    'keeps partial/stale text explicit and disables actions: %s',
    (state) => {
      render(<GeneratedUI surface={actionSurface} state={state} onAction={() => {}} />);
      expect(screen.getByRole('button', { name: 'Open review' })).toBeDisabled();
    },
  );
  it('hides forms with missing bindings/handlers and never caches revoked values', () => {
    const props = {
      surface: formSurface,
      state: 'ready' as const,
      onAction: vi.fn(),
      onFormChange: vi.fn(),
    };
    const { rerender } = render(<GeneratedUI {...props} />);
    expect(screen.queryByLabelText(/Project/)).toBeNull();
    rerender(<GeneratedUI {...props} forms={{ questions: snapshot }} onFormChange={undefined} />);
    expect(screen.queryByLabelText(/Project/)).toBeNull();
    rerender(<GeneratedUI {...props} forms={{ questions: snapshot }} />);
    expect(screen.getByLabelText(/Project/)).toHaveValue('Demo');
    rerender(<GeneratedUI {...props} forms={{ questions: snapshot }} state="denied" />);
    expect(screen.queryByDisplayValue('Demo')).toBeNull();
  });
  it('renders inert text and reuses equivalent chart/table semantics', async () => {
    render(
      <GeneratedUI
        state="ready"
        surface={{
          id: 's',
          version: '1',
          nodes: [
            {
              id: 'text',
              type: 'text',
              text: '<img src="https://example.invalid/x" onerror="alert(1)">\nSecond line',
            },
            {
              id: 'chart',
              type: 'chart',
              title: 'Observed totals',
              unit: 'records',
              source: 'Synthetic fixture',
              points: [{ label: 'A', value: 2 }],
            },
            {
              id: 'table',
              type: 'table',
              caption: 'Records',
              columns: [{ id: 'name', label: 'Name' }],
              rows: [{ id: 'a', cells: { name: 'Alpha' } }],
            },
          ],
        }}
      />,
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: /Observed totals/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chart data' }));
    expect(
      within(screen.getByRole('table', { name: /Observed totals/ })).getByText('2'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Records' })).toBeInTheDocument();
  });
  it.each([
    'cyclic',
    'accessor',
    'deep',
    'duplicate-node',
    'duplicate-action',
    'reserved-id',
    'invalid-unicode-id',
    'empty-label',
    'unknown-property',
    'invalid-form',
    'too-many-controls',
    'too-many-points',
    'too-many-cells',
  ] as const)('rejects unsupported/ambiguous/bounded input: %s', (scenario) => {
    let surface: unknown = actionSurface;
    const getter = vi.fn(() => 'Unsafe');
    if (scenario === 'cyclic') {
      const section: Record<string, unknown> = { id: 'section', type: 'section', title: 'Cycle' };
      section.nodes = [section];
      surface = { id: 's', version: '1', nodes: [section] };
    }
    if (scenario === 'accessor')
      surface = {
        id: 's',
        version: '1',
        nodes: [
          {
            id: 'text',
            type: 'text',
            get text() {
              return getter();
            },
          },
        ],
      };
    if (scenario === 'deep') {
      let node: GeneratedSurface['nodes'][number] = { id: 'text', type: 'text', text: 'Deep' };
      for (let i = 0; i < 4; i++)
        node = { id: `section-${i}`, type: 'section', title: 'Deep', nodes: [node] };
      surface = { id: 's', version: '1', nodes: [node] };
    }
    if (scenario === 'duplicate-node')
      surface = {
        id: 's',
        version: '1',
        nodes: [
          {
            id: 'same',
            type: 'section',
            title: 'Section',
            nodes: [{ id: 'same', type: 'text', text: 'Text' }],
          },
        ],
      };
    if (scenario === 'duplicate-action')
      surface = {
        ...actionSurface,
        nodes: [
          ...actionSurface.nodes,
          { id: 'again', type: 'action', label: 'Again', actionId: 'review' },
        ],
      };
    if (scenario === 'reserved-id') surface = { ...actionSurface, id: '__proto__' };
    if (scenario === 'invalid-unicode-id')
      surface = { ...actionSurface, nodes: [{ ...actionSurface.nodes[0], id: '\ud800' }] };
    if (scenario === 'empty-label')
      surface = { ...actionSurface, nodes: [{ ...actionSurface.nodes[0], label: '  ' }] };
    if (scenario === 'unknown-property') surface = { ...actionSurface, onClick: 'alert(1)' };
    if (scenario === 'invalid-form')
      surface = {
        id: 's',
        version: '1',
        nodes: [
          {
            id: 'f',
            type: 'form',
            title: 'Form',
            actionId: 'send',
            fields: [
              { id: 'a', type: 'text', label: 'A', when: { field: 'missing', equals: 'yes' } },
            ],
          },
        ],
      };
    if (scenario === 'too-many-controls')
      surface = {
        id: 's',
        version: '1',
        nodes: Array.from({ length: 5 }, (_, i) => ({
          id: `f-${i}`,
          type: 'form',
          title: 'Form',
          actionId: `send-${i}`,
          fields: Array.from({ length: 50 }, (_, j) => ({
            id: `field-${j}`,
            type: 'text',
            label: `Field ${j}`,
          })),
        })),
      };
    if (scenario === 'too-many-points')
      surface = {
        id: 's',
        version: '1',
        nodes: Array.from({ length: 3 }, (_, i) => ({
          id: `chart-${i}`,
          type: 'chart',
          title: 'Chart',
          unit: 'records',
          source: '',
          points: Array.from({ length: 60 }, (_, j) => ({ label: `${j}`, value: j })),
        })),
      };
    if (scenario === 'too-many-cells')
      surface = {
        id: 's',
        version: '1',
        nodes: Array.from({ length: 2 }, (_, i) => ({
          id: `table-${i}`,
          type: 'table',
          caption: 'Table',
          columns: Array.from({ length: 20 }, (_, j) => ({ id: `${j}`, label: `${j}` })),
          rows: Array.from({ length: 100 }, (_, j) => ({ id: `${j}`, cells: {} })),
        })),
      };
    render(<GeneratedUI surface={surface} state="ready" onAction={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    expect(screen.queryByRole('button')).toBeNull();
    expect(getter).not.toHaveBeenCalled();
  });
});
