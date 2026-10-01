# Voice capture and transcription

VoiceControl renders controlled host snapshots; rendering it never opens a microphone, records audio or contacts a speech provider.

## API and identity

Import VoiceControl and its types from `@ai-interaction/react`, with the existing opt-in `@ai-interaction/react/styles.css`. No new peer or package is required.

```tsx
<VoiceControl
  label="Message dictation"
  variant="bar"
  capture={host.capture}
  transcription={host.transcription}
  status={host.status}
  connection={connection}
  submission={submission}
  devices={host.devices}
  deviceId={host.deviceId}
  onRequestStart={requestStart}
  onRequestStop={requestStop}
  onRequestCancel={requestCancel}
  onRequestDeviceChange={requestDevice}
/>
```

`VoiceContext` is `{sessionId, captureId, version}`. Every advanced capture/transcription snapshot and action carries that exact identity. IDs are nonblank strings of at most 160 UTF-16 units, without control/surrogate characters. The host must validate current identity/access before processing an intent, rotate identity on replacement, and bind late results to their original operation. A component callback is not host acknowledgement or permission.

| Input | Meaning |
| --- | --- |
| `capture.state` | idle, requesting, recording, stopping, complete, cancelled, interrupted, error or unknown |
| `capture.permission` | unknown, prompt, granted, denied, unsupported or not-required; independent of capture completion |
| `capture.permissionRequestPending` | Required boolean: a host still awaits an uncancellable browser request; prevents a second Start even after cancellation |
| `transcription.state` | idle, unavailable, streaming, complete, error or unknown; independently scoped to its capture |
| `status` | ready, loading, denied, unavailable, error, unknown or stale; only ready permits actions |
| `connection` / `submission` | Independent connection and command acknowledgement; disconnected/unknown connection and submitting/acknowledged/outcome-unknown submissions lock actions |
| `elapsedMs`, `bytes`, `inputLevel`, `muted` | Reported measurements/state; absent measurements stay unknown. Input level is normalized amplitude while recording, not confidence or task progress |

Recording requires reported granted/not-required access. Stop is available only during recording. Cancel may be requested during requesting/recording/stopping/unknown outcomes. Missing scoped handlers do not fall back to unscoped callbacks. Read-only components show disabled controls; stale snapshots remain historical. Failed command submission retains prior host state and permits a new explicit request when otherwise eligible; unknown outcomes require host reconciliation.

Legacy `state`, `onStart`, `onStop`, `onCancel`, `transcript: {text, final}`, `inputLevel`, `error` and `onDeviceChange` remain compatible. Advanced `capture` takes precedence and should be supplied together with scoped `transcription`/callbacks. Legacy aggregate `processing` cannot establish whether capture has ended. Prefer the advanced contract for actual capture.

## Bounds and visibility

Capture/error metadata uses strict validation and bounded plain data. Elapsed time must be finite/nonnegative, bytes must be a nonnegative safe integer, and reported recording amplitude must be finite in [0, 1]. Invalid snapshots hide data and disable actions.

The device window is complete, at most 50 unique identities, with labels at most 240 units. Invalid/oversized windows are rejected rather than silently truncated. A selected device absent from the supplied window disables Start but leaves an available replacement selector usable. Device changes are explicit scoped requests, never automatic substitution. Host enumeration and browser permission remain independent.

Transcripts are plain inert text, capped at 20,000 UTF-16 units; error text is capped at 1,000. Accessors and invalid/throwing object shapes are rejected. This is bounded validation, not arbitrary proxy isolation or a hard CPU/memory deadline. Obsolete transcripts are hidden. Denied/unavailable/loading/unknown/error availability hides text, devices and amplitude before inspection; stale data is labeled and not actionable.

Copy uses the exact completed transcript, including whitespace. Partial copying is disabled. Pending copy receipts are discarded after scope/text/access/connection/submission replacement, ABA changes or unmount. The component cannot revoke an earlier clipboard copy. Long text is a labeled, keyboard-focusable scroll area with a semantic focus ring.

## Placement and customization

- `panel`: summary, fields/measurement, trailing capture footer, transcript and collapsed details.
- `bar`: summary and trailing capture actions share a wrapping row; supporting content follows. Idle actions use small outline Buttons.
- `compact`: restrained leading boundary, smaller spacing, device options in an Accordion and a shorter transcript viewport.

Cancel and Copy are contextual IconButtons with accessible names. Stop remains labeled and prominent. Secondary/cancel precedes primary in DOM/keyboard order, with at least 8px separation. Coarse-pointer controls retain 44px minimum targets. Shared density, field gap, panel padding, colors, borders, corners and shadows apply; all layouts use existing scoped styling, Select, Accordion and LoadingIndicator.

Use distinct `label` values when multiple controls coexist: their capture-detail landmarks inherit that label. The `microphone` semantic icon accepts IconsProvider/instance fallback overrides. Missing icon overrides preserve labeled actions.

## Optional local browser host

`examples/consumer/src/voice-host/host.ts` owns immutable capture snapshots and cleanup; `platform.ts` supplies actual browser APIs. `voice-example.tsx` composes the canonical control, source/presentation selectors and version-bound Attachment audio preview. These files are examples, outside shipped packages/core. Build packages and the consumer, then run:

```sh
pnpm --filter @ai-interaction/consumer exec vite preview --host 127.0.0.1 --port 4178 --strictPort
```

Opening the example and selecting a source do not open audio. Start explicitly uses either exact-device getUserMedia or a generated 440 Hz Web Audio stream. The generated stream is not connected to speakers and does not use physical hardware. Both paths feed native MediaRecorder. Actual RMS is measured only while the analyzer runs; absent/suspended measurements stay unknown. Native audio preview has controls and no autoplay.

The host rejects overlapping permission requests. Cancellation/revocation/disposal invalidates the capture generation; a late stream is immediately stopped/released. A pending getUserMedia dialog cannot be dismissed programmatically, and the original promise may remain unresolved indefinitely. A cancelled request remains pending until that original result arrives. See [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Stop releases owned source tracks immediately and waits for final `dataavailable` followed by `stop` before publishing a complete Blob. A five-second finalization timeout yields unknown, discards audio and ignores late events. Unexpected stop/track termination yields interrupted, with mute/unmute represented independently. Explicit track.stop does not emit ended; cleanup cannot rely on that event. See [MediaRecorder.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop) and [MediaStreamTrack.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop).

Collected chunks are limited to 5 MiB; exceeding the limit discards the recording. A 60-second measured elapsed limit requests Stop. Browser delivery/timers may be delayed, so these are collection/soft-duration bounds, not hard native memory/clock guarantees. Device removal interrupts current capture; permissions/device watchers are optional and failure does not invent granted access. Local revoke/restore changes example access, not browser permission; restore stays idle and rotates scope.

Discard/replacement/revocation clears the retained Blob and revokes its preview URL. Disposal clears owned tracks, recorders, analyzers, timers, event listeners, watchers and subscribers; pending late acquisition still requires cleanup when it resolves.

The example has no upload, speech-to-text provider, persistence or credentials; it reports transcription unavailable. Generated-audio checks do not verify physical microphones, permission dialogs or device replacement. Test those paths, background lifecycle, mobile hardware and accessibility in your application.