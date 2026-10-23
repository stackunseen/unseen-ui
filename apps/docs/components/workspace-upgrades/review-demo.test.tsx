import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReviewDemo } from './review-demo';

const preview = () => screen.getByLabelText('Acknowledged source preview');
const apply = () => screen.getByRole('button', { name: 'Apply selected changes' });
const deliver = () => screen.getByRole('button', { name: 'Deliver local server outcome' });
async function scenario(name: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Acknowledgement scenario' }));
  await userEvent.click(screen.getByRole('option', { name }));
}

describe('local precise review server composition', () => {
  it('acknowledges selected hunks and undoes the exact saved revision', async () => {
    render(<ReviewDemo />);
    expect(apply()).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /Sort results ascending/ }));
    await userEvent.click(apply());
    expect(apply()).toBeDisabled();
    expect(preview()).toHaveTextContent('const limit = 10;');
    await userEvent.click(deliver());
    expect(preview()).toHaveTextContent('const limit = 20;');
    expect(preview()).toHaveTextContent('const order = "desc";');
    expect(screen.getByText('Saved')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo selected saved changes' }));
    await userEvent.click(deliver());
    expect(preview()).toHaveTextContent('const limit = 10;');
    expect(screen.getByText('Changes undone')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeDisabled();
  });

  it('holds lost acknowledgement as unknown and finds the original receipt without replay', async () => {
    render(<ReviewDemo />);
    await scenario('Acknowledgement lost');
    await userEvent.click(apply());
    await userEvent.click(deliver());
    expect(screen.getByText('Outcome unknown')).toBeVisible();
    expect(apply()).toBeDisabled();
    expect(preview()).toHaveTextContent('const limit = 10;');
    await userEvent.click(screen.getByRole('button', { name: 'Check original command' }));
    expect(screen.getByText('Saved')).toBeVisible();
    expect(preview()).toHaveTextContent('const limit = 20;');
    expect(
      screen.queryByRole('button', { name: 'Check original command' }),
    ).not.toBeInTheDocument();
  });

  it('retains a per-file rejection while offering undo only for acknowledged effects', async () => {
    render(<ReviewDemo />);
    await scenario('One file rejected');
    await userEvent.click(apply());
    await userEvent.click(deliver());
    expect(screen.getByText(/docs\/query.md: Rejected/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /Include docs\/query.md/ }));
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeDisabled();
  });

  it('keeps discard terminal until a new local proposal is requested', async () => {
    render(<ReviewDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'Discard selected changes' }));
    await userEvent.click(deliver());
    expect(apply()).toBeDisabled();
    expect(preview()).toHaveTextContent('const limit = 10;');
    await userEvent.click(screen.getByRole('button', { name: 'New local proposal' }));
    expect(apply()).toBeEnabled();
  });

  it('exposes labelled controls and hunk selections to the keyboard', async () => {
    render(<ReviewDemo />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Acknowledgement scenario' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'New local proposal' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('checkbox', { name: /Include src\/query.ts/ })).toHaveFocus();
    await user.tab();
    const hunk = within(screen.getByRole('group', { name: 'Hunks in src/query.ts' })).getByRole(
      'checkbox',
      { name: /Increase result limit/ },
    );
    expect(hunk).toHaveFocus();
    await user.keyboard(' ');
    expect(hunk).not.toBeChecked();
  });
});
