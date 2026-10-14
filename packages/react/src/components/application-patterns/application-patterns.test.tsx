import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider';
import {
  FilterBar,
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

describe('FilterBar', () => {
  const facet = {
    label: 'Discipline',
    options: [
      { value: 'rag', label: 'RAG', count: 12, swatch: 'var(--hue-rag)' },
      { value: 'agents', label: 'Agents', count: 7 },
    ],
  };
  it('composes search, order, chips, selects and a clear action from host state', async () => {
    const onSearchChange = vi.fn();
    const onSearchSubmit = vi.fn();
    const onToggle = vi.fn();
    const onOrder = vi.fn();
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterBar
        searchLabel="Search the journal"
        search="evals"
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        order={{
          label: 'Order',
          value: 'latest',
          onValueChange: onOrder,
          options: [
            { value: 'latest', label: 'Latest' },
            { value: 'grouped', label: 'By discipline' },
          ],
        }}
        facet={{ ...facet, selected: ['agents'], onToggle }}
        selects={[
          {
            name: 'kind',
            label: 'Kind',
            value: null,
            onValueChange: vi.fn(),
            options: [{ value: 'guide', label: 'Guides' }],
          },
        ]}
        onClear={onClear}
        summary="7 of 19 entries"
      />,
    );
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search the journal' });
    expect(search).toHaveValue('evals');
    await user.type(search, '{Enter}');
    expect(onSearchSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: 'Latest' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'By discipline' }));
    expect(onOrder).toHaveBeenCalledWith('grouped');
    const agents = screen.getByRole('button', { name: 'Agents 7' });
    expect(agents).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'RAG 12' }));
    expect(onToggle).toHaveBeenCalledWith('rag');
    expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Any kind');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('7 of 19 entries');
  });

  it('renders URL-driven facets and order as links and hides Clear when nothing is active', () => {
    render(
      <FilterBar
        searchLabel="Search"
        search=""
        onSearchChange={vi.fn()}
        order={{
          label: 'View',
          value: 'latest',
          mode: 'links',
          options: [
            { value: 'latest', label: 'Latest', href: '/journal/' },
            { value: 'grouped', label: 'By discipline', href: '/journal/?view=grouped' },
          ],
        }}
        facet={{
          ...facet,
          selected: [],
          options: facet.options.map((option) => ({
            ...option,
            href: `/journal/?d=${option.value}`,
          })),
        }}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: 'Latest' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'RAG 12' })).toHaveAttribute('href', '/journal/?d=rag');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('FilterBar popover presentation', () => {
  it('keeps facets behind a counted Filters button and shows active filters as removable tokens', async () => {
    const onToggle = vi.fn();
    const onKind = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterBar
        presentation="popover"
        searchLabel="Search"
        search=""
        onSearchChange={vi.fn()}
        facet={{
          label: 'Discipline',
          options: [
            { value: 'rag', label: 'RAG', count: 12 },
            { value: 'agents', label: 'Agents', count: 7 },
          ],
          selected: ['agents'],
          onToggle,
        }}
        selects={[
          {
            name: 'kind',
            label: 'Kind',
            value: 'guide',
            onValueChange: onKind,
            options: [{ label: 'Writing', options: [{ value: 'guide', label: 'Guides' }] }],
          },
        ]}
        onClear={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /RAG/ })).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Filters 2' });
    const tokens = screen.getByRole('group', { name: 'Active filters' });
    expect(within(tokens).getByText('Agents')).toBeInTheDocument();
    expect(within(tokens).getByText('Kind: Guides')).toBeInTheDocument();
    await user.click(within(tokens).getByRole('button', { name: 'Remove Kind filter' }));
    expect(onKind).toHaveBeenCalledWith(null);
    await user.click(within(tokens).getByRole('button', { name: 'Remove Agents' }));
    expect(onToggle).toHaveBeenCalledWith('agents');
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    await user.click(within(dialog).getByRole('button', { name: 'RAG 12' }));
    expect(onToggle).toHaveBeenLastCalledWith('rag');
    expect(within(dialog).getByRole('combobox', { name: 'Kind' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Clear filters' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});

describe('FilterBar search row, clear beside the summary, and removable link tokens', () => {
  it('hides the search label visually, keeps the name, and shows a leading icon', () => {
    render(
      <FilterBar
        searchLabel="Search the journal"
        searchLabelVisibility="hidden"
        searchIcon={<span data-testid="icon" />}
        search=""
        onSearchChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('searchbox', { name: 'Search the journal' });
    expect(screen.queryByText('Search the journal')).toBeNull();
    expect(input.closest('[data-part="input-group"]')).toContainElement(screen.getByTestId('icon'));
  });

  it('puts Clear beside the summary in popover mode and removes link facets through removeHref', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterBar
        presentation="popover"
        searchLabel="Search"
        search=""
        onSearchChange={vi.fn()}
        facet={{
          label: 'Discipline',
          options: [
            { value: 'rag', label: 'RAG', href: '/j/?d=rag', removeHref: '/j/' },
            { value: 'agents', label: 'Agents', href: '/j/?d=agents', removeHref: '/j/' },
          ],
          selected: ['agents'],
        }}
        onClear={onClear}
        summary="6 of 121"
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('6 of 121');
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    expect(clear.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    await user.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
    const token = within(screen.getByRole('group', { name: 'Active filters' })).getByRole('link', {
      name: 'Remove Agents',
    });
    expect(token).toHaveAttribute('href', '/j/');
    expect(token).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Filters 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(dialog).queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });
});
