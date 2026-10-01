import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../button/button.js';
import { Alert, AlertTitle, AlertDescription, AlertActions } from './alert.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('website feedback content', () => {
  it('keeps static alerts quiet, renders untrusted text inertly, and retains real actions', async () => {
    const retry = vi.fn();
    const content = '<script>notExecutable()</script>';
    const { container } = render(
      <Alert tone="danger">
        <AlertTitle>Could not save</AlertTitle>
        <AlertDescription>{content}</AlertDescription>
        <AlertActions>
          <Button onClick={retry}>Retry save</Button>
        </AlertActions>
      </Alert>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(content)).toBeVisible();
    expect(container.querySelector('script')).toBeNull();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Retry save' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('lets hosts explicitly choose announcement urgency independently of visual tone', () => {
    const { rerender } = render(
      <Alert role="status" tone="danger">
        Save failed.
      </Alert>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Save failed.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(
      <Alert role="alert" tone="neutral" icon={null}>
        Connection lost.
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost.');
    expect(screen.getByRole('alert').querySelector('[aria-hidden]')).toBeNull();
  });
});
