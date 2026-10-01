import { useState } from 'react';
import type { SVGProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AITheme,
  AIIcon,
  Accordion,
  Select,
  IconsProvider,
  Modal,
  Button,
  StatusBadge,
  Tabs,
  componentVariants,
} from '@ai-interaction/react';

const items = [
  { value: 'input', title: 'Input', content: <p>Tool arguments</p> },
  { value: 'disabled', title: 'Unavailable', content: <p>Hidden</p>, disabled: true },
  { value: 'output', title: 'Output', content: <p>Tool result</p> },
];
describe('shared controls and icon customization', () => {
  it.each(componentVariants.Accordion)(
    '%s accordion supports keyboard navigation, disabled items, and single-item collapse',
    async (variant) => {
      const user = userEvent.setup();
      render(
        <Accordion variant={variant} type="single" collapsible items={items} headingLevel={4} />,
      );
      const input = screen.getByRole('button', { name: 'Input' });
      await user.tab();
      expect(input).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('region', { name: 'Input' })).toHaveTextContent('Tool arguments');
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('button', { name: 'Output' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      await user.keyboard('{Home}');
      expect(input).toHaveFocus();
      await user.keyboard('{End}');
      expect(screen.getByRole('button', { name: 'Output' })).toHaveFocus();
    },
  );
  it.each(componentVariants.Tabs)(
    '%s tabs use one tab stop and activate with arrow keys',
    async (variant) => {
      const user = userEvent.setup();
      function Demo() {
        const [value, setValue] = useState('summary');
        return (
          <Tabs
            variant={variant}
            value={value}
            onValueChange={setValue}
            label="Report views"
            items={[
              { value: 'summary', label: 'Summary', content: <p>Report summary</p> },
              { value: 'sources', label: 'Sources', content: <p>Evidence records</p> },
            ]}
          />
        );
      }
      render(<Demo />);
      await user.tab();
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Sources' })).toHaveFocus();
      expect(screen.getByRole('tabpanel', { name: 'Sources' })).toHaveTextContent(
        'Evidence records',
      );
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('tabindex', '-1');
      await user.keyboard('{Home}');
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveFocus();
    },
  );
  it('keeps a controlled accordion unchanged until the consumer accepts its callback', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Accordion type="multiple" value={['input']} onValueChange={onValueChange} items={items} />,
    );
    await user.click(screen.getByRole('button', { name: 'Output' }));
    expect(onValueChange).toHaveBeenCalledWith(['input', 'output']);
    expect(screen.getByRole('button', { name: 'Output' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    rerender(
      <Accordion
        type="multiple"
        value={['input', 'output']}
        onValueChange={onValueChange}
        items={items}
      />,
    );
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });
  it.each(componentVariants.Select)(
    '%s select navigates, skips disabled options, preserves form value and restores focus',
    async (variant) => {
      const user = userEvent.setup();
      function Demo() {
        const [value, setValue] = useState('light');
        return (
          <AITheme appearance="dark">
            <form aria-label="Settings">
              <label>
                Appearance
                <Select
                  variant={variant}
                  name="appearance"
                  value={value}
                  onValueChange={setValue}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'blocked', label: 'Unavailable', disabled: true },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
              </label>
            </form>
          </AITheme>
        );
      }
      render(<Demo />);
      const trigger = screen.getByRole('combobox', { name: 'Appearance' });
      const scope = trigger.closest('[data-ai-theme]')?.getAttribute('data-ai-theme');
      await user.tab();
      await user.keyboard('{Enter}{ArrowDown}{Enter}');
      expect(trigger).toHaveTextContent('Dark');
      expect(trigger).toHaveFocus();
      expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('appearance')).toBe(
        'dark',
      );
      await user.keyboard('{Enter}');
      expect(
        screen.getByRole('listbox').closest('[data-ai-theme]')?.getAttribute('data-ai-theme'),
      ).toBe(scope);
      expect(screen.getByRole('option', { name: 'Unavailable' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    },
  );
  it('keeps nested select Escape inside its modal, then closes the modal on the next Escape', async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <AITheme>
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Preferences"
            description="Choose appearance"
            trigger={<Button>Settings</Button>}
          >
            <Select
              aria-label="Appearance"
              value="light"
              onValueChange={() => {}}
              options={[{ value: 'light', label: 'Light' }]}
            />
          </Modal>
        </AITheme>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const select = screen.getByRole('combobox');
    select.focus();
    await user.keyboard('{Enter}{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(select).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });
  it('inherits icon overrides, permits scoped replacements/removal and keeps accessible status text', () => {
    function Custom(props: SVGProps<SVGSVGElement>) {
      return (
        <svg {...props} data-testid="custom">
          <path d="M0 0h10v10" />
        </svg>
      );
    }
    const { container } = render(
      <IconsProvider icons={{ check: Custom, close: null }} size={20}>
        <StatusBadge state="succeeded" />
        <IconsProvider icons={{ assistant: Custom }}>
          <AIIcon name="assistant" />
          <AIIcon name="check" />
          <AIIcon name="close" />
        </IconsProvider>
        <AIIcon name="check" icon={null} />
      </IconsProvider>,
    );
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getAllByTestId('custom')).toHaveLength(3);
    expect(screen.getAllByTestId('custom')[1]).toHaveAttribute('width', '20');
    expect(container.querySelector('[data-ai-icon="close"]')).toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const badge = screen.getByText('Complete').closest('[data-part="status"]')!;
    expect(within(badge as HTMLElement).getByTestId('custom')).toHaveAttribute(
      'focusable',
      'false',
    );
  });
});
