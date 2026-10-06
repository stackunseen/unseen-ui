import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Artifact } from '@stackunseen/ui-core';
import { ArtifactPanel } from './artifact-panel.js';
import { IconButton } from '../icon-button/icon-button.js';

const artifact: Artifact = {
  id: 'report',
  title: 'Search review',
  kind: 'text',
  version: 3,
  content: 'A current host-supplied artifact.',
  sourceIds: [],
};

describe('ArtifactPanel trusted trigger composition', () => {
  it('keeps trusted body/actions in the existing panel while hiding them on loading/error', () => {
    const values = {
      artifact,
      open: true,
      onOpenChange: vi.fn(),
      body: <p>Controlled artifact editor</p>,
      actions: <button>Save exact draft</button>,
    };
    const { rerender } = render(<ArtifactPanel {...values} />);
    const panel = screen.getByRole('dialog', { name: artifact.title });
    expect(within(panel).getByText('Controlled artifact editor')).toBeVisible();
    expect(within(panel).queryByText(artifact.content)).not.toBeInTheDocument();
    const action = within(panel).getByRole('button', { name: 'Save exact draft' });
    expect(action.closest('[data-slot="modal-footer"]')).not.toBeNull();
    expect(action.closest('[data-slot="modal-body"]')).toBeNull();
    rerender(<ArtifactPanel {...values} loading />);
    expect(within(panel).queryByText('Controlled artifact editor')).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: 'Save exact draft' }),
    ).not.toBeInTheDocument();
    rerender(<ArtifactPanel {...values} error="Access revoked." />);
    expect(within(panel).getByRole('alert')).toHaveTextContent('Access revoked.');
    expect(within(panel).queryByText('Controlled artifact editor')).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: 'Save exact draft' }),
    ).not.toBeInTheDocument();
    rerender(<ArtifactPanel {...values} artifact={null} />);
    expect(within(panel).getByText('No artifact selected.')).toBeVisible();
    expect(
      within(panel).queryByRole('button', { name: 'Save exact draft' }),
    ).not.toBeInTheDocument();
  });

  it.each(['dialog', 'sheet', 'fullscreen'] as const)(
    '%s uses one contextual trigger and restores focus after the host closes the panel',
    async (variant) => {
      const clicked = vi.fn();
      function Host() {
        const [open, setOpen] = useState(false);
        return (
          <ArtifactPanel
            variant={variant}
            artifact={artifact}
            open={open}
            onOpenChange={setOpen}
            trigger={
              <IconButton icon="document" label="Inspect search artifact" onClick={clicked} />
            }
          />
        );
      }
      render(<Host />);
      const trigger = screen.getByRole('button', { name: 'Inspect search artifact' });
      expect(trigger).toHaveAttribute('data-part', 'icon-button');
      expect(screen.queryByRole('button', { name: 'Open Search review' })).not.toBeInTheDocument();
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      expect(clicked).toHaveBeenCalledOnce();
      const panel = screen.getByRole('dialog', { name: artifact.title });
      expect(panel).toHaveAttribute('data-layout', variant);
      expect(within(panel).getByText('Version 3')).toBeVisible();
      expect(within(panel).getByText(artifact.content)).toBeVisible();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    },
  );

  it('requests controlled opening without assuming the host has acknowledged it', async () => {
    const request = vi.fn();
    const custom = <IconButton icon="document" label="Inspect artifact" />;
    const { rerender } = render(
      <ArtifactPanel artifact={artifact} open={false} onOpenChange={request} trigger={custom} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Inspect artifact' }));
    expect(request).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <ArtifactPanel artifact={artifact} open={true} onOpenChange={request} trigger={custom} />,
    );
    expect(screen.getByRole('dialog', { name: artifact.title })).toBeVisible();
  });

  it('preserves a trusted trigger disabled state without requesting opening', async () => {
    const request = vi.fn();
    render(
      <ArtifactPanel
        artifact={artifact}
        open={false}
        onOpenChange={request}
        trigger={<IconButton icon="document" label="Inspect unavailable artifact" disabled />}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Inspect unavailable artifact' });
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps artifact content hidden during loading/error and accepts the host replacement', () => {
    const request = vi.fn();
    const common = {
      artifact,
      open: true,
      onOpenChange: request,
      trigger: <IconButton icon="document" label="Inspect artifact" />,
    };
    const { rerender } = render(<ArtifactPanel {...common} loading />);
    const panel = screen.getByRole('dialog', { name: artifact.title });
    expect(within(panel).getByRole('status')).toHaveTextContent('Loading artifact');
    expect(within(panel).queryByText(artifact.content)).not.toBeInTheDocument();
    rerender(<ArtifactPanel {...common} error="Artifact access revoked by the host." />);
    expect(within(panel).getByRole('alert')).toHaveTextContent(
      'Artifact access revoked by the host.',
    );
    expect(within(panel).queryByText(artifact.content)).not.toBeInTheDocument();
    const next: Artifact = { ...artifact, version: 4, content: 'Replaced host projection.' };
    rerender(<ArtifactPanel {...common} artifact={next} />);
    expect(screen.getByRole('dialog', { name: artifact.title })).toBe(panel);
    expect(within(panel).getByText('Version 4')).toBeVisible();
    expect(within(panel).getByText(next.content)).toBeVisible();
    expect(within(panel).queryByText(artifact.content)).not.toBeInTheDocument();
  });

  it('retains the existing default trigger when none or null is supplied', () => {
    const request = vi.fn();
    const { rerender } = render(
      <ArtifactPanel artifact={artifact} open={false} onOpenChange={request} />,
    );
    expect(screen.getByRole('button', { name: 'Open Search review' })).toBeVisible();
    rerender(<ArtifactPanel artifact={null} trigger={null} open={false} onOpenChange={request} />);
    expect(screen.getByRole('button', { name: 'Open artifact' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
