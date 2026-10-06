'use client';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Attachment, Button, Select, VoiceControl } from '@stackunseen/ui';
import { BrowserVoiceHost } from './voice-host/host';
import { browserVoicePlatform } from './voice-host/platform';

const noSubscribe = () => () => {},
  noSnapshot = () => undefined;
export function VoiceExample() {
  const [host, setHost] = useState<BrowserVoiceHost>();
  const [variant, setVariant] = useState<'panel' | 'bar' | 'compact'>('panel');
  const [clip, setClip] = useState<{ blob: Blob; key: string; url: string }>();
  const snapshot = useSyncExternalStore(
    host?.subscribe ?? noSubscribe,
    host?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  useEffect(() => {
    const owner = new BrowserVoiceHost(browserVoicePlatform());
    setHost(owner);
    return () => owner.dispose();
  }, []);
  const context = snapshot?.capture.context,
    key = context && JSON.stringify(context);
  const blob = snapshot?.status === 'ready' ? snapshot.recording : undefined;
  useLayoutEffect(() => {
    if (!blob || !key) return;
    const url = URL.createObjectURL(blob);
    setClip({ blob, key, url });
    return () => URL.revokeObjectURL(url);
  }, [blob, key]);
  const currentClip = clip && clip.blob === blob && clip.key === key ? clip : undefined;
  const quiescent =
    !!snapshot &&
    !snapshot.capture.permissionRequestPending &&
    ['idle', 'complete', 'cancelled', 'interrupted', 'error'].includes(snapshot.capture.state);
  return (
    <section
      aria-label="Browser voice example"
      style={{ display: 'grid', gap: 16, minWidth: 0, maxWidth: 800 }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0 }}>Browser voice capture</h2>
        <p style={{ margin: 0 }}>
          Start explicitly to use the selected source. Generated test audio uses a silent 440 Hz
          source and the real browser recorder. Nothing is uploaded; no transcription provider is
          connected.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 12,
        }}
      >
        <label style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span>Presentation</span>
          <Select
            aria-label="Voice presentation"
            value={variant}
            onValueChange={(value) => setVariant(value as typeof variant)}
            options={[
              { value: 'panel', label: 'Panel' },
              { value: 'bar', label: 'Bar' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span>Audio source</span>
          <Select
            aria-label="Audio source"
            value={snapshot?.source ?? 'microphone'}
            disabled={!quiescent || snapshot?.status !== 'ready'}
            onValueChange={(value) => {
              if (context) host?.chooseSource(context, value as 'microphone' | 'synthetic');
            }}
            options={[
              { value: 'microphone', label: 'Microphone' },
              { value: 'synthetic', label: 'Generated test audio' },
            ]}
          />
        </label>
      </div>
      <VoiceControl
        variant={variant}
        capture={snapshot?.capture}
        transcription={snapshot?.transcription}
        status={snapshot?.status ?? 'loading'}
        connection="connected"
        devices={snapshot?.source === 'microphone' ? snapshot.devices : undefined}
        deviceId={snapshot?.deviceId}
        onRequestStart={(scope) => {
          void host?.start(scope);
        }}
        onRequestStop={(scope) => {
          host?.stop(scope);
        }}
        onRequestCancel={(scope) => {
          host?.cancel(scope);
        }}
        onRequestDeviceChange={(request) => {
          host?.chooseDevice(request);
        }}
      />
      {currentClip && context && (
        <Attachment
          name="Local recorded audio"
          state="ready"
          mediaType={blob?.type}
          sizeBytes={blob?.size}
          reference={{ attachmentId: context.captureId, version: context.version }}
          resource={{ attachmentId: context.captureId, version: context.version }}
          preview={{ kind: 'audio', src: currentClip.url }}
          detail={
            snapshot?.source === 'synthetic'
              ? 'Generated test audio; no physical microphone used.'
              : 'Local microphone capture; not uploaded.'
          }
        />
      )}
      <div
        role="group"
        aria-label="Local audio access and retention"
        style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}
      >
        <Button
          size="sm"
          variant="ghost"
          disabled={!quiescent || snapshot?.status !== 'ready' || !blob}
          onClick={() => {
            if (context) host?.clear(context);
          }}
        >
          Discard audio
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={
            !context ||
            (!!snapshot?.capture.permissionRequestPending && snapshot.status !== 'ready')
          }
          onClick={() => {
            if (context) host?.setAccess(context, snapshot?.status !== 'ready');
          }}
        >
          {snapshot?.status === 'ready' ? 'Revoke local access' : 'Restore local access'}
        </Button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ai-muted)' }}>
        Collection limit: 5 MiB / 60 seconds. Browser chunk delivery may be delayed. Cancelling a
        permission request cannot dismiss the browser's dialog; any late stream is stopped. Local
        access controls do not change browser permissions.
      </p>
    </section>
  );
}
