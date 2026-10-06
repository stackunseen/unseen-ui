'use client';
import { Accordion, Button, Field, Select } from '@stackunseen/ui';
import { OrgSwitcher, UnsavedGuard } from './pattern-adapter';
import { useAdminWorkspace } from './use-admin-workspace';
import { pages } from './draft-model';
import type { DemoFailureMode, SaaSAdminHost } from './types';
import { OverviewScreen } from './overview-screen';
import { CustomerEditor } from './customer-editor';
import { CustomersScreen } from './customers-screen';
import { MembersScreen } from './members-screen';
import { RoleEditor } from './role-editor';
import { SettingsScreen } from './settings-screen';
import { BillingScreen } from './billing-screen';
import { DeleteCustomerDialog } from './delete-customer-dialog';
import s from './saas-admin.module.css';

/** Connected local template. The injected host is a test seam, never a production authorization contract. */
export function SaaSAdmin({ host: suppliedHost }: { host?: SaaSAdminHost } = {}) {
  const {
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
  } = useAdminWorkspace(suppliedHost);
  const customerEditor =
    editor?.kind === 'customer' ? (
      <CustomerEditor
        draft={editor.draft}
        errors={errors}
        disabled={blocked}
        onChange={(draft) => edit({ ...editor, draft })}
        footer={footer}
      />
    ) : undefined;
  const roleEditor =
    editor?.kind === 'role' ? (
      <RoleEditor
        member={editor.original}
        role={editor.draft}
        onChange={(draft) => edit({ ...editor, draft })}
        disabled={blocked}
        footer={footer}
      />
    ) : undefined;

  return (
    <div className={s.root} data-template="saas-admin">
      <div className={s.demoBar}>
        <span>
          <strong>Local SaaS admin demo</strong>
          <span className={s.secondary}>Sample organizations - changes reset on reload</span>
        </span>
        <Accordion
          headingLevel={2}
          type="single"
          collapsible
          variant="divided"
          items={[
            {
              value: 'simulation',
              title: 'Demo behavior',
              content: (
                <Field
                  label="Next action result"
                  labelAs="span"
                  description="Applies to local demo actions only. No external services are connected."
                >
                  <Select
                    aria-label="Next action result"
                    value={mode}
                    disabled={blocked}
                    onValueChange={(value) => setMode(value as DemoFailureMode)}
                    options={[
                      { value: 'none', label: 'Acknowledge action' },
                      { value: 'reject', label: 'Reject action' },
                      { value: 'lose-receipt', label: 'Interrupt receipt' },
                    ]}
                  />
                </Field>
              ),
            },
          ]}
        />
      </div>
      <div className={s.workspace}>
        <aside className={s.sidebar} aria-label="Demo workspace navigation">
          <OrgSwitcher
            value={organization.id}
            organizations={snapshot.organizations.map((org) => ({
              value: org.id,
              label: org.settings.name,
            }))}
            disabled={blocked}
            onValueChange={(id) =>
              request('another organization', () =>
                commitNavigation({ organizationId: id, page: 'overview' }),
              )
            }
          />
          <nav aria-label="SaaS admin pages" className={s.navigation}>
            {pages.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                aria-label={item.label}
                aria-current={location.page === item.id ? 'page' : undefined}
                disabled={blocked}
                onClick={() => {
                  if (
                    location.page !== item.id ||
                    location.customerId ||
                    location.creating ||
                    location.editing ||
                    editor?.kind === 'role'
                  )
                    navigate({ organizationId: organization.id, page: item.id });
                }}
              >
                <span>{item.short}</span>
                {item.id === 'customers' && (
                  <span className={s.count}>{organization.customers.length}</span>
                )}
              </Button>
            ))}
          </nav>
          <p className={s.scopeNote}>
            Local records only
            <br />
            No auth or payment connection
          </p>
        </aside>
        <div
          className={s.content}
          ref={content}
          tabIndex={-1}
          role="region"
          aria-label="SaaS admin content"
          aria-busy={state.status === 'pending' || undefined}
        >
          {state.status === 'acknowledged' && !editor && (
            <p role="status" className={s.receipt}>
              {state.message}
            </p>
          )}
          {location.page === 'overview' && (
            <OverviewScreen
              organization={organization}
              onCustomers={() => navigate({ organizationId: organization.id, page: 'customers' })}
              onCustomer={(id) =>
                navigate({ organizationId: organization.id, page: 'customers', customerId: id })
              }
              onMembers={() => navigate({ organizationId: organization.id, page: 'members' })}
              onBilling={() => navigate({ organizationId: organization.id, page: 'billing' })}
            />
          )}
          {location.page === 'customers' && (
            <CustomersScreen
              organization={organization}
              selected={selected}
              creating={Boolean(location.creating)}
              editing={Boolean(location.editing)}
              editor={customerEditor}
              query={query}
              status={status}
              sort={sort}
              page={page}
              onQuery={(value) => {
                setQuery(value);
                setPage(1);
              }}
              onStatus={(value) => {
                setStatus(value);
                setPage(1);
              }}
              onSort={(value) => {
                setSort(value);
                setPage(1);
              }}
              onPage={setPage}
              onSelect={(id) =>
                navigate({ organizationId: organization.id, page: 'customers', customerId: id })
              }
              onCreate={() =>
                navigate({ organizationId: organization.id, page: 'customers', creating: true })
              }
              onEdit={() => navigate({ ...location, editing: true })}
              onDelete={requestDelete}
              onBack={() => navigate({ organizationId: organization.id, page: 'customers' })}
              disabled={blocked}
            />
          )}
          {location.page === 'members' && (
            <MembersScreen
              organization={organization}
              editor={roleEditor}
              disabled={blocked}
              onEdit={(member) =>
                request('another member', () => {
                  edit({ kind: 'role', original: member, draft: member.role });
                })
              }
            />
          )}
          {location.page === 'settings' && editor?.kind === 'settings' && (
            <SettingsScreen
              draft={editor.draft}
              onChange={(draft) => edit({ ...editor, draft })}
              errors={errors}
              disabled={blocked}
              footer={footer}
            />
          )}
          {location.page === 'billing' && editor?.kind === 'billing' && (
            <BillingScreen
              organization={organization}
              plan={editor.draft.plan}
              seats={editor.draft.seats}
              onPlan={(plan) => edit({ ...editor, draft: { ...editor.draft, plan } })}
              onSeats={(seats) => edit({ ...editor, draft: { ...editor.draft, seats } })}
              errors={errors}
              disabled={blocked}
              footer={footer}
            />
          )}
        </div>
      </div>
      <UnsavedGuard
        returnFocusRef={returnFocusRef}
        open={Boolean(intent)}
        onOpenChange={(open) => {
          if (!open) setIntent(undefined);
        }}
        destination={intent?.destination}
        onKeepEditing={() => setIntent(undefined)}
        onDiscard={() => {
          const next = intent;
          setIntent(undefined);
          next?.run();
        }}
      />
      <DeleteCustomerDialog
        customer={deleteTarget}
        organization={organization.settings.name}
        state={state}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
        onReconcile={footer.onReconcile}
        returnFocusRef={returnFocusRef}
        fallbackFocusRef={content}
      />
    </div>
  );
}
