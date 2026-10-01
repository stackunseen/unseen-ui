import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedUI } from '@ai-interaction/react';
import type { GeneratedActionPresentation } from './generated-model.js';
import type { GeneratedSurface } from '@ai-interaction/react';

const surface: GeneratedSurface = {
  id: 'result',
  version: '1',
  nodes: [
    { id: 'intro', type: 'text', text: 'Choose a review action.' },
    { id: 'open', type: 'action', label: 'Open review', actionId: 'open-review' },
    { id: 'download', type: 'action', label: 'Download report', actionId: 'download' },
    { id: 'details', type: 'text', text: 'Workspace management.' },
    { id: 'remove', type: 'action', label: 'Delete workspace', actionId: 'remove' },
  ],
};

const emphasis = (
  actionId: string,
  variant: GeneratedActionPresentation['variant'],
  version = '1',
): GeneratedActionPresentation => ({ surfaceId: 'result', version, actionId, variant });

describe('generated action rails and trusted host emphasis', () => {
  it.each(['stack', 'cards', 'compact'] as const)(
    '%s groups only contiguous sibling actions and preserves controlled intents',
    async (variant) => {
      const action = vi.fn();
      render(<GeneratedUI surface={surface} state="ready" onAction={action} variant={variant} />);
      const rails = screen.getAllByRole('group', { name: 'Generated actions' });
      expect(rails).toHaveLength(2);
      expect(
        within(rails[0]!)
          .getAllByRole('button')
          .map((item) => item.textContent),
      ).toEqual(['Open review', 'Download report']);
      expect(within(rails[1]!).getByRole('button')).toHaveAccessibleName('Delete workspace');
      expect(rails[0]!.querySelector('[data-node-id="download"]')).not.toBeNull();
      for (const item of screen.getAllByRole('button'))
        expect(item).toHaveAttribute('data-variant', 'outline');
      await userEvent.click(screen.getByRole('button', { name: 'Download report' }));
      expect(action).toHaveBeenCalledExactlyOnceWith({
        surfaceId: 'result',
        version: '1',
        actionId: 'download',
      });
      expect(screen.getByRole('button', { name: 'Download report' })).toBeEnabled();
    },
  );
  it.each(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const)(
    'only current explicit host %s emphasis applies',
    (variant) => {
      render(
        <GeneratedUI
          surface={surface}
          state="ready"
          onAction={() => {}}
          actionPresentations={[emphasis('open-review', variant)]}
        />,
      );
      expect(screen.getByRole('button', { name: 'Open review' })).toHaveAttribute(
        'data-variant',
        variant,
      );
      expect(screen.getByRole('button', { name: 'Delete workspace' })).toHaveAttribute(
        'data-variant',
        'outline',
      );
    },
  );
  it('discards obsolete or unrelated emphasis instead of preserving its colour', () => {
    render(
      <GeneratedUI
        surface={surface}
        state="ready"
        onAction={() => {}}
        actionPresentations={[
          emphasis('remove', 'danger', 'old'),
          { ...emphasis('open-review', 'primary'), surfaceId: 'other' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete workspace' })).toHaveAttribute(
      'data-variant',
      'outline',
    );
    expect(screen.getByRole('button', { name: 'Delete workspace' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Open review' })).toHaveAttribute(
      'data-variant',
      'outline',
    );
  });
  it('ambiguous current emphasis locks only the affected action with a quiet fallback', async () => {
    const action = vi.fn();
    render(
      <GeneratedUI
        surface={surface}
        state="ready"
        onAction={action}
        actionPresentations={[emphasis('remove', 'danger'), emphasis('remove', 'primary')]}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Delete workspace' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('data-variant', 'outline');
    expect(remove).toHaveAccessibleDescription('Action presentation bindings are ambiguous.');
    expect(screen.getByRole('button', { name: 'Open review' })).toBeEnabled();
    await userEvent.click(remove);
    expect(action).not.toHaveBeenCalled();
  });
  it.each(['invalid-variant', 'unknown-field', 'too-many', 'accessor'] as const)(
    'invalid host presentation %s fails closed without invoking data',
    (scenario) => {
      const getter = vi.fn(() => 'primary');
      let bindings: unknown = [emphasis('remove', 'danger')];
      if (scenario === 'invalid-variant')
        bindings = [{ ...emphasis('remove', 'danger'), variant: 'fancy' }];
      if (scenario === 'unknown-field')
        bindings = [{ ...emphasis('remove', 'danger'), className: 'hide' }];
      if (scenario === 'too-many')
        bindings = Array.from({ length: 65 }, (_, index) => emphasis(String(index), 'primary'));
      if (scenario === 'accessor') {
        const binding = emphasis('remove', 'danger');
        Object.defineProperty(binding, 'variant', { get: getter, enumerable: true });
        bindings = [binding];
      }
      render(
        <GeneratedUI
          surface={surface}
          state="ready"
          onAction={() => {}}
          actionPresentations={bindings as readonly GeneratedActionPresentation[]}
        />,
      );
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('data-variant', 'outline');
        expect(button).toHaveAccessibleDescription(
          'Action presentation bindings are invalid or unavailable.',
        );
      }
      expect(getter).not.toHaveBeenCalled();
    },
  );
  it('generated data cannot add its own emphasis', () => {
    const input = { ...surface, nodes: [{ ...surface.nodes[1], variant: 'danger' }] };
    render(<GeneratedUI surface={input} state="ready" onAction={() => {}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('unsupported content');
  });
  it('nested action groups stay in their section and keep per-action unknown outcomes', () => {
    const nested: GeneratedSurface = {
      id: 'result',
      version: '1',
      nodes: [
        {
          id: 'section',
          type: 'section',
          title: 'Report actions',
          nodes: surface.nodes.slice(1, 3),
        },
      ],
    };
    render(
      <GeneratedUI
        surface={nested}
        state="ready"
        onAction={() => {}}
        actionStates={[
          { surfaceId: 'result', version: '1', actionId: 'download', status: 'unknown' },
        ]}
      />,
    );
    const group = within(screen.getByRole('group', { name: 'Report actions' })).getByRole('group', {
      name: 'Generated actions',
    });
    expect(within(group).getByRole('button', { name: 'Download report' })).toBeDisabled();
    expect(
      within(group).getByRole('button', { name: 'Download report' }),
    ).toHaveAccessibleDescription(/outcome is unknown/);
    expect(within(group).getByRole('button', { name: 'Open review' })).toBeEnabled();
  });
  it('adding a neighbouring action preserves the focused existing node', () => {
    const { rerender } = render(
      <GeneratedUI surface={surface} state="ready" onAction={() => {}} />,
    );
    const focused = screen.getByRole('button', { name: 'Download report' });
    focused.focus();
    const changed: GeneratedSurface = {
      ...surface,
      version: '2',
      nodes: [
        surface.nodes[0]!,
        { id: 'new', type: 'action', label: 'View summary', actionId: 'summary' },
        ...surface.nodes.slice(1),
      ],
    };
    rerender(<GeneratedUI surface={changed} state="ready" onAction={() => {}} />);
    expect(screen.getByRole('button', { name: 'Download report' })).toBe(focused);
    expect(focused).toHaveFocus();
  });
  it('hiding a focused action returns focus to the result without stealing outside focus', () => {
    const fixture = (state: 'ready' | 'denied') => (
      <>
        <button>Outside result</button>
        <GeneratedUI surface={surface} state={state} onAction={() => {}} />
      </>
    );
    const { rerender } = render(fixture('ready'));
    screen.getByRole('button', { name: 'Open review' }).focus();
    rerender(fixture('denied'));
    expect(screen.getByRole('group', { name: 'Generated result' })).toHaveFocus();
    rerender(fixture('ready'));
    screen.getByRole('button', { name: 'Open review' }).focus();
    screen.getByRole('button', { name: 'Outside result' }).focus();
    rerender(fixture('denied'));
    expect(screen.getByRole('button', { name: 'Outside result' })).toHaveFocus();
  });
});
