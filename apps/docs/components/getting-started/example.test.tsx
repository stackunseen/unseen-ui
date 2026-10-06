import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FirstExample } from './example';

describe('first component example', () => {
  it('saves a local name and keeps edits separate from the saved value', async () => {
    const user = userEvent.setup();
    render(<FirstExample />);
    const input = screen.getByRole('textbox', { name: 'Your name' });
    expect(input).toBeRequired();
    await user.type(input, 'Sam');
    expect(screen.getByRole('status')).toHaveTextContent('Nothing saved yet.');
    await user.click(screen.getByRole('button', { name: 'Save locally' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved locally: Sam');
    await user.type(input, ' Lee');
    expect(screen.getByRole('status')).toHaveTextContent('Saved locally: Sam');
  });
  it('documents the exact working source in the website and local guide', () => {
    const source = readFileSync('apps/docs/components/getting-started/example.tsx', 'utf8')
      .replaceAll(String.fromCharCode(13), '')
      .trim();
    for (const path of ['apps/docs/app/getting-started/page.mdx', 'docs/GETTING-STARTED.md']) {
      const guide = readFileSync(path, 'utf8').replaceAll(String.fromCharCode(13), '');
      expect(guide.replace("import '@stackunseen/ui/styles.css';\n", '')).toContain(source);
    }
  });
});
