import type { VoicePlatform, AudioResource } from './host';

/** Browser APIs are reached only by explicit host operations, never by rendering. */
export function browserVoicePlatform(): VoicePlatform {
  return {
    supported: () =>
      typeof MediaRecorder !== 'undefined' &&
      typeof AudioContext !== 'undefined' &&
      window.isSecureContext &&
      !!navigator.mediaDevices?.getUserMedia,
    now: () => performance.now(),
    recorder: (stream) => new MediaRecorder(stream),
    open: async (source, deviceId): Promise<AudioResource> => {
      if (source === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId === '__default__' ? true : { deviceId: { exact: deviceId } },
        });
        return { stream, release: () => {} };
      }
      // Generated audio exercises the actual browser recorder without accessing hardware.
      const context = new AudioContext();
      let destination: MediaStreamAudioDestinationNode | undefined;
      try {
        const oscillator = context.createOscillator(),
          gain = context.createGain();
        destination = context.createMediaStreamDestination();
        oscillator.frequency.value = 440;
        gain.gain.value = 0.15;
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start();
        await context.resume();
        return {
          stream: destination.stream,
          release: async () => {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
            if (context.state !== 'closed') await context.close();
          },
        };
      } catch (error) {
        destination?.stream.getTracks().forEach((track) => track.stop());
        await context.close();
        throw error;
      }
    },
    measure: (stream) => {
      const context = new AudioContext();
      try {
        const source = context.createMediaStreamSource(stream),
          analyser = context.createAnalyser();
        const samples = new Float32Array(1024);
        analyser.fftSize = 1024;
        source.connect(analyser);
        void context.resume().catch(() => {});
        return {
          read: () => {
            if (context.state !== 'running') return undefined;
            analyser.getFloatTimeDomainData(samples);
            return Math.min(
              1,
              Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length),
            );
          },
          release: async () => {
            source.disconnect();
            analyser.disconnect();
            if (context.state !== 'closed') await context.close();
          },
        };
      } catch (error) {
        void context.close();
        throw error;
      }
    },
    devices: async () => [
      { value: '__default__', label: 'System default microphone' },
      ...(await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput' && device.deviceId !== 'default')
        .map((device, index) => ({
          value: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        })),
    ],
    watchDevices: (listener) => {
      navigator.mediaDevices.addEventListener('devicechange', listener);
      return () => navigator.mediaDevices.removeEventListener('devicechange', listener);
    },
    watchPermission: async (listener) => {
      const permission = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      const changed = () => listener(permission.state);
      permission.addEventListener('change', changed);
      changed();
      return () => permission.removeEventListener('change', changed);
    },
  };
}
