import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Field } from '../field/field.js';
import { Slider } from './slider.js';

describe('Slider', () => {
  // Tests state and keyboard behavior in jsdom; pointer geometry and responsive layout need browser tests.
  beforeAll(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    ),
  );
  afterAll(() => vi.unstubAllGlobals());
  it('associates Field descriptions and updates units with keyboard changes and bounds', async () => {
    const commit = vi.fn();
    render(
      <Field labelAs="span" label="Duration" description="In minutes">
        <Slider
          min={10}
          max={30}
          step={5}
          defaultValue={[15]}
          getValueLabel={(value) => `${value} minutes`}
          onValueCommit={commit}
        />
      </Field>,
    );
    const slider = screen.getByRole('slider', { name: 'Duration' });
    expect(slider).toHaveAccessibleDescription('In minutes');
    expect(slider).toHaveAttribute('aria-valuetext', '15 minutes');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '20');
    expect(slider).toHaveAttribute('aria-valuetext', '20 minutes');
    await userEvent.keyboard('{End}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    expect(commit).toHaveBeenCalledWith([20]);
  });

  it('respects RTL arrows and explicit labels for range thumbs', async () => {
    render(
      <Slider
        dir="rtl"
        aria-label="Budget"
        min={0}
        max={100}
        step={10}
        defaultValue={[20, 80]}
        thumbLabels={['Minimum budget', 'Maximum budget']}
        minStepsBetweenThumbs={1}
      />,
    );
    const low = screen.getByRole('slider', { name: 'Minimum budget' });
    const high = screen.getByRole('slider', { name: 'Maximum budget' });
    low.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(low).toHaveAttribute('aria-valuenow', '30');
    high.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(high).toHaveAttribute('aria-valuenow', '70');
  });

  it('submits and resets values through the native form integration', async () => {
    render(
      <form aria-label="Settings">
        <Slider
          aria-label="Volume"
          name="volume"
          defaultValue={[20]}
          getValueLabel={(value) => `${value}%`}
        />
        <button type="reset">Reset</button>
      </form>,
    );
    const slider = screen.getByRole('slider');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '21');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('volume')).toBe('21');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(slider).toHaveAttribute('aria-valuenow', '20');
    expect(slider).toHaveAttribute('aria-valuetext', '20%');
  });

  it('does not change disabled or controlled values until the host updates them', async () => {
    const change = vi.fn();
    const { rerender } = render(<Slider aria-label="Volume" value={[20]} onValueChange={change} />);
    const slider = screen.getByRole('slider');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(change).toHaveBeenCalledWith([21]);
    expect(slider).toHaveAttribute('aria-valuenow', '20');
    rerender(
      <Field labelAs="span" label="Volume" disabled>
        <Slider value={[40]} onValueChange={change} />
      </Field>,
    );
    const disabled = screen.getByRole('slider');
    expect(disabled).toHaveAttribute('data-disabled');
    expect(disabled).not.toHaveAttribute('tabindex');
  });

  it('updates from host state and removes form listeners on unmount', async () => {
    function Example() {
      const [value, setValue] = useState([30]);
      return <Slider aria-label="Zoom" value={value} onValueChange={setValue} />;
    }
    const { unmount } = render(
      <form aria-label="Zoom form">
        <Example />
      </form>,
    );
    const form = screen.getByRole('form');
    screen.getByRole('slider').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '31');
    unmount();
    expect(() => act(() => fireEvent.reset(form))).not.toThrow();
  });
});
