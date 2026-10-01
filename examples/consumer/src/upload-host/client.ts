import {
  inspectUploadCapabilities,
  inspectUploadCheckpoint,
  inspectUploadContext,
  inspectUploadReceipt,
  inspectUploadCommand,
  receiptMatchesUpload,
  sameUploadContext,
  uploadCommandKey,
} from '@ai-interaction/core/uploads';
import type {
  UploadCapabilities,
  UploadCheckpoint,
  UploadCommand,
  UploadOperation,
  UploadReceipt,
} from '@ai-interaction/core/uploads';

export interface UploadClientSnapshot {
  connected: boolean;
  busy: boolean;
  stale: boolean;
  paused: boolean;
  value?: UploadCheckpoint;
  operation?: UploadOperation;
  lastReceipt?: UploadReceipt;
  preview?: string;
  previewTruncated?: boolean;
  detail: string;
}
interface Dependencies {
  fetch?: typeof fetch;
  digest?: (bytes: Uint8Array) => Promise<string>;
  id?: () => string;
  timeoutMs?: number;
}
const bytesLimit = 4 * 1024 * 1024;
async function browserDigest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, '0')).join('');
}
function query(key: string, value: unknown): string {
  return `?${key}=${encodeURIComponent(JSON.stringify(value))}`;
}
/** Browser demo owner. No automatic mutation retries; only explicit exact-original lookup. */
export function createUploadClient(dependencies: Dependencies = {}) {
  const request = dependencies.fetch ?? fetch;
  const digest = dependencies.digest ?? browserDigest;
  const id = dependencies.id ?? (() => crypto.randomUUID());
  const timeoutMs = dependencies.timeoutMs ?? 10_000;
  let snapshot: UploadClientSnapshot = Object.freeze({
    connected: false,
    busy: false,
    stale: true,
    paused: false,
    detail: 'Connect to the local upload host to select a file.',
  });
  let capabilities: UploadCapabilities | undefined;
  let workspaceId = '',
    threadId = '';
  let fileBytes: Uint8Array | undefined;
  let generation = 0,
    disposed = false,
    pauseRequested = false;
  let pending: AbortController | undefined;
  const listeners = new Set<() => void>();
  function publish(value: Partial<UploadClientSnapshot>) {
    if (disposed) return;
    if (value.operation) value = { ...value, operation: Object.freeze({ ...value.operation }) };
    snapshot = Object.freeze({ ...snapshot, ...value });
    listeners.forEach((listener) => listener());
  }
  async function json(path: string, init?: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    pending = controller;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(`/api/uploads${path}`, { ...init, signal: controller.signal });
      // This demo wire boundary is independently bounded before JSON parsing.
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Upload response body unavailable.');
      const chunks: Uint8Array[] = [];
      let count = 0;
      try {
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          count += item.value.length;
          if (count > 100_000) throw new Error('Upload response exceeds its byte bound.');
          chunks.push(item.value);
        }
      } finally {
        await reader.cancel();
      }
      const data = new Uint8Array(count);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
      if (!response.ok) throw new Error('Local upload request was not acknowledged.');
      return parsed;
    } finally {
      clearTimeout(timer);
      if (pending === controller) pending = undefined;
    }
  }
  const post = (path: string, value: unknown) =>
    json(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  function blocked() {
    return disposed || snapshot.busy || !!snapshot.operation || !snapshot.connected;
  }
  function adopt(input: unknown): UploadCheckpoint {
    const checkpoint = inspectUploadCheckpoint(input);
    const current = snapshot.value;
    if (
      !checkpoint ||
      !current ||
      !sameUploadContext(checkpoint.context, current.context) ||
      checkpoint.sha256 !== current.sha256 ||
      checkpoint.name !== current.name ||
      checkpoint.mediaType !== current.mediaType ||
      checkpoint.sizeBytes !== current.sizeBytes ||
      checkpoint.revision < current.revision ||
      checkpoint.receivedBytes < current.receivedBytes
    )
      throw new Error('Upload checkpoint changed identity or regressed.');
    publish({ value: checkpoint, stale: false, preview: undefined, previewTruncated: undefined });
    return checkpoint;
  }
  function settle(original: UploadCommand, input: unknown) {
    const receipt = inspectUploadReceipt(input);
    if (!receipt || !receiptMatchesUpload(original, receipt))
      throw new Error('Upload receipt does not match the original command.');
    const current = snapshot.value;
    if (
      receipt.checkpoint &&
      current &&
      (receipt.checkpoint.sha256 !== current.sha256 ||
        receipt.checkpoint.name !== current.name ||
        receipt.checkpoint.mediaType !== current.mediaType ||
        receipt.checkpoint.sizeBytes !== current.sizeBytes)
    )
      throw new Error('Original receipt changed immutable file metadata.');
    // An original historical receipt remains valid after access/revision advances.
    if (receipt.checkpoint && current && receipt.checkpoint.revision >= current.revision)
      adopt(receipt.checkpoint);
    if (receipt.outcome === 'applied' || receipt.outcome === 'rejected') {
      publish({
        operation: undefined,
        lastReceipt: receipt,
        detail:
          receipt.outcome === 'applied'
            ? 'Host confirmed the original operation.'
            : (receipt.detail ?? 'Host rejected the operation.'),
      });
      return receipt.outcome === 'applied';
    }
    publish({
      operation: { command: original, state: 'outcome-unknown', detail: receipt.detail },
      lastReceipt: receipt,
      detail: 'The original outcome is still unknown. Check its receipt; do not resend.',
    });
    return false;
  }
  async function submit(original: UploadCommand, bytes?: Uint8Array) {
    const inspected = inspectUploadCommand(original);
    if (!inspected) return false;
    original = inspected;
    const epoch = generation;
    publish({ operation: { command: original, state: 'submitting' }, preview: undefined });
    try {
      const result = bytes
        ? await json('/append', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Upload-Command': encodeURIComponent(JSON.stringify(original)),
            },
            body: Uint8Array.from(bytes).buffer,
          })
        : await post('/command', original);
      if (disposed || epoch !== generation) return false;
      return settle(original, result);
    } catch {
      if (!disposed && epoch === generation)
        publish({
          operation: { command: original, state: 'outcome-unknown' },
          stale: true,
          detail: 'Response unavailable. The host may have committed this original command.',
        });
      return false;
    }
  }
  async function refreshCurrent() {
    const value = snapshot.value;
    if (!value) throw new Error('No selected upload.');
    const result = await json(`/checkpoint${query('context', value.context)}`);
    return adopt(result);
  }
  function command(operation: 'cancel' | 'remove'): UploadCommand {
    const value = snapshot.value!;
    return { commandId: id(), context: value.context, expectedRevision: value.revision, operation };
  }
  async function transfer() {
    if (blocked() || !snapshot.value || !fileBytes || snapshot.stale) return;
    const value = snapshot.value;
    if (
      value.access !== 'available' ||
      !['selected', 'uploading'].includes(value.state) ||
      (value.state === 'uploading' && value.capabilities.resume !== 'supported')
    )
      return;
    publish({ busy: true, paused: false });
    pauseRequested = false;
    try {
      if (value.state === 'selected') {
        if (
          !(await submit({
            commandId: id(),
            context: value.context,
            expectedRevision: 0,
            operation: 'begin',
            file: { name: value.name, mediaType: value.mediaType, sizeBytes: value.sizeBytes },
            sha256: value.sha256,
          }))
        )
          return;
      } else await refreshCurrent();
      while (!disposed && !pauseRequested && !snapshot.operation) {
        const checkpoint = snapshot.value!;
        if (checkpoint.access !== 'available' || checkpoint.state !== 'uploading') break;
        if (checkpoint.receivedBytes === checkpoint.sizeBytes) {
          await submit({
            commandId: id(),
            context: checkpoint.context,
            expectedRevision: checkpoint.revision,
            operation: 'complete',
            sha256: checkpoint.sha256,
          });
          break;
        }
        const chunk = fileBytes.slice(
          checkpoint.receivedBytes,
          checkpoint.receivedBytes + Math.min(checkpoint.capabilities.maxChunkBytes, 64 * 1024),
        );
        const chunkDigest = await digest(chunk);
        if (disposed || pauseRequested) break;
        if (
          !(await submit(
            {
              commandId: id(),
              context: checkpoint.context,
              expectedRevision: checkpoint.revision,
              operation: 'append',
              offset: checkpoint.receivedBytes,
              byteLength: chunk.length,
              sha256: chunkDigest,
            },
            chunk,
          ))
        )
          break;
      }
      if (pauseRequested)
        publish({
          paused: true,
          detail: 'Transfer paused at a confirmed checkpoint. The host upload remains open.',
        });
    } catch {
      publish({
        stale: true,
        detail: 'Current checkpoint unavailable. Refresh before continuing.',
      });
    } finally {
      publish({ busy: false });
    }
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    async connect() {
      if (disposed || snapshot.busy || snapshot.operation) return;
      publish({ busy: true });
      try {
        const result = (await json('')) as Record<string, unknown>;
        const inspected = inspectUploadCapabilities(result.capabilities);
        const scope = inspectUploadContext({
          workspaceId: result.workspaceId,
          threadId: result.threadId,
          attachmentId: 'probe',
          version: 'probe',
          uploadId: 'probe',
        });
        if (!inspected || !scope) throw new Error('Invalid host metadata.');
        if (
          snapshot.value &&
          (scope.workspaceId !== snapshot.value.context.workspaceId ||
            scope.threadId !== snapshot.value.context.threadId)
        )
          throw new Error('Host scope changed.');
        capabilities = inspected;
        workspaceId = scope.workspaceId;
        threadId = scope.threadId!;
        publish({
          connected: true,
          detail: 'Local disk host connected. Select a file up to 4 MiB.',
        });
      } catch {
        publish({
          connected: false,
          stale: true,
          detail: 'Host unavailable. Start pnpm uploads:serve and open http://127.0.0.1:4179/.',
        });
      } finally {
        publish({ busy: false });
      }
    },
    async select(file: File) {
      if (blocked() || !capabilities) return;
      if (file.size > Math.min(capabilities.maxFileBytes, bytesLimit)) {
        publish({ detail: 'File exceeds the 4 MiB demo limit.' });
        return;
      }
      const epoch = ++generation;
      publish({ busy: true, preview: undefined });
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.length !== file.size || bytes.length > bytesLimit)
          throw new Error('File size changed.');
        const hash = await digest(bytes);
        const value = inspectUploadCheckpoint({
          context: { workspaceId, threadId, attachmentId: id(), version: hash, uploadId: id() },
          revision: 0,
          state: 'selected',
          access: 'available',
          receivedBytes: 0,
          sha256: hash,
          name: file.name,
          mediaType: file.type || 'application/octet-stream',
          sizeBytes: bytes.length,
          capabilities,
        });
        if (!value) throw new Error('Invalid file metadata.');
        if (disposed || epoch !== generation) return;
        fileBytes = bytes;
        publish({
          value,
          stale: false,
          paused: false,
          lastReceipt: undefined,
          operation: undefined,
          detail:
            'Selected locally. Upload requests host acceptance; selection does not execute it.',
        });
      } catch {
        publish({ detail: 'File could not be read or validated.' });
      } finally {
        if (epoch === generation) publish({ busy: false });
      }
    },
    transfer,
    pause() {
      if (snapshot.busy && snapshot.operation) pauseRequested = true;
    },
    interrupt() {
      if (snapshot.busy && snapshot.operation) {
        pauseRequested = true;
        pending?.abort();
      }
    },
    async refresh() {
      if (
        disposed ||
        snapshot.busy ||
        !snapshot.value ||
        (snapshot.value.state === 'selected' && !snapshot.operation)
      )
        return;
      publish({ busy: true, stale: true });
      try {
        await refreshCurrent();
        publish({
          detail: 'Current host checkpoint refreshed; original unknown receipts remain unresolved.',
        });
      } catch {
        publish({ detail: 'Checkpoint unavailable; displayed data remains stale.' });
      } finally {
        publish({ busy: false });
      }
    },
    async lookup(original: UploadCommand) {
      if (
        disposed ||
        snapshot.busy ||
        !snapshot.operation ||
        uploadCommandKey(original) !== uploadCommandKey(snapshot.operation.command)
      )
        return;
      publish({ busy: true });
      try {
        settle(original, await json(`/receipt${query('original', original)}`));
        await refreshCurrent();
      } catch {
        publish({
          stale: true,
          detail: 'Original receipt lookup unavailable. Nothing was resent.',
        });
      } finally {
        publish({ busy: false });
      }
    },
    async mutate(operation: 'cancel' | 'remove') {
      if (blocked() || snapshot.stale || !snapshot.value || snapshot.value.access !== 'available')
        return;
      if (snapshot.value.state === 'selected') {
        if (operation === 'remove') {
          fileBytes = undefined;
          publish({
            value: undefined,
            preview: undefined,
            lastReceipt: undefined,
            detail: 'Local file selection removed. No host delete was requested.',
          });
        }
        return;
      }
      if (
        !snapshot.value.capabilities[operation] ||
        snapshot.value.state === 'removed' ||
        (operation === 'cancel' && snapshot.value.state !== 'uploading')
      )
        return;
      publish({ busy: true });
      try {
        await submit(command(operation));
      } finally {
        publish({ busy: false });
      }
    },
    async setAccess(available: boolean) {
      if (
        blocked() ||
        snapshot.stale ||
        !snapshot.value ||
        snapshot.value.state === 'selected' ||
        snapshot.value.state === 'removed'
      )
        return;
      publish({ busy: true, preview: undefined });
      try {
        adopt(
          await post('/access', {
            context: snapshot.value.context,
            expectedRevision: snapshot.value.revision,
            available,
          }),
        );
      } catch {
        publish({
          stale: true,
          detail: 'Access update unavailable; refresh before any other action.',
        });
      } finally {
        publish({ busy: false });
      }
    },
    async preview() {
      if (
        blocked() ||
        snapshot.stale ||
        !snapshot.value ||
        snapshot.value.state !== 'ready' ||
        snapshot.value.access !== 'available'
      )
        return;
      publish({ busy: true });
      try {
        const result = (await json(
          `/preview${query('context', snapshot.value.context)}`,
        )) as Record<string, unknown>;
        const checkpoint = adopt(result.checkpoint);
        if (
          checkpoint.state !== 'ready' ||
          checkpoint.access !== 'available' ||
          typeof result.text !== 'string' ||
          result.text.length > 20_000 ||
          typeof result.truncated !== 'boolean'
        )
          throw new Error('Invalid preview.');
        publish({ preview: result.text, previewTruncated: result.truncated });
      } catch {
        publish({
          preview: undefined,
          stale: true,
          detail: 'Safe text preview unavailable. Refresh to verify access.',
        });
      } finally {
        publish({ busy: false });
      }
    },
    async loseNextResponse() {
      if (blocked()) return;
      publish({ busy: true });
      try {
        await post('/drop-response', { enabled: true });
        publish({ detail: 'Next applied upload response will be lost after the disk commit.' });
      } catch {
        publish({ detail: 'Lost-response fixture could not be armed.' });
      } finally {
        publish({ busy: false });
      }
    },
    dispose() {
      disposed = true;
      generation++;
      pending?.abort();
      fileBytes = undefined;
      listeners.clear();
    },
  };
}
