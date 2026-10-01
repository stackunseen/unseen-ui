import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModelControls } from '@ai-interaction/react';

import { componentVariants } from '../../shared/variants.js';
import {
  modelCapabilities,
  modelSettings,
  modelUsage,
} from '../../../../../apps/docs/lib/inspection-fixtures';

describe('model control semantics', () => {
  it.each(componentVariants.ModelControls)(
    '%s keeps tool names concise and separately describes unavailable access',
    async (variant) => {
      const user = userEvent.setup();
      const change = vi.fn();
      render(
        <ModelControls
          variant={variant}
          capabilities={modelCapabilities}
          value={{ ...modelSettings, toolIds: ['archive-records', 'removed-tool'] }}
          onValueChange={change}
        />,
      );
      if (variant === 'accordion') await user.click(screen.getByRole('button', { name: /Tools/ }));
      expect(screen.getByRole('group', { name: 'Tools' }).tagName).toBe('FIELDSET');
      const revoked = screen.getByRole('checkbox', { name: 'Archive records' });
      expect(revoked).toHaveAccessibleDescription('Write permission is not granted.');
      expect(revoked).toBeChecked();
      revoked.focus();
      await user.keyboard(' ');
      expect(change).toHaveBeenLastCalledWith({ ...modelSettings, toolIds: ['removed-tool'] });
      expect(revoked).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'removed-tool' })).toHaveAccessibleDescription(
        'No longer advertised. Uncheck to remove.',
      );
    },
  );

  it.each(componentVariants.ModelControls)(
    '%s explains an empty model list and disables the empty picker',
    (variant) => {
      render(
        <ModelControls
          variant={variant}
          capabilities={{ ...modelCapabilities, models: [], tools: [] }}
          value={{ modelId: '', toolIds: [] }}
          onValueChange={vi.fn()}
        />,
      );
      expect(screen.getByText('No models are advertised by this host.')).toBeVisible();
      expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
    },
  );

  it('exposes a stable temperature name and honest default value without changing settings', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <ModelControls
        capabilities={modelCapabilities}
        value={modelSettings}
        onValueChange={change}
      />,
    );
    expect(screen.getByRole('slider', { name: 'Temperature' })).toHaveAttribute(
      'aria-valuetext',
      '0.4',
    );
    rerender(
      <ModelControls
        capabilities={modelCapabilities}
        value={{ ...modelSettings, temperature: undefined }}
        onValueChange={change}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Temperature' });
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', 'Model default');
    expect(slider).toHaveAccessibleDescription(/Enable an override/);
    expect(change).not.toHaveBeenCalled();
  });

  it('identifies estimated token counts independently of cost', () => {
    render(
      <ModelControls
        capabilities={modelCapabilities}
        value={modelSettings}
        onValueChange={vi.fn()}
        usage={{ ...modelUsage, cost: undefined }}
      />,
    );
    expect(screen.getByText('Estimated input tokens')).toBeVisible();
    expect(screen.getByText('Estimated output tokens')).toBeVisible();
    expect(screen.getByText('Unknown')).toBeVisible();
  });
});
