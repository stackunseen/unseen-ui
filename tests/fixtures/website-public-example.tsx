'use client';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Checkbox,
  ContextMenu,
  DropdownMenu,
  EmptyState,
  EmptyStateTitle,
  Field,
  Input,
  NavigationMenu,
  NavigationMenuList,
  Pagination,
  SidebarGroup,
  SidebarLink,
  Stat,
  StatGroup,
  Tag,
  ToggleGroup,
  Chip,
  ChipGroup,
  Stepper,
  Matrix,
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
} from '@stackunseen/ui';
import type { TableRowProps } from '@stackunseen/ui';

/** The same public-only fixture is compiled and bundled from isolated packed tarballs. */
export function WebsitePublicExample() {
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
        <Pagination page={1} pageCount={3} getPageHref={(page) => `/billing?page=${page}`} />
        <ToggleGroup
          label="Invoice filter"
          options={[
            { value: 'all', label: 'All', count: 3 },
            { value: 'paid', label: 'Paid', count: 2 },
          ]}
          value="all"
          onValueChange={() => {}}
        />
        <StatGroup aria-label="Billing summary">
          <Stat label="Open invoices" value="2" delta="-1" trend="down" />
          <Stat label="Paid this month" value="4" />
        </StatGroup>
        <Tag tone="primary">Alpha</Tag>
        <Tag hue="#b45309" mono>
          v0.1
        </Tag>
        <ToggleGroup
          variant="segmented"
          label="View"
          mode="links"
          value="latest"
          options={[
            { value: 'latest', label: 'Latest', href: '/billing/' },
            { value: 'archive', label: 'Archive', href: '/billing/archive/' },
          ]}
        />
        <ChipGroup label="Filters" overflow="scroll">
          <Chip href="/billing/?paid" active>
            Paid
          </Chip>
          <Tag>Overdue</Tag>
          <Chip onRemove={() => {}}>Q3</Chip>
        </ChipGroup>
        <Stepper
          label="Setup"
          reading
          steps={[
            { id: 'a', label: 'Account', href: '/setup/a', state: 'done' },
            { id: 'b', label: 'Billing', state: 'current' },
          ]}
        />
        <Progress label="Setup steps" value={1} max={2} variant="ring" />
        <Matrix
          label="Coverage"
          rows={[{ id: 'r', label: 'Row' }]}
          columns={[{ id: 'c', label: 'Column' }]}
          value={() => 2}
        />
        <p>
          Press <kbd>Esc</kbd> to close.
        </p>
        <Avatar name="Sample team" />
        <Card href="/billing/history">
          <Card.Title>Invoice history</Card.Title>
          <Card.Description>Public fixture.</Card.Description>
        </Card>
        <Button href="/billing/new" variant="outline">
          New invoice
        </Button>
        <Button asChild>
          <a href="/billing/export">Export</a>
        </Button>
        <Card aria-label="Named parts">
          <CardHeader>
            <CardTitle as="h3">Named compound parts</CardTitle>
          </CardHeader>
        </Card>
        <SidebarGroup label="Named sidebar parts">
          <SidebarLink href="/billing/settings">Settings</SidebarLink>
        </SidebarGroup>
        <NavigationMenu.Root aria-label="Named navigation parts">
          <NavigationMenuList>
            <NavigationMenu.Item>
              <NavigationMenu.Link href="/billing">Billing</NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenuList>
        </NavigationMenu.Root>
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
