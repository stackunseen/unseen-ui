import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StackTrace } from './stack-trace.js';
import { EnvironmentVariables } from '../environment-variables/environment-variables.js';
import { SchemaDisplay } from '../schema-display/schema-display.js';
import type { SchemaField } from '../schema-display/schema-display.js';
import { Commit } from '../commit/commit.js';

const clipboard = (writeText: (text: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

const frames = [
  { id: '1', fn: 'loadUser', file: 'src/user.ts', line: 12, column: 5 },
  { id: '2', fn: 'processTicks', file: 'node:internal/timers', line: 3, internal: true },
  { id: '3' },
];

describe('StackTrace', () => {
  it('hides internal frames until asked and names an unknown frame honestly', () => {
    render(<StackTrace name="TypeError" message="user is undefined" frames={frames} />);
    expect(screen.getByRole('heading', { level: 3, name: 'TypeError' })).toBeVisible();
    const list = screen.getByRole('list', { name: 'Stack frames' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent('src/user.ts:12:5');
    expect(list).toHaveTextContent('<anonymous>');
    expect(list).toHaveTextContent('unknown location');
    const toggle = screen.getByRole('button', { name: 'Show 1 internal' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Hide 1 internal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('opens a frame through the host only when it has a file', () => {
    const onOpenFrame = vi.fn();
    render(<StackTrace name="Error" message="m" frames={frames} onOpenFrame={onOpenFrame} />);
    fireEvent.click(screen.getByRole('button', { name: 'src/user.ts:12:5' }));
    expect(onOpenFrame).toHaveBeenCalledWith(frames[0]);
    expect(screen.queryByRole('button', { name: 'unknown location' })).toBeNull();
  });

  it('copies the whole trace, internal frames included, and reports the real outcome', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    render(<StackTrace name="TypeError" message="user is undefined" frames={frames} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy stack trace' }));
    expect(await screen.findByText('Copied')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(
      'TypeError: user is undefined\n    at loadUser (src/user.ts:12:5)\n    at processTicks (node:internal/timers:3)\n    at <anonymous> ()',
    );
    clipboard(() => Promise.reject(new Error('denied')));
    fireEvent.click(screen.getByRole('button', { name: 'Copy stack trace' }));
    expect(await screen.findByText('Copy unavailable')).toBeVisible();
  });
});

describe('EnvironmentVariables', () => {
  const variables = [
    { name: 'API_URL', value: 'https://api.example.com' },
    { name: 'API_KEY', value: 'sk-test-12345', secret: true },
    { name: 'DB_PASSWORD', secret: true },
  ];

  it('keeps a secret out of the page until the person reveals it', () => {
    const { container } = render(<EnvironmentVariables variables={variables} />);
    expect(container).toHaveTextContent('3 defined');
    expect(container).toHaveTextContent('https://api.example.com');
    expect(container).not.toHaveTextContent('sk-test-12345');
    const show = screen.getByRole('button', { name: 'Show API_KEY' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(show);
    expect(container).toHaveTextContent('sk-test-12345');
    fireEvent.click(screen.getByRole('button', { name: 'Hide API_KEY' }));
    expect(container).not.toHaveTextContent('sk-test-12345');
  });

  it('offers no reveal for a value the host did not send', () => {
    const { container } = render(<EnvironmentVariables variables={variables} />);
    expect(container).toHaveTextContent('Not shown');
    expect(screen.queryByRole('button', { name: /DB_PASSWORD$/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy DB_PASSWORD name' })).toBeVisible();
  });

  it('copies the name, never the value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    render(<EnvironmentVariables variables={variables} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy API_KEY name' }));
    expect(await screen.findByText('Copied')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('API_KEY');
  });

  it('says when nothing is reported', () => {
    render(<EnvironmentVariables variables={[]} title="Runtime" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Runtime' })).toBeVisible();
    expect(screen.getByText('No variables reported.')).toBeVisible();
  });
});

describe('SchemaDisplay', () => {
  it('shows only the sections that have fields, with required marks', () => {
    render(
      <SchemaDisplay
        method="POST"
        path="/v1/orders"
        description="Creates an order"
        parameters={[{ name: 'dryRun', type: 'boolean', in: 'query' }]}
        requestBody={[
          {
            name: 'items',
            type: 'array',
            required: true,
            children: [{ name: 'sku', type: 'string', description: 'Stock code' }],
          },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('POST/v1/orders');
    expect(screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)).toEqual([
      'Parameters',
      'Request body',
    ]);
    expect(screen.getByText('items').closest('li')).toHaveTextContent('required');
    expect(screen.getByText('sku').closest('li')).toHaveTextContent('Stock code');
    expect(screen.getByText('dryRun').closest('li')).not.toHaveTextContent('required');
  });

  it('stops at a fixed depth instead of rendering unbounded nesting', () => {
    let field: SchemaField = { name: 'leaf', type: 'string' };
    for (let depth = 8; depth >= 0; depth -= 1)
      field = { name: `level${depth}`, type: 'object', children: [field] };
    render(<SchemaDisplay method="GET" path="/deep" responseBody={[field]} />);
    expect(screen.getByText('level6')).toBeVisible();
    expect(screen.queryByText('level7')).toBeNull();
    expect(screen.getByText('Nested fields omitted.')).toBeVisible();
  });
});

describe('Commit', () => {
  const files = [
    { path: 'src/a.ts', status: 'modified' as const, additions: 4, deletions: 1 },
    { path: 'src/b.ts', status: 'added' as const },
  ];

  it('splits subject from body, shortens the hash and lists files on request', () => {
    render(
      <Commit
        hash="0123456789abcdef"
        message={'Fix retry loop\n\nStops after three attempts.'}
        author="Sam"
        files={files}
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Fix retry loop' })).toBeVisible();
    expect(screen.getByText('Stops after three attempts.')).toBeVisible();
    expect(screen.getByText('0123456')).toBeVisible();
    expect(screen.queryByText('0123456789abcdef')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2 files' }));
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('src/a.ts+4−1Modified');
    expect(rows[1]).toHaveTextContent('src/b.tsAdded');
  });

  it('copies the full hash and offers no file toggle without files', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    render(<Commit hash="0123456789abcdef" message="One line" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Copy commit hash' }));
    expect(await screen.findByText('Copied')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('0123456789abcdef');
  });
});
