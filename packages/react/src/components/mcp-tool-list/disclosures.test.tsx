import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MCPToolList } from './mcp-tool-list.js';

describe('repeated evidence and MCP disclosures', () => {
  it('keeps multiple MCP body groups named by the tool and its reported availability', async () => {
    const query = vi.fn();
    const { rerender } = render(
      <MCPToolList
        variant="accordion"
        tools={[
          {
            id: 'search',
            name: 'Search records',
            description: 'Read records.',
            availability: 'allowed',
          },
          {
            id: 'write',
            name: 'Write records',
            description: 'Change records.',
            availability: 'denied',
          },
        ]}
        query=""
        onQueryChange={query}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search records Allowed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Write records Denied' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Search records Allowed' })).toHaveTextContent(
      'Read records.',
    );
    expect(screen.getByRole('group', { name: 'Write records Denied' })).toHaveTextContent(
      'Change records.',
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter tools' }), 'search');
    expect(query).toHaveBeenCalled();
    rerender(<MCPToolList variant="accordion" tools={[]} query="search" onQueryChange={query} />);
    expect(screen.getByText('No matching tools.')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});
