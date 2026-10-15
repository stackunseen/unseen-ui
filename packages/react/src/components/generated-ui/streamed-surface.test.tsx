import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSurfaceParser, surfaceExampleProgram } from '@stackunseen/ui-core';
import { GeneratedUI } from './generated-ui.js';

describe('GeneratedUI with a streamed program', () => {
  it('renders the parser snapshot while streaming and lists dropped statements', () => {
    const parser = createSurfaceParser({ surfaceId: 'surface-stream', version: '1' });
    const lines = surfaceExampleProgram.split('\n');
    const partial = parser.push(`${lines.slice(0, 3).join('\n')}\n`);
    const { rerender } = render(
      <GeneratedUI surface={partial.surface} state="streaming" problems={partial.problems} />,
    );
    expect(screen.getByText('Open tickets')).toBeInTheDocument();
    expect(screen.queryByText(/could not be shown/)).toBeNull();
    const done = parser.push(`${lines.slice(3).join('\n')}\nbroken = metric("one")\n`);
    const final = parser.finish();
    expect(final.pending).toEqual([]);
    rerender(
      <GeneratedUI
        surface={final.surface}
        state="ready"
        problems={final.problems}
        onAction={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Assign the two oldest' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Open tickets' })).toBeInTheDocument();
    const notice = screen.getByText('1 statement could not be shown.');
    expect(notice.closest('[data-part="generated-problems"]')).toHaveTextContent(
      'Line 7: metric takes 2 arguments',
    );
    expect(done.statements).toBe(5);
  });
});
