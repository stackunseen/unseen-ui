import type {
  VoiceAvailability,
  VoiceCaptureSnapshot,
  VoiceContext,
  VoiceDevice,
  VoiceDeviceRequest,
  VoiceTranscription,
} from '@ai-interaction/react';

export interface AudioResource {
  stream: MediaStream;
  release: () => void | Promise<void>;
}
export interface VoicePlatform {
  supported: () => boolean;
  open: (source: 'microphone' | 'synthetic', deviceId: string) => Promise<AudioResource>;
  recorder: (stream: MediaStream) => MediaRecorder;
  now: () => number;
  measure?: (stream: MediaStream) => {
    read: () => number | undefined;
    release: () => void | Promise<void>;
  };
  devices?: () => Promise<VoiceDevice[]>;
  watchDevices?: (listener: () => void) => () => void;
  watchPermission?: (
    listener: (permission: 'granted' | 'denied' | 'prompt') => void,
  ) => Promise<(() => void) | undefined>;
}
export interface VoiceHostSnapshot {
  status: VoiceAvailability;
  capture: VoiceCaptureSnapshot;
  transcription: VoiceTranscription;
  source: 'microphone' | 'synthetic';
  devices: readonly VoiceDevice[];
  deviceId: string;
  recording?: Blob;
}
const identity = (scope: VoiceContext) =>
  JSON.stringify([scope.sessionId, scope.captureId, scope.version]);
const quiescent = ['idle', 'complete', 'cancelled', 'interrupted', 'error'];
const MAX_BYTES = 5 * 1024 * 1024,
  MAX_MS = 60_000;

/** Optional local host. No transport, transcription, storage or React dependency. */
export class BrowserVoiceHost {
  private snapshot: VoiceHostSnapshot;
  private listeners = new Set<() => void>();
  private revision = 1;
  private generation = 0;
  private disposed = false;
  private pending = false;
  private resource?: AudioResource;
  private recorder?: MediaRecorder;
  private measurement?: ReturnType<NonNullable<VoicePlatform['measure']>>;
  private chunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private finalTimer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;
  private removeEvents: (() => void)[] = [];
  private removeDevices?: () => void;
  private removePermission?: () => void;
  private cleanupTasks = new Set<Promise<void>>();
  private cleanupErrors = 0;
  constructor(
    private platform: VoicePlatform,
    sessionId = 'local-voice',
  ) {
    if (!sessionId.trim() || sessionId.length > 160 || /[\p{Cc}\p{Cs}]/u.test(sessionId))
      throw new Error('Invalid local voice session identity.');
    this.snapshot = this.freeze({
      status: 'ready',
      source: 'microphone',
      devices: [{ value: '__default__', label: 'System default microphone' }],
      deviceId: '__default__',
      capture: {
        context: { sessionId, captureId: 'capture-1', version: '1' },
        state: 'idle',
        permission: 'unknown',
        permissionRequestPending: false,
        source: 'microphone',
      },
      transcription: {
        context: { sessionId, captureId: 'capture-1', version: '1' },
        state: 'unavailable',
      },
    });
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  diagnostics = () => ({
    disposed: this.disposed,
    pendingPermission: this.pending,
    tracks: this.resource?.stream.getTracks().map((track) => track.readyState) ?? [],
    timers: Number(!!this.timer) + Number(!!this.finalTimer),
    eventListeners: this.removeEvents.length,
    watchers: Number(!!this.removeDevices) + Number(!!this.removePermission),
    subscribers: this.listeners.size,
    cleanupTasks: this.cleanupTasks.size,
    cleanupErrors: this.cleanupErrors,
    bytes: this.snapshot.capture.bytes ?? 0,
  });
  async settledCleanup() {
    await Promise.all([...this.cleanupTasks]);
  }
  private freeze(value: VoiceHostSnapshot): VoiceHostSnapshot {
    return Object.freeze({
      ...value,
      capture: Object.freeze({
        ...value.capture,
        context: Object.freeze({ ...value.capture.context }),
      }),
      transcription: Object.freeze({
        ...value.transcription,
        context: Object.freeze({ ...value.transcription.context }),
      }),
      devices: Object.freeze(value.devices.map((device) => Object.freeze({ ...device }))),
    });
  }
  private publish(change: Partial<VoiceHostSnapshot>, capture?: Partial<VoiceCaptureSnapshot>) {
    if (this.disposed) return;
    this.snapshot = this.freeze({
      ...this.snapshot,
      ...change,
      capture: { ...this.snapshot.capture, ...capture },
    });
    this.listeners.forEach((listener) => listener());
  }
  private current(scope: VoiceContext) {
    return !this.disposed && identity(scope) === identity(this.snapshot.capture.context);
  }
  private ready(scope: VoiceContext) {
    return (
      this.current(scope) &&
      this.snapshot.status === 'ready' &&
      !this.pending &&
      quiescent.includes(this.snapshot.capture.state)
    );
  }
  private rotate(
    change: Partial<VoiceHostSnapshot> = {},
    capture: Partial<VoiceCaptureSnapshot> = {},
  ) {
    const context = {
      sessionId: this.snapshot.capture.context.sessionId,
      captureId: `capture-${++this.revision}`,
      version: String(this.revision),
    };
    this.publish(
      { recording: undefined, transcription: { context, state: 'unavailable' }, ...change },
      {
        context,
        bytes: undefined,
        elapsedMs: undefined,
        inputLevel: undefined,
        muted: undefined,
        error: undefined,
        ...capture,
      },
    );
  }
  private release(task: () => void | Promise<void>) {
    try {
      const promise = Promise.resolve(task())
        .catch(() => {
          this.cleanupErrors++;
        })
        .finally(() => {
          this.cleanupTasks.delete(promise);
        });
      this.cleanupTasks.add(promise);
    } catch {
      this.cleanupErrors++;
    }
  }
  private releaseResource(resource: AudioResource) {
    resource.stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        this.cleanupErrors++;
      }
    });
    this.release(() => resource.release());
  }
  private releaseCapture() {
    if (this.timer) clearInterval(this.timer);
    if (this.finalTimer) clearTimeout(this.finalTimer);
    this.timer = this.finalTimer = undefined;
    this.removeEvents.splice(0).forEach((remove) => remove());
    if (this.recorder?.state !== 'inactive') {
      try {
        this.recorder?.stop();
      } catch {
        this.cleanupErrors++;
      }
    }
    this.recorder = undefined;
    const measurement = this.measurement;
    if (measurement) this.release(() => measurement.release());
    this.measurement = undefined;
    if (this.resource) this.releaseResource(this.resource);
    this.resource = undefined;
    this.chunks = [];
  }
  private invalidate(state: VoiceCaptureSnapshot['state'], error?: string) {
    this.generation++;
    this.releaseCapture();
    this.publish(
      { recording: undefined },
      {
        state,
        inputLevel: undefined,
        muted: undefined,
        permissionRequestPending: this.pending,
        error,
      },
    );
  }
  async start(scope: VoiceContext): Promise<boolean> {
    if (!this.ready(scope)) return false;
    if (!this.platform.supported()) {
      this.publish(
        {},
        {
          state: 'error',
          permission: 'unsupported',
          error: 'Browser audio recording is unavailable.',
        },
      );
      return false;
    }
    const generation = ++this.generation,
      source = this.snapshot.source;
    this.pending = true;
    this.rotate(
      {},
      {
        state: 'requesting',
        permission: source === 'synthetic' ? 'not-required' : 'prompt',
        permissionRequestPending: true,
      },
    );
    if (this.disposed || generation !== this.generation || this.snapshot.status !== 'ready') {
      this.pending = false;
      this.publish({}, { permissionRequestPending: false });
      return false;
    }
    try {
      const resource = await this.platform.open(source, this.snapshot.deviceId);
      this.pending = false;
      if (this.disposed || generation !== this.generation || this.snapshot.status !== 'ready') {
        this.releaseResource(resource);
        this.publish({}, { permissionRequestPending: false });
        return false;
      }
      this.resource = resource;
      if (!resource.stream.getAudioTracks().some((track) => track.readyState === 'live'))
        throw new Error('Audio source has no live track.');
      const recorder = this.platform.recorder(resource.stream);
      this.recorder = recorder;
      this.startedAt = this.platform.now();
      this.chunks = [];
      const current = () => !this.disposed && generation === this.generation;
      const listen = (target: EventTarget, name: string, listener: EventListener) => {
        target.addEventListener(name, listener);
        this.removeEvents.push(() => target.removeEventListener(name, listener));
      };
      listen(recorder, 'dataavailable', (event) => {
        if (!current()) return;
        const data = (event as BlobEvent).data;
        if (
          !data ||
          !Number.isSafeInteger(data.size) ||
          data.size < 0 ||
          (this.snapshot.capture.bytes ?? 0) + data.size > MAX_BYTES
        ) {
          this.invalidate(
            'error',
            'Recording exceeded the 5 MiB collection limit. Audio was discarded.',
          );
          return;
        }
        if (data.size) this.chunks.push(data);
        this.publish({}, { bytes: (this.snapshot.capture.bytes ?? 0) + data.size });
      });
      listen(recorder, 'error', () => {
        if (current()) this.invalidate('error', 'Browser recording failed. Audio was discarded.');
      });
      listen(recorder, 'stop', () => {
        if (!current()) return;
        // A source can stop independently. Only an explicit finishing transition publishes audio.
        if (this.snapshot.capture.state !== 'stopping') {
          this.invalidate('interrupted', 'Audio source stopped unexpectedly.');
          return;
        }
        const blob = new Blob(this.chunks, { type: recorder.mimeType });
        const elapsedMs = Math.max(0, this.platform.now() - this.startedAt);
        this.releaseCapture();
        this.publish(
          { recording: blob.size ? blob : undefined },
          {
            state: blob.size ? 'complete' : 'error',
            bytes: blob.size,
            elapsedMs,
            inputLevel: undefined,
            muted: undefined,
            error: blob.size ? undefined : 'No audio bytes were returned.',
          },
        );
      });
      resource.stream.getAudioTracks().forEach((track) => {
        listen(track, 'ended', () => {
          if (current() && this.snapshot.capture.state === 'recording')
            this.invalidate('interrupted', 'Audio device disconnected. Audio was discarded.');
        });
        listen(track, 'mute', () => {
          if (current() && this.snapshot.capture.state === 'recording')
            this.publish({}, { muted: true, inputLevel: undefined });
        });
        listen(track, 'unmute', () => {
          if (current() && this.snapshot.capture.state === 'recording')
            this.publish({}, { muted: false });
        });
      });
      try {
        this.measurement = this.platform.measure?.(resource.stream);
      } catch {
        this.measurement = undefined;
      }
      recorder.start(250);
      this.publish(
        {},
        {
          state: 'recording',
          permission: source === 'synthetic' ? 'not-required' : 'granted',
          permissionRequestPending: false,
          bytes: 0,
          elapsedMs: 0,
          muted: resource.stream.getAudioTracks().some((track) => track.muted),
        },
      );
      if (!current()) return false;
      this.timer = setInterval(() => {
        if (!current() || this.snapshot.capture.state !== 'recording') return;
        const elapsedMs = Math.max(0, this.platform.now() - this.startedAt);
        let inputLevel: number | undefined;
        if (!this.snapshot.capture.muted) {
          try {
            inputLevel = this.measurement?.read();
          } catch {
            inputLevel = undefined;
          }
        }
        if (
          inputLevel !== undefined &&
          (!Number.isFinite(inputLevel) || inputLevel < 0 || inputLevel > 1)
        )
          inputLevel = undefined;
        this.publish({}, { elapsedMs, inputLevel });
        if (elapsedMs >= MAX_MS) this.stop(this.snapshot.capture.context);
      }, 100);
      if (source === 'microphone') this.attachMicrophoneWatch(generation);
      return true;
    } catch (error) {
      this.pending = false;
      if (this.disposed || generation !== this.generation) {
        this.publish({}, { permissionRequestPending: false });
        return false;
      }
      this.invalidate(
        'error',
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : 'Unable to open this audio source. Continue typing.',
      );
      this.publish(
        {},
        {
          permission:
            error instanceof Error && error.name === 'NotAllowedError' ? 'denied' : 'unknown',
          permissionRequestPending: false,
        },
      );
      return false;
    }
  }
  private attachMicrophoneWatch(generation: number) {
    this.removeDevices?.();
    this.removePermission?.();
    const refresh = async () => {
      try {
        const devices = await this.platform.devices?.();
        if (this.disposed || generation !== this.generation || !devices) return;
        if (
          devices.length > 50 ||
          new Set(devices.map((device) => device.value)).size !== devices.length ||
          devices.some(
            (device) =>
              !device.value.trim() ||
              device.value.length > 160 ||
              /[\p{Cc}\p{Cs}]/u.test(device.value) ||
              !device.label ||
              device.label.length > 240,
          )
        ) {
          this.invalidate('error', 'Microphone inventory is invalid or exceeds 50 devices.');
          this.publish({ devices: [] });
          return;
        }
        this.publish({ devices });
        if (
          !devices.some((device) => device.value === this.snapshot.deviceId) &&
          this.snapshot.capture.state === 'recording'
        )
          this.invalidate('interrupted', 'Selected device is no longer available.');
      } catch {
        /* Inventory failure does not invent a device list or permission result. */
      }
    };
    void refresh();
    this.removeDevices = this.platform.watchDevices?.(() => {
      void refresh();
    });
    void this.platform
      .watchPermission?.((permission) => {
        if (this.disposed || generation !== this.generation) return;
        if (permission === 'denied') this.setAccess(this.snapshot.capture.context, false);
        else if (permission === 'granted') this.publish({}, { permission: 'granted' });
        else {
          this.generation++;
          this.releaseCapture();
          this.removeDevices?.();
          this.removePermission?.();
          this.removeDevices = this.removePermission = undefined;
          this.rotate(
            { status: 'unknown', devices: [] },
            {
              state: 'interrupted',
              permission: 'unknown',
              error: 'Microphone access is no longer confirmed.',
            },
          );
        }
      })
      .then((remove) => {
        if (this.disposed || generation !== this.generation) remove?.();
        else this.removePermission = remove;
      })
      .catch(() => {
        /* Permissions API is optional; track interruption remains observable. */
      });
  }
  stop(scope: VoiceContext) {
    if (
      !this.current(scope) ||
      this.snapshot.status !== 'ready' ||
      this.snapshot.capture.state !== 'recording' ||
      !this.recorder
    )
      return false;
    const recorder = this.recorder,
      generation = this.generation;
    this.publish(
      {},
      {
        state: 'stopping',
        inputLevel: undefined,
        elapsedMs: Math.max(0, this.platform.now() - this.startedAt),
      },
    );
    if (
      generation !== this.generation ||
      this.getSnapshot().capture.state !== 'stopping' ||
      this.disposed
    )
      return false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.finalTimer = setTimeout(() => {
      if (generation === this.generation && this.snapshot.capture.state === 'stopping')
        this.invalidate('unknown', 'Final audio outcome was not acknowledged by the browser.');
    }, 5000);
    try {
      recorder.stop();
    } catch {
      this.invalidate('unknown', 'The stop request could not be confirmed. Audio was discarded.');
      return false;
    }
    if (this.resource) this.releaseResource(this.resource);
    this.resource = undefined;
    return true;
  }
  cancel(scope: VoiceContext) {
    if (
      !this.current(scope) ||
      !['requesting', 'recording', 'stopping', 'unknown'].includes(this.snapshot.capture.state)
    )
      return false;
    this.invalidate('cancelled');
    return true;
  }
  chooseDevice(request: VoiceDeviceRequest) {
    if (
      !this.ready(request) ||
      this.snapshot.source !== 'microphone' ||
      !this.snapshot.devices.some((device) => device.value === request.deviceId)
    )
      return false;
    this.generation++;
    this.releaseCapture();
    this.removeDevices?.();
    this.removePermission?.();
    this.removeDevices = this.removePermission = undefined;
    this.rotate({ deviceId: request.deviceId }, { state: 'idle', permission: 'unknown' });
    return true;
  }
  chooseSource(scope: VoiceContext, source: 'microphone' | 'synthetic') {
    if (!this.ready(scope)) return false;
    this.generation++;
    this.releaseCapture();
    this.removeDevices?.();
    this.removePermission?.();
    this.removeDevices = this.removePermission = undefined;
    this.rotate(
      {
        source,
        deviceId: source === 'microphone' ? '__default__' : 'test-tone',
        devices:
          source === 'microphone'
            ? [{ value: '__default__', label: 'System default microphone' }]
            : [],
      },
      { state: 'idle', source, permission: source === 'microphone' ? 'unknown' : 'not-required' },
    );
    return true;
  }
  clear(scope: VoiceContext) {
    if (!this.ready(scope)) return false;
    this.rotate({}, { state: 'idle' });
    return true;
  }
  setAccess(scope: VoiceContext, allowed: boolean) {
    if (!this.current(scope) || (allowed && this.pending)) return false;
    this.generation++;
    this.releaseCapture();
    this.removeDevices?.();
    this.removePermission?.();
    this.removeDevices = this.removePermission = undefined;
    this.rotate(
      {
        status: allowed ? 'ready' : 'denied',
        devices:
          allowed && this.snapshot.source === 'microphone'
            ? [{ value: '__default__', label: 'System default microphone' }]
            : [],
        deviceId: this.snapshot.source === 'microphone' ? '__default__' : 'test-tone',
      },
      {
        state: allowed ? 'idle' : 'interrupted',
        permission: allowed
          ? this.snapshot.source === 'synthetic'
            ? 'not-required'
            : 'unknown'
          : 'denied',
        permissionRequestPending: this.pending,
      },
    );
    return true;
  }
  dispose() {
    if (this.disposed) return;
    this.generation++;
    this.releaseCapture();
    this.removeDevices?.();
    this.removePermission?.();
    this.removeDevices = this.removePermission = undefined;
    this.listeners.clear();
    this.disposed = true;
  }
}
