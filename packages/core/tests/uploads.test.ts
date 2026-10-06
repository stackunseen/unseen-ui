import { describe, expect, it } from 'vitest';
import {
  inspectUploadCapabilities,
  inspectUploadCheckpoint,
  inspectUploadCommand,
  inspectUploadReceipt,
  inspectUploadContext,
  inspectUploadOperation,
  receiptMatchesUpload,
  uploadCommandKey,
} from '@stackunseen/ui-core/uploads';
import type { UploadCheckpoint, UploadCommand, UploadContext } from '@stackunseen/ui-core/uploads';
const context: UploadContext = {
  workspaceId: 'w',
  threadId: 't',
  attachmentId: 'a',
  version: 'content-1',
  uploadId: 'u',
};
const hash = 'a'.repeat(64);
const checkpoint = (patch: Partial<UploadCheckpoint> = {}): UploadCheckpoint => ({
  context,
  revision: 1,
  state: 'uploading',
  access: 'available',
  receivedBytes: 0,
  sha256: hash,
  name: 'notes.txt',
  mediaType: 'text/plain',
  sizeBytes: 4,
  capabilities: {
    resume: 'supported',
    cancel: true,
    remove: true,
    maxFileBytes: 4,
    maxChunkBytes: 2,
    source: 'host',
    version: '1',
  },
  ...patch,
});
const begin: UploadCommand = {
  commandId: 'begin',
  context,
  expectedRevision: 0,
  operation: 'begin',
  file: { name: 'notes.txt', mediaType: 'text/plain', sizeBytes: 4 },
  sha256: hash,
};
describe('pure upload boundary', () => {
  it('copies and freezes validated data without freezing host input', () => {
    const input = checkpoint();
    const result = inspectUploadCheckpoint(input)!;
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(Object.isFrozen(result.context)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(inspectUploadCapabilities(input.capabilities)?.resume).toBe('supported');
  });
  it('does not invoke getters or accept reflection failures, cycles, arrays or excess text', () => {
    let reads = 0;
    const getter = {
      ...context,
      get version() {
        reads++;
        return 'v';
      },
    };
    expect(inspectUploadContext(getter)).toBeUndefined();
    expect(reads).toBe(0);
    expect(
      inspectUploadContext(
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error();
            },
          },
        ),
      ),
    ).toBeUndefined();
    expect(
      inspectUploadCheckpoint({ ...checkpoint(), detail: 'x'.repeat(20_001) }),
    ).toBeUndefined();
    expect(inspectUploadContext([context])).toBeUndefined();
    const cyclic: Record<string, unknown> = { ...context };
    cyclic.loop = cyclic;
    expect(inspectUploadContext(cyclic)).toBeUndefined();
  });
  it.each([
    { receivedBytes: 5 },
    { state: 'ready', receivedBytes: 3 },
    { state: 'selected', receivedBytes: 1 },
    { state: 'removed', access: 'available' },
    { sha256: 'invalid' },
    { revision: -1 },
    { sizeBytes: 5 },
  ])('rejects contradictory or unsafe checkpoint %j', (patch) => {
    expect(inspectUploadCheckpoint({ ...checkpoint(), ...patch })).toBeUndefined();
  });
  it('keeps complete-file digest in begin identity and requires safe append range', () => {
    expect(inspectUploadCommand(begin)).toEqual(begin);
    expect(uploadCommandKey(begin)).not.toBe(
      uploadCommandKey({ ...begin, sha256: 'b'.repeat(64) }),
    );
    expect(
      inspectUploadCommand({
        ...begin,
        operation: 'append',
        file: undefined,
        offset: Number.MAX_SAFE_INTEGER,
        byteLength: 1,
      }),
    ).toBeUndefined();
    expect(
      inspectUploadCommand({
        commandId: 'x',
        context,
        expectedRevision: 1,
        operation: 'append',
        offset: Number.MAX_SAFE_INTEGER,
        byteLength: 1,
        sha256: hash,
      }),
    ).toBeUndefined();
  });
  it('binds applied begin to revision, metadata and complete-file digest', () => {
    const receipt = { command: begin, outcome: 'applied', checkpoint: checkpoint() };
    expect(inspectUploadReceipt(receipt)).toEqual(receipt);
    for (const patch of [
      { revision: 0 },
      { name: 'changed.txt' },
      { sha256: 'b'.repeat(64) },
      { receivedBytes: 1 },
      { state: 'ready' },
    ])
      expect(
        inspectUploadReceipt({ ...receipt, checkpoint: { ...checkpoint(), ...patch } }),
      ).toBeUndefined();
  });
  it('binds an append receipt to its exact committed end and host chunk limit', () => {
    const command: UploadCommand = {
      commandId: 'append',
      context,
      expectedRevision: 1,
      operation: 'append',
      offset: 0,
      byteLength: 2,
      sha256: hash,
    };
    expect(
      inspectUploadReceipt({
        command,
        outcome: 'applied',
        checkpoint: checkpoint({ revision: 2, receivedBytes: 2 }),
      }),
    ).toBeDefined();
    for (const patch of [
      { receivedBytes: 1 },
      { state: 'cancelled' },
      { capabilities: { ...checkpoint().capabilities, maxChunkBytes: 1 } },
    ])
      expect(
        inspectUploadReceipt({
          command,
          outcome: 'applied',
          checkpoint: { ...checkpoint({ revision: 2, receivedBytes: 2 }), ...patch },
        }),
      ).toBeUndefined();
  });
  it.each(['complete', 'cancel', 'remove'] as const)('checks applied %s lifecycle', (operation) => {
    const command: UploadCommand =
      operation === 'complete'
        ? { commandId: operation, context, expectedRevision: 2, operation, sha256: hash }
        : { commandId: operation, context, expectedRevision: 2, operation };
    const value = checkpoint({
      revision: 3,
      receivedBytes: 4,
      state: operation === 'complete' ? 'ready' : operation === 'cancel' ? 'cancelled' : 'removed',
      access: operation === 'remove' ? 'missing' : 'available',
    });
    expect(inspectUploadReceipt({ command, outcome: 'applied', checkpoint: value })).toBeDefined();
    expect(
      inspectUploadReceipt({
        command,
        outcome: 'applied',
        checkpoint: { ...value, state: 'uploading' },
      }),
    ).toBeUndefined();
    if (operation === 'complete')
      expect(
        inspectUploadReceipt({
          command,
          outcome: 'applied',
          checkpoint: { ...value, sha256: 'b'.repeat(64) },
        }),
      ).toBeUndefined();
  });
  it('does not manufacture a checkpoint for an unknown outcome; matches the entire original command', () => {
    const receipt = inspectUploadReceipt({ command: begin, outcome: 'unknown' })!;
    expect(receipt.checkpoint).toBeUndefined();
    expect(receiptMatchesUpload(begin, receipt)).toBe(true);
    expect(
      receiptMatchesUpload({ ...begin, context: { ...context, threadId: 'other' } }, receipt),
    ).toBe(false);
    expect(inspectUploadReceipt({ command: begin, outcome: 'applied' })).toBeUndefined();
    expect(inspectUploadOperation({ command: begin, state: 'outcome-unknown' })?.state).toBe(
      'outcome-unknown',
    );
    expect(inspectUploadOperation({ command: begin, state: 'ready' })).toBeUndefined();
  });
});
