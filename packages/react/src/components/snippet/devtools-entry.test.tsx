import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Commit,
  EnvironmentVariables,
  PackageInfo,
  SchemaDisplay,
  Snippet,
  StackTrace,
  WebPreview,
} from '@stackunseen/ui/devtools';

describe('devtools entry', () => {
  it('copies a snippet and reports a clipboard failure honestly', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Snippet code="npm install @stackunseen/ui" prefix="$" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(writeText).toHaveBeenCalledWith('npm install @stackunseen/ui');
    expect(await screen.findByText(/Copy unavailable/)).toBeInTheDocument();
  });

  it('shows commit subject, short hash and toggles files', async () => {
    render(
      <Commit
        hash="abcdef1234567"
        message={'Fix search\n\nNormalize queries.'}
        author="Sam"
        files={[{ path: 'src/search.ts', status: 'modified', additions: 2, deletions: 1 }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Fix search' })).toBeVisible();
    expect(screen.getByText('abcdef1')).toBeVisible();
    expect(screen.queryByText('src/search.ts')).not.toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /1 file/ }));
    expect(screen.getByText('src/search.ts')).toBeVisible();
  });

  it('masks secret values until revealed', async () => {
    render(
      <EnvironmentVariables
        variables={[
          { name: 'API_URL', value: 'https://api.example' },
          { name: 'API_KEY', value: 'sk-test-123456', secret: true },
          { name: 'DB_PASSWORD', secret: true },
        ]}
      />,
    );
    expect(screen.queryByText('sk-test-123456')).toBeNull();
    expect(screen.getByText('Not shown')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Show API_KEY' }));
    expect(screen.getByText('sk-test-123456')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide API_KEY' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('summarizes a package change', () => {
    render(
      <PackageInfo name="react" currentVersion="18.3.1" newVersion="19.0.0" changeType="major" />,
    );
    expect(screen.getByText('18.3.1 → 19.0.0')).toBeVisible();
    expect(screen.getByText('Major')).toBeVisible();
  });

  it('renders nested schema fields with required markers', () => {
    render(
      <SchemaDisplay
        method="POST"
        path="/accounts"
        requestBody={[
          { name: 'name', type: 'string', required: true },
          { name: 'owner', type: 'object', children: [{ name: 'id', type: 'string' }] },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'POST /accounts' })).toBeVisible();
    expect(screen.getByText('required')).toBeVisible();
    expect(screen.getByText('id')).toBeVisible();
  });

  it('hides internal stack frames until requested and opens frames', async () => {
    const onOpenFrame = vi.fn();
    render(
      <StackTrace
        name="TypeError"
        message="x is undefined"
        onOpenFrame={onOpenFrame}
        frames={[
          { id: '1', fn: 'search', file: 'src/search.ts', line: 4 },
          { id: '2', fn: 'runMicrotasks', file: 'node:internal', internal: true },
        ]}
      />,
    );
    const frames = screen.getByRole('list', { name: 'Stack frames' });
    expect(within(frames).queryByText('runMicrotasks')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show 1 internal' }));
    expect(within(frames).getByText('runMicrotasks')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'src/search.ts:4' }));
    expect(onOpenFrame).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('sandboxes previews and refuses unsafe addresses', async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<WebPreview url="https://example.com" onNavigate={onNavigate} />);
    const frame = screen.getByTitle('Web preview');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
    const address = screen.getByRole('textbox', { name: 'Preview address' });
    await userEvent.clear(address);
    await userEvent.type(address, 'javascript:alert(1){Enter}');
    expect(onNavigate).not.toHaveBeenCalled();
    rerender(<WebPreview url="javascript:alert(1)" />);
    expect(screen.queryByTitle('Web preview')).toBeNull();
    expect(screen.getByText(/cannot be previewed/)).toBeVisible();
  });
});
