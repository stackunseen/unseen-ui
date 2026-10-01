import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserVoiceHost } from './host';
import type { AudioResource, VoicePlatform } from './host';

class Track extends EventTarget {
  readyState = 'live';
  muted = false;
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
}
class Recorder extends EventTarget {
  state = 'inactive';
  mimeType = 'audio/webm';
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
  });
  data(size: number) {
    const event = new Event('dataavailable');
    Object.defineProperty(event, 'data', { value: new Blob([new Uint8Array(size)]) });
    this.dispatchEvent(event);
  }
  finish() {
    this.dispatchEvent(new Event('stop'));
  }
}
const owners: BrowserVoiceHost[] = [];
function fixture() {
  const track = new Track(),
    recorder = new Recorder(),
    release = vi.fn(),
    measureRelease = vi.fn();
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  const resource: AudioResource = { stream, release };
  let permission: (state: 'granted' | 'denied' | 'prompt') => void = () => {},
    devicesChanged: () => void = () => {};
  const devices = vi.fn(async () => [
    { value: '__default__', label: 'Default microphone' },
    { value: 'headset', label: 'Headset' },
  ]);
  const removePermission = vi.fn(),
    removeDevices = vi.fn();
  const platform: VoicePlatform = {
    supported: () => true,
    open: vi.fn(async () => resource),
    recorder: () => recorder as unknown as MediaRecorder,
    now: () => Date.now(),
    measure: () => ({ read: () => 0.4, release: measureRelease }),
    devices,
    watchDevices: (listener) => {
      devicesChanged = listener;
      return removeDevices;
    },
    watchPermission: async (listener) => {
      permission = listener;
      return removePermission;
    },
  };
  const host = new BrowserVoiceHost(platform);
  owners.push(host);
  return {
    host,
    platform,
    track,
    recorder,
    release,
    resource,
    measureRelease,
    devices,
    permission: (state: 'granted' | 'denied' | 'prompt') => permission(state),
    devicesChanged: () => devicesChanged(),
    removePermission,
    removeDevices,
  };
}
afterEach(async () => {
  owners.splice(0).forEach((owner) => owner.dispose());
  vi.useRealTimers();
});
describe('local browser voice host', () => {
  it('does not open a source when a synchronous observer revokes the requesting scope', async () => {
    const { host, platform } = fixture();
    host.subscribe(() => {
      if (host.getSnapshot().capture.state === 'requesting')
        host.setAccess(host.getSnapshot().capture.context, false);
    });
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    expect(platform.open).not.toHaveBeenCalled();
    expect(host.getSnapshot().status).toBe('denied');
    expect(host.getSnapshot().capture.permissionRequestPending).toBe(false);
  });
  it('reentrant cancellation on recording does not leave a new timer or source', async () => {
    const { host, track } = fixture();
    host.subscribe(() => {
      if (host.getSnapshot().capture.state === 'recording')
        host.cancel(host.getSnapshot().capture.context);
    });
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    expect(host.getSnapshot().capture.state).toBe('cancelled');
    expect(track.readyState).toBe('ended');
    expect(host.diagnostics().timers).toBe(0);
  });
  it('reentrant stop cancellation retains cancelled state and creates no finalization timer', async () => {
    const { host } = fixture();
    await host.start(host.getSnapshot().capture.context);
    host.subscribe(() => {
      if (host.getSnapshot().capture.state === 'stopping')
        host.cancel(host.getSnapshot().capture.context);
    });
    expect(host.stop(host.getSnapshot().capture.context)).toBe(false);
    expect(host.getSnapshot().capture.state).toBe('cancelled');
    expect(host.diagnostics().timers).toBe(0);
  });
  it('does not touch capture APIs on creation and refuses stale/duplicate start requests', async () => {
    const { host, platform } = fixture(),
      scope = host.getSnapshot().capture.context;
    expect(platform.open).not.toHaveBeenCalled();
    expect(Object.isFrozen(host.getSnapshot().capture.context)).toBe(true);
    expect(await host.start({ ...scope, version: 'old' })).toBe(false);
    const starting = host.start(scope);
    expect(host.getSnapshot().capture.state).toBe('requesting');
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    expect(await starting).toBe(true);
    expect(platform.open).toHaveBeenCalledOnce();
    expect(host.getSnapshot().transcription.state).toBe('unavailable');
  });
  it('publishes completion only after final bytes and the actual stop event', async () => {
    const { host, recorder, track, release, measureRelease } = fixture();
    await host.start(host.getSnapshot().capture.context);
    recorder.data(10);
    const scope = host.getSnapshot().capture.context;
    expect(host.stop(scope)).toBe(true);
    expect(host.stop(scope)).toBe(false);
    expect(host.getSnapshot().capture.state).toBe('stopping');
    expect(host.getSnapshot().recording).toBeUndefined();
    expect(track.readyState).toBe('ended');
    recorder.data(20);
    recorder.finish();
    expect(host.getSnapshot().capture.state).toBe('complete');
    expect(host.getSnapshot().recording?.size).toBe(30);
    expect(host.getSnapshot().capture.bytes).toBe(30);
    expect(host.getSnapshot().transcription.state).toBe('unavailable');
    await host.settledCleanup();
    expect(release).toHaveBeenCalledOnce();
    expect(measureRelease).toHaveBeenCalledOnce();
    expect(host.diagnostics().timers).toBe(0);
    expect(host.diagnostics().eventListeners).toBe(0);
  });
  it('cancels a pending request without opening another and stops a late granted stream', async () => {
    const { host, platform, resource, track, release } = fixture();
    let grant!: (value: AudioResource) => void;
    platform.open = vi.fn(
      () =>
        new Promise<AudioResource>((resolve) => {
          grant = resolve;
        }),
    );
    const starting = host.start(host.getSnapshot().capture.context);
    host.cancel(host.getSnapshot().capture.context);
    expect(host.getSnapshot().capture.state).toBe('cancelled');
    expect(host.getSnapshot().capture.permissionRequestPending).toBe(true);
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    grant(resource);
    expect(await starting).toBe(false);
    await host.settledCleanup();
    expect(track.readyState).toBe('ended');
    expect(release).toHaveBeenCalledOnce();
    expect(host.getSnapshot().capture.permissionRequestPending).toBe(false);
    expect(host.getSnapshot().recording).toBeUndefined();
  });
  it('stops a late stream after disposal without republishing or retaining listeners', async () => {
    const { host, platform, resource, track } = fixture();
    let grant!: (value: AudioResource) => void;
    platform.open = () =>
      new Promise<AudioResource>((resolve) => {
        grant = resolve;
      });
    const subscriber = vi.fn();
    host.subscribe(subscriber);
    const starting = host.start(host.getSnapshot().capture.context);
    host.dispose();
    const count = subscriber.mock.calls.length;
    grant(resource);
    await starting;
    await host.settledCleanup();
    expect(track.readyState).toBe('ended');
    expect(subscriber).toHaveBeenCalledTimes(count);
    expect(host.diagnostics()).toMatchObject({
      disposed: true,
      pendingPermission: false,
      timers: 0,
      eventListeners: 0,
      subscribers: 0,
      cleanupTasks: 0,
    });
  });
  it('treats permission denial and unsupported APIs as separate reported outcomes', async () => {
    const { host, platform } = fixture();
    platform.open = async () => {
      throw Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
    };
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    expect(host.getSnapshot().capture.permission).toBe('denied');
    platform.supported = () => false;
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    expect(host.getSnapshot().capture.permission).toBe('unsupported');
  });
  it('drops cancelled bytes and obsolete device/capture scopes without replay', async () => {
    const { host, recorder } = fixture();
    const original = host.getSnapshot().capture.context;
    await host.start(original);
    recorder.data(20);
    expect(host.chooseDevice({ ...original, deviceId: 'headset' })).toBe(false);
    host.cancel(host.getSnapshot().capture.context);
    recorder.data(100);
    recorder.finish();
    expect(host.getSnapshot().recording).toBeUndefined();
    expect(host.getSnapshot().capture.state).toBe('cancelled');
    expect(host.chooseDevice({ ...host.getSnapshot().capture.context, deviceId: 'headset' })).toBe(
      true,
    );
    expect(host.getSnapshot().deviceId).toBe('headset');
    expect(host.getSnapshot().capture.state).toBe('idle');
    expect(host.clear(original)).toBe(false);
  });
  it('tracks mute independently and discards interrupted capture', async () => {
    vi.useFakeTimers();
    const { host, track, recorder } = fixture();
    await host.start(host.getSnapshot().capture.context);
    vi.advanceTimersByTime(100);
    expect(host.getSnapshot().capture.inputLevel).toBe(0.4);
    track.dispatchEvent(new Event('mute'));
    expect(host.getSnapshot().capture.muted).toBe(true);
    expect(host.getSnapshot().capture.state).toBe('recording');
    vi.advanceTimersByTime(100);
    expect(host.getSnapshot().capture.inputLevel).toBeUndefined();
    track.dispatchEvent(new Event('unmute'));
    vi.advanceTimersByTime(100);
    expect(host.getSnapshot().capture.inputLevel).toBe(0.4);
    recorder.data(20);
    track.dispatchEvent(new Event('ended'));
    expect(host.getSnapshot().capture.state).toBe('interrupted');
    expect(host.getSnapshot().recording).toBeUndefined();
    expect(host.diagnostics().timers).toBe(0);
  });
  it.each(['denied', 'prompt'] as const)(
    'redacts and rotates scope on permission becoming %s',
    async (permission) => {
      const { host, recorder, track, permission: update } = fixture();
      await host.start(host.getSnapshot().capture.context);
      await Promise.resolve();
      const scope = host.getSnapshot().capture.context;
      recorder.data(20);
      update(permission);
      expect(host.getSnapshot().status).toBe(permission === 'denied' ? 'denied' : 'unknown');
      expect(host.getSnapshot().capture.context).not.toEqual(scope);
      expect(host.getSnapshot().devices).toHaveLength(0);
      expect(host.getSnapshot().recording).toBeUndefined();
      expect(track.readyState).toBe('ended');
      expect(host.stop(scope)).toBe(false);
    },
  );
  it('discards an oversized chunk and records unknown finalization without completion', async () => {
    vi.useFakeTimers();
    const { host, recorder } = fixture();
    await host.start(host.getSnapshot().capture.context);
    recorder.data(5 * 1024 * 1024 + 1);
    expect(host.getSnapshot().capture.state).toBe('error');
    expect(host.getSnapshot().recording).toBeUndefined();
    expect(host.diagnostics().timers).toBe(0);
    const next = fixture();
    await next.host.start(next.host.getSnapshot().capture.context);
    next.recorder.data(20);
    next.host.stop(next.host.getSnapshot().capture.context);
    vi.advanceTimersByTime(5000);
    expect(next.host.getSnapshot().capture.state).toBe('unknown');
    next.recorder.finish();
    expect(next.host.getSnapshot().capture.state).toBe('unknown');
    expect(next.host.getSnapshot().recording).toBeUndefined();
  });
  it('uses measured elapsed time to stop at its soft limit, retaining delayed final acknowledgement', async () => {
    vi.useFakeTimers();
    const { host, recorder } = fixture();
    await host.start(host.getSnapshot().capture.context);
    vi.advanceTimersByTime(60000);
    expect(host.getSnapshot().capture.state).toBe('stopping');
    expect(recorder.stop).toHaveBeenCalledOnce();
    expect(host.getSnapshot().capture.elapsedMs).toBe(60000);
    recorder.data(20);
    recorder.finish();
    expect(host.getSnapshot().capture.state).toBe('complete');
  });
  it('clears retained audio with a new identity, revokes local access and disposes watchers', async () => {
    const { host, recorder, removeDevices, removePermission } = fixture();
    await host.start(host.getSnapshot().capture.context);
    await Promise.resolve();
    host.stop(host.getSnapshot().capture.context);
    recorder.data(20);
    recorder.finish();
    const scope = host.getSnapshot().capture.context;
    expect(host.clear(scope)).toBe(true);
    expect(host.getSnapshot().recording).toBeUndefined();
    expect(host.getSnapshot().capture.context).not.toEqual(scope);
    host.setAccess(host.getSnapshot().capture.context, false);
    expect(await host.start(host.getSnapshot().capture.context)).toBe(false);
    host.setAccess(host.getSnapshot().capture.context, true);
    expect(host.getSnapshot().status).toBe('ready');
    host.dispose();
    await host.settledCleanup();
    expect(removeDevices).toHaveBeenCalled();
    expect(removePermission).toHaveBeenCalled();
    expect(host.diagnostics()).toMatchObject({
      timers: 0,
      eventListeners: 0,
      watchers: 0,
      cleanupTasks: 0,
      cleanupErrors: 0,
    });
  });
});
