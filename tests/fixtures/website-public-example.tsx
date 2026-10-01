'use client';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  Breadcrumb,
  Card,
  Checkbox,
  ContextMenu,
  DataTable,
  DropdownMenu,
  EmptyState,
  EmptyStateTitle,
  Field,
  Input,
  NavigationMenu,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Sidebar,
  Slider,
  Switch,
  Table,
  TableRow,
  Textarea,
  Toast,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Tooltip,
  TooltipProvider,
} from '@ai-interaction/react';
import type { TableRow as DataRow, TableRowProps } from '@ai-interaction/react';

/** The same public-only fixture is compiled and bundled from isolated packed tarballs. */
export function WebsitePublicExample() {
  const row: DataRow = { id: 'invoice', cells: { amount: 12 } };
  const nativeRow: TableRowProps = { children: <Table.Cell>Native invoice</Table.Cell> };
  return (
    <Card aria-labelledby="public-website-title">
      <Card.Header>
        <Card.Title id="public-website-title" as="h2">
          Website public API
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <Breadcrumb
          items={[
            { id: 'home', label: 'Home', href: '/' },
            { id: 'billing', label: 'Billing' },
          ]}
        />
        <Sidebar label="Account navigation">
          <Sidebar.Group label="Account">
            <Sidebar.Link href="/billing" current>
              Billing page
            </Sidebar.Link>
          </Sidebar.Group>
        </Sidebar>
        <form aria-label="Account details">
          <Field label="Account name" description="Visible to your team">
            <Input name="account" value="Sample team" readOnly />
          </Field>
          <Field label="Account notes">
            <Textarea name="notes" value="Public fixture" readOnly />
          </Field>
          <Field label="Email updates">
            <Checkbox name="updates" checked readOnly />
          </Field>
          <Field label="Use compact view">
            <Switch checked={false} readOnly />
          </Field>
          <Field label="Invoice format" labelAs="span">
            <RadioGroup
              name="format"
              value="pdf"
              options={[{ value: 'pdf', label: 'PDF' }]}
              onValueChange={() => {}}
            />
          </Field>
          <Field label="Reminder days" labelAs="span">
            <Slider
              value={[7]}
              min={1}
              max={30}
              getValueLabel={(value) => `${value} days`}
              disabled
            />
          </Field>
        </form>
        <Table label="Native invoices">
          <Table.Body>
            <TableRow {...nativeRow} />
          </Table.Body>
        </Table>
        <DataTable
          caption="Existing data API"
          columns={[{ id: 'amount', label: 'Amount' }]}
          rows={[row]}
        />
        <Pagination page={1} pageCount={3} getPageHref={(page) => `/billing?page=${page}`} />
        <Alert>
          <AlertTitle>Billing information</AlertTitle>
          <AlertDescription>Only the host confirms a payment.</AlertDescription>
        </Alert>
        <Progress label="Invoice processing" value={null} />
        <EmptyState>
          <EmptyStateTitle>No archived invoices</EmptyStateTitle>
        </EmptyState>
        <Popover>
          <Popover.Trigger>Invoice help</Popover.Trigger>
          <Popover.Content title="Invoice help">Public supporting text.</Popover.Content>
        </Popover>
        <TooltipProvider>
          <Tooltip>
            <Tooltip.Trigger>Explain status</Tooltip.Trigger>
            <Tooltip.Content>Awaiting host data</Tooltip.Content>
          </Tooltip>
        </TooltipProvider>
        <AlertDialog open={false} onOpenChange={() => {}}>
          <AlertDialog.Trigger>Archive account</AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Archive account?</AlertDialog.Title>
            <AlertDialog.Description>
              The host must acknowledge this request.
            </AlertDialog.Description>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onAction={() => {}}>Request archive</AlertDialog.Action>
          </AlertDialog.Content>
        </AlertDialog>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>Invoice actions</DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item>Download invoice</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <ContextMenu.Root>
          <ContextMenu.Trigger>Invoice contextual actions</ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item>Inspect invoice</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <NavigationMenu.Root>
          <NavigationMenu.List>
            <NavigationMenu.Item>
              <NavigationMenu.Link href="/help">Help centre</NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>
        <ToastProvider>
          <Toast open={false}>
            <ToastTitle>Host notification</ToastTitle>
          </Toast>
          <ToastViewport portal={false} />
        </ToastProvider>
      </Card.Content>
    </Card>
  );
}
