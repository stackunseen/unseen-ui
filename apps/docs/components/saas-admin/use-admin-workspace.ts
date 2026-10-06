'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { DataGridSort } from '@stackunseen/ui/application';
import type { SettingsSaveState } from './pattern-adapter';
import { createSaaSAdminHost, validateCustomer, validateSettings } from './mock-host';
import { dirty, editorFor, pages } from './draft-model';
import type { Editor } from './draft-model';
import type {
  AdminCommand,
  AdminLocation,
  AdminReceipt,
  Customer,
  DemoFailureMode,
  FieldErrors,
  SaaSAdminHost,
} from './types';

export function useAdminWorkspace(suppliedHost?: SaaSAdminHost) {
  const [host] = useState(() => suppliedHost ?? createSaaSAdminHost());
  const [snapshot, setSnapshot] = useState(() => host.read());
  const [location, setLocation] = useState<AdminLocation>({
    organizationId: 'northstar',
    page: 'overview',
  });
  const [editor, setEditor] = useState<Editor>();
  const [deleteTarget, setDeleteTarget] = useState<Customer>();
  const [state, setState] = useState<SettingsSaveState>({ status: 'idle' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [mode, setMode] = useState<DemoFailureMode>('none');
  const [unresolved, setUnresolved] = useState<AdminCommand>();
  const [intent, setIntent] = useState<{ destination: string; run: () => void }>();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<DataGridSort | null>({ columnId: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const sequence = useRef(0);
  const submitting = useRef(false);
  const actionPrefix = useId();
  const content = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const organization = snapshot.organizations.find((item) => item.id === location.organizationId)!;
  const selected = organization.customers.find((customer) => customer.id === location.customerId);
  const changed = dirty(editor);
  const blocked = state.status === 'pending' || state.status === 'unknown';

  useEffect(() => {
    content.current?.focus({ preventScroll: true });
  }, [
    location.organizationId,
    location.page,
    location.customerId,
    location.editing,
    location.creating,
  ]);
  useEffect(() => {
    if (Object.keys(errors).length)
      content.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  useEffect(() => {
    if (!changed && !blocked) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [changed, blocked]);

  function commitNavigation(next: AdminLocation) {
    const org = snapshot.organizations.find((item) => item.id === next.organizationId);
    if (!org) return;
    setLocation(next);
    setEditor(editorFor(next, org));
    setState({ status: 'idle' });
    setErrors({});
    setUnresolved(undefined);
    if (next.organizationId !== location.organizationId) {
      setQuery('');
      setStatus('all');
      setPage(1);
    }
  }
  function request(destination: string, run: () => void) {
    if (blocked || submitting.current) return;
    if (changed) {
      const active = content.current?.ownerDocument.activeElement;
      returnFocusRef.current = active && 'focus' in active ? (active as HTMLElement) : null;
      setIntent({ destination, run });
    } else run();
  }
  function navigate(next: AdminLocation) {
    request(pages.find((item) => item.id === next.page)!.label, () => commitNavigation(next));
  }
  function cancel() {
    request('the saved view', () => {
      if (editor?.kind === 'role') {
        setEditor(undefined);
        setErrors({});
        setState({ status: 'idle' });
      } else
        commitNavigation({
          organizationId: location.organizationId,
          page: location.page,
          ...(editor?.kind === 'customer' && editor.original
            ? { customerId: editor.original.id }
            : {}),
        });
    });
  }
  function edit<T extends Editor>(next: T) {
    setEditor(next);
    setErrors({});
    setState({ status: 'idle' });
  }
  function accept(receipt: AdminReceipt) {
    setUnresolved(undefined);
    submitting.current = false;
    if (receipt.status === 'rejected') {
      setState({ status: 'rejected', message: receipt.message });
      setErrors(receipt.errors ?? {});
      return;
    }
    setSnapshot(receipt.snapshot);
    const org = receipt.snapshot.organizations.find(
      (item) => item.id === receipt.command.organizationId,
    )!;
    const next: AdminLocation =
      receipt.command.kind === 'delete-customer'
        ? { organizationId: org.id, page: 'customers' }
        : receipt.customerId
          ? { organizationId: org.id, page: 'customers', customerId: receipt.customerId }
          : location;
    setLocation(next);
    setDeleteTarget(undefined);
    if (receipt.command.kind === 'delete-customer') setPage(1);
    setEditor(editorFor(next, org));
    setErrors({});
    setState({ status: 'acknowledged', message: receipt.message });
  }
  async function save() {
    if (!editor || !changed || blocked || submitting.current) return;
    let validation: FieldErrors = {};
    if (editor.kind === 'customer') validation = validateCustomer(editor.draft);
    if (editor.kind === 'settings') validation = validateSettings(editor.draft);
    if (
      editor.kind === 'billing' &&
      (!/^\d+$/.test(editor.draft.seats) ||
        Number(editor.draft.seats) < organization.members.length ||
        Number(editor.draft.seats) > 50)
    )
      validation = {
        seats: `Choose between ${organization.members.length} and 50 whole-number seats.`,
      };
    if (Object.keys(validation).length) {
      setErrors(validation);
      setState({ status: 'rejected', message: 'Check the highlighted fields before saving.' });
      return;
    }
    const scope = {
      id: `${actionPrefix}-action-${++sequence.current}`,
      organizationId: organization.id,
    };
    const command: AdminCommand =
      editor.kind === 'customer'
        ? editor.original
          ? {
              ...scope,
              kind: 'edit-customer',
              customerId: editor.original.id,
              version: editor.original.version,
              draft: editor.draft,
            }
          : { ...scope, kind: 'create-customer', draft: editor.draft }
        : editor.kind === 'settings'
          ? {
              ...scope,
              kind: 'save-settings',
              version: editor.original.version,
              draft: editor.draft,
            }
          : editor.kind === 'billing'
            ? {
                ...scope,
                kind: 'save-billing',
                version: editor.original.version,
                draft: { plan: editor.draft.plan, seats: Number(editor.draft.seats) },
              }
            : {
                ...scope,
                kind: 'change-role',
                memberId: editor.original.id,
                version: editor.original.version,
                role: editor.draft,
              };
    await send(command);
  }
  async function send(command: AdminCommand) {
    submitting.current = true;
    setState({ status: 'pending' });
    setErrors({});
    try {
      const result = await host.submit(command, mode);
      if (result.status === 'unknown') {
        setUnresolved(command);
        setState(result);
        submitting.current = false;
      } else accept(result);
    } catch {
      submitting.current = false;
      setUnresolved(command);
      setState({
        status: 'unknown',
        message: 'No receipt was received. Check the original action before continuing.',
      });
    }
  }
  function requestDelete() {
    if (!selected || blocked || submitting.current) return;
    returnFocusRef.current = content.current?.ownerDocument.activeElement as HTMLElement | null;
    setDeleteTarget(selected);
    setState({ status: 'idle' });
  }
  function cancelDelete() {
    if (blocked || submitting.current) return;
    setDeleteTarget(undefined);
    setState({ status: 'idle' });
  }
  async function confirmDelete() {
    if (!deleteTarget || blocked || submitting.current) return;
    await send({
      id: `${actionPrefix}-action-${++sequence.current}`,
      organizationId: organization.id,
      kind: 'delete-customer',
      customerId: deleteTarget.id,
      version: deleteTarget.version,
    });
  }
  async function reconcile() {
    if (!unresolved || submitting.current) return;
    submitting.current = true;
    setState({ status: 'pending', message: 'Checking the original local receipt...' });
    try {
      const receipt = await host.receipt(unresolved);
      if (receipt) accept(receipt);
      else {
        submitting.current = false;
        setState({
          status: 'unknown',
          message:
            'The original receipt is still unavailable. This view may be stale; no action was repeated.',
        });
      }
    } catch {
      submitting.current = false;
      setState({
        status: 'unknown',
        message: 'The original receipt could not be checked. No action was repeated.',
      });
    }
  }
  const footer = {
    state,
    dirty: changed,
    onSave: () => {
      void save();
    },
    onCancel: cancel,
    onReconcile: () => {
      void reconcile();
    },
  };
  return {
    snapshot,
    location,
    editor,
    state,
    errors,
    mode,
    setMode,
    intent,
    setIntent,
    query,
    setQuery,
    status,
    setStatus,
    sort,
    setSort,
    page,
    setPage,
    content,
    returnFocusRef,
    organization,
    selected,
    blocked,
    footer,
    navigate,
    request,
    edit,
    commitNavigation,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
