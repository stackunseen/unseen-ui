import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from './combobox.js';
import type { SingleComboboxProps as ComboboxProps } from './types.js';
import axe from 'axe-core';
import { Modal } from '../modal/modal.js';
import { AITheme } from '../../providers/theme/theme-provider.js';

const options = [
  { value: 'preview', label: 'Preview', keywords: ['test'] },
  { value: 'production', label: 'Production', disabledReason: 'Requires access' },
  { value: 'staging', label: 'Staging', description: 'Shared sandbox' },
];
const base = {
  label: 'Environment',
  value: null,
  query: '',
  options,
  onQueryChange: vi.fn(),
  onValueChange: vi.fn(),
} satisfies ComboboxProps;
function Controlled(props: Partial<ComboboxProps> = {}) {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  return (
    <Combobox
      {...base}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
      {...props}
    />
  );
}

describe('Combobox', () => {
  it('selects with arrows, Home/End and Enter while skipping disabled options and retaining input focus', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Combobox {...base} onValueChange={change} />);
    await user.tab();
    const input = screen.getByRole('combobox', { name: 'Environment' });
    const preview = screen.getByRole('option', { name: 'Preview' });
    expect(input).toHaveAttribute('aria-activedescendant', preview.id);
    await user.keyboard('{ArrowDown}');
    const staging = screen.getByRole('option', { name: 'Staging Shared sandbox' });
    expect(input).toHaveAttribute('aria-activedescendant', staging.id);
    await user.keyboard('{Home}');
    expect(input).toHaveAttribute('aria-activedescendant', preview.id);
    await user.keyboard('{End}{Enter}');
    expect(change).toHaveBeenCalledExactlyOnceWith('staging');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('No option selected.')).toBeVisible();
  });

  it('closes with Escape without clearing query or selection, and Tab advances focus', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <>
        <Controlled value="preview" query="test" onValueChange={change} />
        <button>Next field</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('test');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(change).not.toHaveBeenCalled();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('listbox')).toBeVisible();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear Environment' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters controlled query by labels, descriptions and keywords and announces empty results', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'sandbox');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Staging');
    await user.clear(input);
    await user.type(input, 'TEST');
    expect(screen.getByRole('option')).toHaveTextContent('Preview');
    await user.type(input, 'notfound');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching options.');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('emits queries without changing the authoritative input value', async () => {
    const user = userEvent.setup();
    const queryChange = vi.fn();
    render(<Combobox {...base} query="P" onQueryChange={queryChange} />);
    await user.type(screen.getByRole('combobox'), 'r');
    expect(queryChange).toHaveBeenCalledExactlyOnceWith('Pr');
    expect(screen.getByRole('combobox')).toHaveValue('P');
  });

  it('supports host and custom filtering without resetting controlled selection', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Combobox {...base} query="unmatched" filterOption={false} value="preview" />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Preview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    rerender(
      <Combobox
        {...base}
        query="anything"
        value="preview"
        filterOption={(option) => option.value === 'staging'}
      />,
    );
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Selected: Preview')).toBeVisible();
  });

  it('repairs a stale active descendant after options change and preserves an unavailable selected identity', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(<Combobox {...base} value="preview" onValueChange={change} />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{End}');
    rerender(
      <Combobox
        {...base}
        value="preview"
        options={[{ value: 'new', label: 'New environment' }]}
        onValueChange={change}
      />,
    );
    expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id);
    expect(screen.getByText('Selected: preview')).toBeVisible();
    expect(screen.getByText('Option details unavailable.')).toBeVisible();
    expect(change).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenCalledExactlyOnceWith('new');
  });

  it.each(['loading', 'error'] as const)(
    '%s hides stale options, blocks commits and keeps remote search editable',
    async (status) => {
      const user = userEvent.setup();
      const change = vi.fn();
      render(<Combobox {...base} status={status} error="Request failed" onValueChange={change} />);
      const input = screen.getByRole('combobox');
      await user.click(input);
      expect(input).toBeEnabled();
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.getByRole(status === 'error' ? 'alert' : 'status')).toHaveTextContent(
        status === 'error' ? 'Request failed' : 'Loading options',
      );
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'aria-busy',
        String(status === 'loading'),
      );
      await user.keyboard('{ArrowDown}{Enter}');
      expect(change).not.toHaveBeenCalled();
    },
  );

  it('disabled state closes an open popup and disables all selection actions', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox {...base} value="preview" />);
    await user.click(screen.getByRole('combobox'));
    rerender(<Combobox {...base} value="preview" disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Environment' })).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Selection is unavailable.');
    rerender(<Combobox {...base} value="preview" />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ignores disabled pointer options and returns focus after controlled clear', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Controlled value="preview" onValueChange={change} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Production Requires access' }));
    expect(change).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Clear Environment' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(null);
    expect(screen.getByRole('combobox')).toHaveFocus();
    expect(screen.getByText('Selected: Preview')).toBeVisible();
  });

  it('does not swallow composing Enter and closes without stealing outside-button focus', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <>
        <Combobox {...base} onValueChange={change} />
        <button>Outside</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(change).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('bounds rendered results after filtering and treats option content as text', async () => {
    const user = userEvent.setup();
    const large = Array.from({ length: 250 }, (_, index) => ({
      value: String(index),
      label: `Choice ${index}`,
    }));
    const { rerender } = render(<Combobox {...base} options={large} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(200);
    expect(screen.getByText(/Showing the first 200/)).toBeVisible();
    rerender(<Combobox {...base} options={large} query="249" />);
    expect(screen.getByRole('option')).toHaveTextContent('Choice 249');
    rerender(
      <Combobox {...base} options={[{ value: 'safe', label: '<script>alert(1)</script>' }]} />,
    );
    expect(screen.getByRole('option')).toHaveTextContent('<script>alert(1)</script>');
    expect(document.querySelector('script')).toBeNull();
  });

  it('dismisses the picker before its containing dialog and preserves portal theme scope', async () => {
    const user = userEvent.setup();
    const dialogChange = vi.fn();
    render(
      <AITheme appearance="dark">
        <Modal
          open
          onOpenChange={dialogChange}
          title="Settings"
          description="Choose an environment."
          trigger={<button>Open settings</button>}
        >
          <Combobox {...base} />
        </Modal>
      </AITheme>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    const listbox = screen.getByRole('listbox');
    expect(listbox.closest('[data-appearance]')).toHaveAttribute('data-appearance', 'dark');
    expect(listbox.closest('[data-ai-theme]')?.getAttribute('data-ai-theme')).toBe(
      input.closest('[data-ai-theme]')?.getAttribute('data-ai-theme'),
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    expect(dialogChange).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(dialogChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(['ready', 'loading', 'error'] as const)(
    '%s has no automated semantic accessibility violations',
    async (status) => {
      const user = userEvent.setup();
      render(<Combobox {...base} status={status} description="Choose an environment." />);
      await user.click(screen.getByRole('combobox'));
      const result = await axe.run(document.body, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      });
      expect(result.violations.map((violation) => violation.id)).toEqual([]);
    },
  );
});
