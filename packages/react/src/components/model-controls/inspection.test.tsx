import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModelControls, componentVariants } from '@ai-interaction/react';

import {
  modelCapabilities,
  modelSettings,
  modelUsage,
} from '../../../../../apps/docs/lib/inspection-fixtures';

describe('model capability contracts', () => {
  it.each(componentVariants.ModelControls)(
    '%s keeps unsupported draft settings until the user explicitly clears them',
    async (variant) => {
      const user = userEvent.setup();
      const change = vi.fn();
      const { rerender } = render(
        <ModelControls
          variant={variant}
          capabilities={modelCapabilities}
          value={modelSettings}
          onValueChange={change}
        />,
      );
      await user.click(screen.getByRole('combobox', { name: 'Model' }));
      await user.click(screen.getByRole('option', { name: 'Atlas Research · Demo provider' }));
      const next = { ...modelSettings, modelId: 'atlas-research' };
      expect(change).toHaveBeenLastCalledWith(next);
      // No host update means the controlled selection remains unchanged.
      expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent('Atlas Fast');
      rerender(
        <ModelControls
          variant={variant}
          capabilities={modelCapabilities}
          value={next}
          onValueChange={change}
        />,
      );
      expect(screen.getByText('The selected mode is not supported by this model.')).toBeVisible();
      expect(
        screen.getByText('The selected temperature is not supported by this model.'),
      ).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Clear unsupported settings' }));
      expect(change).toHaveBeenLastCalledWith({
        ...next,
        modeId: undefined,
        temperature: undefined,
      });
    },
  );
  it.each(componentVariants.ModelControls)(
    '%s blocks stale edits and never invents missing usage',
    async (variant) => {
      const user = userEvent.setup();
      const change = vi.fn();
      render(
        <ModelControls
          variant={variant}
          stale
          capabilities={modelCapabilities}
          value={modelSettings}
          onValueChange={change}
          usage={{ ...modelUsage, source: '', cost: { amount: NaN, currency: 'USD', basis: '' } }}
        />,
      );
      expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
      if (variant === 'accordion')
        await user.click(screen.getByRole('button', { name: 'Usage and cost' }));
      expect(screen.queryByText('$0.0124')).not.toBeInTheDocument();
      expect(screen.getAllByText('Unknown')).toHaveLength(3);
      expect(change).not.toHaveBeenCalled();
    },
  );
  it('can remove a revoked tool without silently granting another tool', async () => {
    const change = vi.fn();
    const value = { ...modelSettings, toolIds: ['archive-records'] };
    render(<ModelControls capabilities={modelCapabilities} value={value} onValueChange={change} />);
    const blocked = screen.getByRole('checkbox', { name: /Archive records/ });
    expect(blocked).toBeChecked();
    await userEvent.click(blocked);
    expect(change).toHaveBeenCalledExactlyOnceWith({ ...value, toolIds: [] });
    expect(screen.getByRole('checkbox', { name: /Compare records/ })).toBeDisabled();
  });
  it('does not reserve host mode IDs for the default option', async () => {
    const change = vi.fn();
    render(
      <ModelControls
        capabilities={{
          ...modelCapabilities,
          models: [
            {
              ...modelCapabilities.models[0]!,
              modes: [{ id: 'default', label: 'Named host mode' }],
            },
          ],
        }}
        value={{ ...modelSettings, modeId: undefined }}
        onValueChange={change}
      />,
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Mode' }));
    await userEvent.click(screen.getByRole('option', { name: 'Named host mode' }));
    expect(change).toHaveBeenLastCalledWith({ ...modelSettings, modeId: 'default' });
  });
});
