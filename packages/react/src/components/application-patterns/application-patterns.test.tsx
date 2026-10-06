import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider';
import {
  ListToolbar,
  MasterDetail,
  PageHeader,
  SettingsSaveCancel,
  UnsavedGuard,
} from './application-patterns';

describe('controlled application patterns', () => {
  it('retains host heading hierarchy and wraps composed actions without inventing routing', () => {
    render(
      <PageHeader
        title="Customers"
        headingLevel={2}
        description="Local records"
        actions={<button>Create customer</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create customer' })).toBeInTheDocument();
  });
  it('labels search and emits controlled changes without filtering supplied content', async () => {
    const changed = vi.fn();
    render(
      <ListToolbar
        searchLabel="Search customers"
        search=""
        onSearchChange={changed}
        summary="6 customers"
      />,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'a');
    expect(changed).toHaveBeenCalledWith('a');
    expect(screen.getByRole('status')).toHaveTextContent('6 customers');
  });
  it('names both panes and accepts the host-owned narrow-screen projection', () => {
    const { container } = render(
      <MasterDetail
        listLabel="Customer list"
        list="List content"
        detailLabel="Customer details"
        detail="Detail content"
        activePane="detail"
      />,
    );
    expect(screen.getByRole('region', { name: 'Customer list' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Customer details' })).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-active-pane', 'detail');
  });
  it('does not report success on submit and locks draft discard during an unknown outcome', async () => {
    const save = vi.fn(),
      cancel = vi.fn(),
      reconcile = vi.fn();
    const { rerender } = render(
      <SettingsSaveCancel dirty state={{ status: 'idle' }} onSave={save} onCancel={cancel} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    rerender(
      <SettingsSaveCancel
        dirty
        state={{ status: 'unknown', message: 'Receipt missing' }}
        onSave={save}
        onCancel={cancel}
        onReconcile={reconcile}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check original receipt' }));
    expect(reconcile).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
  });
  it('submits a bound form once and uses acknowledged messages only from its props', async () => {
    const submitted = vi.fn(),
      save = vi.fn();
    render(
      <form
        id="settings"
        onSubmit={(event) => {
          event.preventDefault();
          submitted();
        }}
      >
        <SettingsSaveCancel
          dirty
          state={{ status: 'acknowledged', message: 'Host receipt 17' }}
          form="settings"
          onSave={save}
          onCancel={() => {}}
        />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(submitted).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Host receipt 17');
  });
  it('uses an accessible alert dialog and keeps controlled discard intent separate from closing', async () => {
    const discard = vi.fn(),
      keep = vi.fn();
    render(
      <AITheme>
        <UnsavedGuard
          open
          onOpenChange={() => {}}
          onDiscard={discard}
          onKeepEditing={keep}
          destination="Billing"
        />
      </AITheme>,
    );
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Discard unsaved changes?');
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(discard).toHaveBeenCalledOnce();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
