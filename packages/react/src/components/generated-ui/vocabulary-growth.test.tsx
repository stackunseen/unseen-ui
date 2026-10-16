import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseSurfaceProgram } from '@stackunseen/ui-core';
import { GeneratedUI } from './generated-ui.js';
import { inspectGeneratedSurface } from './generated-model.js';

const program = `root = [intro, checks, risk, plan, totals, pick, chart]
intro = list(["Three tickets are open", "Two are older than a week"])
checks = list(["Reproduce", "Fix", "Release"], true)
risk = callout("warning", "Two tickets are past their target", "Both affect sign-in.")
plan = steps("Triage", [{id: "s1", label: "Collect", state: "done"}, {id: "s2", label: "Assign", state: "current"}, {id: "s3", label: "Close", state: "upcoming"}])
totals = metricGroup("This week", [{label: "Opened", value: "12"}, {label: "Closed", value: "9"}])
pick = options("Who should take the oldest ticket?", "assign-owner", [{value: "ana", label: "Ana", description: "On call"}, {value: "raj", label: "Raj"}])
chart = image("https://images.example.com/trend.png", "Open tickets per day, falling since Monday", "From the host's tracker")
`;
const surface = parseSurfaceProgram(program, { surfaceId: 'grow', version: '1' }).surface;
const scope = { surfaceId: 'grow', version: '1' };

describe('GeneratedUI vocabulary growth', () => {
  it('parses and validates every new node from the line format', () => {
    expect(parseSurfaceProgram(program, scope).problems).toEqual([]);
    expect(inspectGeneratedSurface(surface)).toBeDefined();
  });

  it('renders lists, callouts, steps and metric groups as inert content', () => {
    render(<GeneratedUI surface={surface} state="ready" onAction={() => {}} />);
    const numbered = screen.getAllByRole('list').find((list) => list.tagName === 'OL')!;
    expect(
      within(numbered)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Reproduce', 'Fix', 'Release']);
    expect(
      screen.getByText('Two tickets are past their target').closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByText('Both affect sign-in.')).toBeInTheDocument();
    expect(screen.getByText('Assign').closest('[aria-current]')).toHaveAttribute(
      'aria-current',
      'step',
    );
    const totals = screen.getByRole('group', { name: 'This week' });
    expect(within(totals).getByText('Opened')).toBeInTheDocument();
    expect(within(totals).getByText('9')).toBeInTheDocument();
  });

  it('loads a generated image only from an origin the host approved', () => {
    const { rerender } = render(<GeneratedUI surface={surface} state="ready" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText(
        /Image not loaded: the host has not approved https:\/\/images\.example\.com/,
      ),
    ).toBeInTheDocument();
    rerender(
      <GeneratedUI surface={surface} state="ready" imageOrigins={['https://images.example.com']} />,
    );
    expect(
      screen.getByRole('img', { name: 'Open tickets per day, falling since Monday' }),
    ).toHaveAttribute('src', 'https://images.example.com/trend.png');
  });

  it('sends the chosen value and marks a choice only from the host snapshot', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(
      <GeneratedUI surface={surface} state="ready" onAction={onAction} />,
    );
    const group = screen.getByRole('group', { name: 'Who should take the oldest ticket?' });
    expect(within(group).getByText('Ana: On call')).toBeInTheDocument();
    const raj = within(group).getByRole('button', { name: 'Raj' });
    expect(raj).not.toHaveAttribute('aria-pressed');
    await user.click(raj);
    expect(onAction).toHaveBeenCalledWith({
      ...scope,
      nodeId: 'pick',
      actionId: 'assign-owner',
      value: 'raj',
    });
    // Pressing did not mark anything; the host's snapshot does.
    expect(raj).not.toHaveAttribute('aria-pressed');
    rerender(
      <GeneratedUI
        surface={surface}
        state="ready"
        onAction={onAction}
        actionStates={[{ ...scope, actionId: 'assign-owner', status: 'complete', value: 'raj' }]}
      />,
    );
    expect(within(group).getByRole('button', { name: 'Raj' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Ana' })).toBeDisabled();
    expect(within(group).getByRole('status')).toHaveTextContent(
      'Host reported completion. Choice: Raj.',
    );
  });

  it.each([
    ['a success callout', { id: 'c', type: 'callout', tone: 'success', title: 'Done' }],
    [
      'duplicate choice values',
      {
        id: 'o',
        type: 'options',
        label: 'Pick',
        actionId: 'p',
        choices: [
          { value: 'a', label: 'A' },
          { value: 'a', label: 'Also A' },
        ],
      },
    ],
    [
      'a single choice',
      {
        id: 'o',
        type: 'options',
        label: 'Pick',
        actionId: 'p',
        choices: [{ value: 'a', label: 'A' }],
      },
    ],
    ['a script URL', { id: 'i', type: 'image', src: 'javascript:alert(1)', alt: 'x' }],
    [
      'credentials in the URL',
      { id: 'i', type: 'image', src: 'https://u:p@example.com/a.png', alt: 'x' },
    ],
    ['a blank alt', { id: 'i', type: 'image', src: 'https://example.com/a.png', alt: ' ' }],
    [
      'two current steps',
      {
        id: 's',
        type: 'steps',
        title: 'Plan',
        steps: [
          { id: 'a', label: 'A', state: 'current' },
          { id: 'b', label: 'B', state: 'current' },
        ],
      },
    ],
    ['an empty list', { id: 'l', type: 'list', items: [] }],
    ['an empty metric group', { id: 'm', type: 'metricGroup', title: 'Totals', metrics: [] }],
  ])('falls back for %s', (_, node) => {
    expect(inspectGeneratedSurface({ id: 's', version: '1', nodes: [node] })).toBeUndefined();
  });

  it('keeps action ids unique across actions and options', () => {
    expect(
      inspectGeneratedSurface({
        id: 's',
        version: '1',
        nodes: [
          { id: 'go', type: 'action', label: 'Go', actionId: 'same' },
          {
            id: 'pick',
            type: 'options',
            label: 'Pick',
            actionId: 'same',
            choices: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      }),
    ).toBeUndefined();
  });
});
