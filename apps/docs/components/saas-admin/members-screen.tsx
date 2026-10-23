import type { ReactNode } from 'react';
import { Button, Table } from '@stackunseen/ui';
import { PageHeader } from './pattern-adapter';
import { roleOptions } from './options';
import type { DemoOrganization, Member } from './types';
import s from './saas-admin.module.css';

export function MembersScreen({
  organization,
  editor,
  onEdit,
  disabled,
}: {
  organization: DemoOrganization;
  editor?: ReactNode;
  onEdit: (member: Member) => void;
  disabled: boolean;
}) {
  return (
    <div className={s.stack}>
      <PageHeader
        headingLevel={2}
        title="Members & roles"
        description="Organize your demo team. These labels do not grant real access."
      />
      <Table label="Organization members">
        <Table.Header>
          <Table.Row>
            <Table.Head>Member</Table.Head>
            <Table.Head>Saved demo role</Table.Head>
            <Table.Head>Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {organization.members.map((member) => (
            <Table.Row key={member.id}>
              <Table.Cell>
                {member.name}
                <span className={s.secondary}>{member.email}</span>
              </Table.Cell>
              <Table.Cell>
                {roleOptions.find((option) => option.value === member.role)?.label}
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit role for ${member.name}`}
                  onClick={() => onEdit(member)}
                  disabled={disabled}
                >
                  Edit role
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {editor && (
        <section className={s.panel} aria-label="Member role editor">
          {editor}
        </section>
      )}
      <p className={s.muted}>
        The demo server keeps at least one owner. Your application server must enforce its own
        authorization rules.
      </p>
    </div>
  );
}
