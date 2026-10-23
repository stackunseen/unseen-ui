import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TerminalEmulator } from './terminal-emulator.js';

// Uses a mocked xterm engine to test lifecycle behavior.
const mock = vi.hoisted(() => ({ instances: [] as FixtureTerminal[] }));
interface FixtureTerminal {
  options: Record<string, unknown>;
  writes: { value: string; finish: () => void }[];
  reset: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  emit: (value: string) => void;
}
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options;
    cols = 80;
    rows = 12;
    element?: HTMLElement;
    writes: { value: string; finish: () => void }[] = [];
    reset = vi.fn();
    dispose = vi.fn(() => {
      this.data = undefined;
    });
    data?: (value: string) => void;
    parser = {
      registerOscHandler: vi.fn(() => ({ dispose: vi.fn() })),
      registerCsiHandler: vi.fn(() => ({ dispose: vi.fn() })),
    };
    buffer = { active: { viewportY: 0, baseY: 0 } };
    constructor(options: Record<string, unknown>) {
      this.options = options;
      mock.instances.push(this);
    }
    loadAddon() {}
    open(node: HTMLElement) {
      this.element = node;
      node.append(document.createElement('textarea'));
    }
    onData(callback: (value: string) => void) {
      this.data = callback;
      return {
        dispose: () => {
          this.data = undefined;
        },
      };
    }
    onScroll() {
      return { dispose: vi.fn() };
    }
    resize(columns: number, rows: number) {
      this.cols = columns;
      this.rows = rows;
    }
    write(value: string, finish: () => void) {
      this.writes.push({ value, finish });
    }
    scrollToBottom() {}
    hasSelection() {
      return false;
    }
    emit(value: string) {
      this.data?.(value);
    }
  },
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    proposeDimensions() {
      return { cols: 60, rows: 10 };
    }
  },
}));
const context = { sessionId: 'session', streamId: 'stream', version: '1' };
beforeEach(() => {
  mock.instances.length = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const base = {
  output: 'first',
  context,
  state: 'running' as const,
  connection: 'connected' as const,
  inputEnabled: true,
};
async function ready() {
  await waitFor(() =>
    expect(document.querySelector('[data-renderer-state="ready"]')).toBeInTheDocument(),
  );
  const instance = mock.instances[0];
  if (!instance) throw new Error('Terminal fixture was not initialized.');
  return instance;
}
describe('optional terminal renderer lifecycle', () => {
  it('serializes writes before resetting a replaced snapshot and then appends the latest data', async () => {
    const { rerender } = render(<TerminalEmulator {...base} />);
    const instance = await ready();
    expect(instance.writes.map((value) => value.value)).toEqual(['first']);
    rerender(<TerminalEmulator {...base} output="replacement" />);
    expect(instance.reset).not.toHaveBeenCalled();
    act(() => {
      instance.writes[0]!.finish();
    });
    expect(instance.reset).toHaveBeenCalledOnce();
    rerender(<TerminalEmulator {...base} output="replacement append" />);
    act(() => {
      instance.writes[1]!.finish();
    });
    expect(instance.writes.map((value) => value.value)).toEqual([
      'first',
      'replacement',
      ' append',
    ]);
  });
  it('binds bounded input to current scope, blocks disconnected requests and disposes on revocation', async () => {
    const input = vi.fn();
    const { rerender } = render(<TerminalEmulator {...base} onInput={input} />);
    const instance = await ready();
    act(() => {
      instance.emit('help\r');
    });
    expect(input).toHaveBeenCalledWith({ ...context, data: 'help\r' });
    rerender(<TerminalEmulator {...base} onInput={input} connection="disconnected" />);
    act(() => {
      instance.emit('exit\r');
    });
    expect(input).toHaveBeenCalledOnce();
    expect(instance.options.disableStdin).toBe(true);
    rerender(<TerminalEmulator {...base} onInput={input} />);
    act(() => {
      instance.emit('x'.repeat(1025));
    });
    expect(screen.getByText(/Input exceeds/)).toBeVisible();
    expect(input).toHaveBeenCalledOnce();
    rerender(<TerminalEmulator {...base} onInput={input} status="denied" />);
    expect(instance.dispose).toHaveBeenCalledOnce();
    expect(screen.queryByText('first')).toBeNull();
    act(() => {
      instance.emit('help');
    });
    expect(input).toHaveBeenCalledOnce();
  });
  it('does not initialize an emulator from a truncated mid-stream checkpoint', () => {
    render(<TerminalEmulator {...base} output={'x'.repeat(64001)} />);
    expect(mock.instances).toHaveLength(0);
    expect(screen.getByText(/complete bounded stream checkpoint/)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Plain terminal transcript' })).toHaveTextContent(
      'x'.repeat(64000),
    );
  });
  it('does not repeat a resize with an unknown callback outcome on disable/re-enable', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
    const resize = vi.fn(() => {
      throw new Error('Receipt lost');
    });
    const input = vi.fn();
    const { rerender } = render(<TerminalEmulator {...base} onInput={input} onResize={resize} />);
    await ready();
    expect(resize).toHaveBeenCalledOnce();
    expect(resize).toHaveBeenCalledWith({ ...context, columns: 60, rows: 10 });
    expect(screen.getByText(/whether the resize arrived/)).toBeVisible();
    rerender(
      <TerminalEmulator {...base} onInput={input} onResize={resize} submission="outcome-unknown" />,
    );
    rerender(<TerminalEmulator {...base} onInput={input} onResize={resize} />);
    expect(resize).toHaveBeenCalledOnce();
    rerender(
      <TerminalEmulator
        {...base}
        context={{ ...context, streamId: 'next' }}
        onInput={input}
        onResize={resize}
      />,
    );
    await waitFor(() => expect(resize).toHaveBeenCalledTimes(2));
    expect(mock.instances[0]?.dispose).toHaveBeenCalledOnce();
  });
});
