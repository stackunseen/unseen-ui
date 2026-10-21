import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Tabs } from './tabs.js';

function Settings() {
  const [value, setValue] = useState('general');
  return (
    <Tabs
      label="Settings sections"
      orientation="vertical"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'general', label: 'General', content: <p>Theme and language</p> },
        { value: 'data', label: 'Data controls', content: <p>Export and delete</p> },
      ]}
    />
  );
}

describe('Tabs orientation', () => {
  it('lists tabs vertically and moves with the up and down arrows', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const list = screen.getByRole('tablist', { name: 'Settings sections' });
    expect(list).toHaveAttribute('aria-orientation', 'vertical');
    await user.click(screen.getByRole('tab', { name: 'General' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Data controls' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Export and delete');
  });

  it('stays horizontal by default', () => {
    render(
      <Tabs
        label="Output"
        value="a"
        onValueChange={() => {}}
        items={[{ value: 'a', label: 'A', content: 'A' }]}
      />,
    );
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
  });
});
