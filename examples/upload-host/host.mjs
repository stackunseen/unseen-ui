import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { mkdir, realpath, readdir, lstat, open, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  inspectUploadContext,
  inspectUploadCheckpoint,
  inspectUploadCommand,
  inspectUploadReceipt,
  uploadContextKey,
  uploadCommandKey,
} from '@stackunseen/ui-core/uploads';

export const uploadHostLimits = Object.freeze({
  fileBytes: 4 * 1024 * 1024,
  chunkBytes: 64 * 1024,
  resources: 8,
  receipts: 256,
  pendingOperations: 32,
  recordBytes: 10 * 1024 * 1024,
  previewCharacters: 20_000,
});
export class UploadHostError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const capabilities = Object.freeze({
  resume: 'supported',
  cancel: true,
  remove: true,
  maxFileBytes: uploadHostLimits.fileBytes,
  maxChunkBytes: uploadHostLimits.chunkBytes,
  source: 'local-disk-record',
  version: '1',
});
function accessRequest(input) {
  try {
    if (!input || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw 0;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (
      Reflect.ownKeys(descriptors).length !== 3 ||
      ['context', 'expectedRevision', 'available'].some(
        (key) => !descriptors[key] || !('value' in descriptors[key]),
      )
    )
      throw 0;
    const context = inspectUploadContext(descriptors.context.value),
      expectedRevision = descriptors.expectedRevision.value,
      available = descriptors.available.value;
    if (
      !context ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      typeof available !== 'boolean'
    )
      throw 0;
    return { context, expectedRevision, available };
  } catch {
    throw new UploadHostError(400, 'Invalid access fixture request.');
  }
}

/** One writer per storage directory. Rename commits bytes/checkpoint/receipts together.
 * No fsync or multi-process/crash-durability guarantee is made by this local demo.
 */
export async function createUploadHost(directory, options = {}) {
  const workspaceId = options.workspaceId ?? 'demo-workspace',
    threadId = options.threadId ?? 'thread-demo';
  if (
    !inspectUploadContext({
      workspaceId,
      threadId,
      attachmentId: 'validation',
      version: 'validation',
      uploadId: 'validation',
    })
  )
    throw new UploadHostError(400, 'Invalid host scope.');
  await mkdir(resolve(directory), { recursive: true, mode: 0o700 });
  const root = await realpath(resolve(directory)),
    resources = new Map(),
    originals = new Map(),
    storedVersions = new Set(),
    storedUploads = new Set();
  let queue = Promise.resolve(),
    pendingOperations = 0,
    closing = false,
    committedWrites = 0;
  const scope = (context) => {
    if (context.workspaceId !== workspaceId || context.threadId !== threadId)
      throw new UploadHostError(403, 'Upload context is outside this host scope.');
  };
  function context(input) {
    const value = inspectUploadContext(input);
    if (!value) throw new UploadHostError(400, 'Invalid upload context.');
    scope(value);
    return value;
  }
  function run(effect) {
    if (closing) return Promise.reject(new UploadHostError(410, 'Upload host closed.'));
    if (pendingOperations >= uploadHostLimits.pendingOperations)
      return Promise.reject(new UploadHostError(429, 'Pending upload operation capacity reached.'));
    pendingOperations++;
    const result = queue.then(effect);
    queue = result
      .catch(() => {})
      .finally(() => {
        pendingOperations--;
      });
    return result;
  }
  function resource(value) {
    const record = resources.get(uploadContextKey(value));
    if (!record) throw new UploadHostError(404, 'Exact upload resource is unavailable.');
    return record;
  }
  async function readRecord(path) {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > uploadHostLimits.recordBytes)
      throw new UploadHostError(500, 'Stored upload record is unavailable.');
    const handle = await open(path, 'r');
    try {
      const current = await handle.stat();
      if (current.dev !== info.dev || current.ino !== info.ino || !current.isFile())
        throw new UploadHostError(500, 'Stored upload identity changed while reading.');
      const chunks = [];
      let count = 0;
      for (;;) {
        const buffer = Buffer.alloc(64 * 1024),
          { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        count += bytesRead;
        if (count > uploadHostLimits.recordBytes)
          throw new UploadHostError(500, 'Stored upload record exceeds its bound.');
        chunks.push(buffer.subarray(0, bytesRead));
      }
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } finally {
      await handle.close();
    }
  }
  for (const name of await readdir(root)) {
    if (!/^[a-f0-9-]{36}\.record\.json$/.test(name)) continue;
    if (resources.size >= uploadHostLimits.resources)
      throw new UploadHostError(500, 'Stored resource window exceeds its bound.');
    let stored;
    try {
      stored = await readRecord(join(root, name));
    } catch {
      throw new UploadHostError(500, 'Stored upload record could not be validated.');
    }
    const checkpoint = inspectUploadCheckpoint(stored?.checkpoint);
    if (
      !stored ||
      Object.keys(stored).length !== 4 ||
      stored.format !== 1 ||
      !checkpoint ||
      typeof stored.content !== 'string' ||
      stored.content.length > Math.ceil(uploadHostLimits.fileBytes / 3) * 4 ||
      !Array.isArray(stored.receipts) ||
      stored.receipts.length > uploadHostLimits.receipts ||
      JSON.stringify(checkpoint.capabilities) !== JSON.stringify(capabilities)
    )
      throw new UploadHostError(500, 'Stored upload record is invalid.');
    scope(checkpoint.context);
    const versionKey = JSON.stringify([
      checkpoint.context.attachmentId,
      checkpoint.context.version,
    ]);
    if (storedVersions.has(versionKey) || storedUploads.has(checkpoint.context.uploadId))
      throw new UploadHostError(500, 'Stored upload version/session identity is duplicated.');
    storedVersions.add(versionKey);
    storedUploads.add(checkpoint.context.uploadId);
    const bytes = Buffer.from(stored.content, 'base64'),
      cleared = ['cancelled', 'removed'].includes(checkpoint.state);
    if (
      bytes.toString('base64') !== stored.content ||
      bytes.length !== (cleared ? 0 : checkpoint.receivedBytes) ||
      resources.has(uploadContextKey(checkpoint.context))
    )
      throw new UploadHostError(500, 'Stored upload bytes or identity are invalid.');
    const receipts = stored.receipts.map((value) => {
      const receipt = inspectUploadReceipt(value);
      if (
        !receipt ||
        uploadContextKey(receipt.command.context) !== uploadContextKey(checkpoint.context) ||
        (receipt.checkpoint && receipt.checkpoint.sha256 !== checkpoint.sha256) ||
        originals.has(receipt.command.commandId) ||
        originals.size >= uploadHostLimits.receipts ||
        !['applied', 'rejected'].includes(receipt.outcome)
      )
        throw new UploadHostError(500, 'Stored original upload receipts are invalid.');
      originals.set(receipt.command.commandId, receipt);
      return receipt;
    });
    if (checkpoint.state === 'ready') {
      const completed = receipts.findLast(
        (receipt) => receipt.outcome === 'applied' && receipt.command.operation === 'complete',
      );
      if (
        !completed ||
        completed.command.sha256 !== checkpoint.sha256 ||
        checkpoint.sha256 !== sha256(bytes)
      )
        throw new UploadHostError(500, 'Stored complete content digest is invalid.');
    }
    resources.set(uploadContextKey(checkpoint.context), {
      name,
      checkpoint,
      content: stored.content,
      receipts,
    });
  }
  async function persist(record, receipt) {
    const next = {
      ...record,
      receipts: receipt ? [...record.receipts, receipt] : record.receipts,
    };
    const bytes = Buffer.from(
      JSON.stringify({
        format: 1,
        checkpoint: next.checkpoint,
        content: next.content,
        receipts: next.receipts,
      }),
    );
    if (bytes.length > uploadHostLimits.recordBytes)
      throw new UploadHostError(413, 'Upload record exceeds the bounded disk envelope.');
    const target = join(root, record.name),
      temporary = join(root, `${randomUUID()}.tmp`);
    try {
      try {
        const current = await lstat(target);
        if (!current.isFile() || current.isSymbolicLink())
          throw new UploadHostError(500, 'Upload record target is unavailable.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
      await rename(temporary, target);
      committedWrites++;
      resources.set(uploadContextKey(next.checkpoint.context), next);
      if (receipt) originals.set(receipt.command.commandId, receipt);
      return next;
    } finally {
      await rm(temporary, { force: true });
    }
  }
  function nextCheckpoint(record, changes) {
    if (record.checkpoint.revision >= Number.MAX_SAFE_INTEGER)
      throw new UploadHostError(409, 'Upload revision capacity reached.');
    const next = inspectUploadCheckpoint({
      ...record.checkpoint,
      ...changes,
      revision: record.checkpoint.revision + 1,
    });
    if (!next) throw new UploadHostError(500, 'Host checkpoint could not be validated.');
    return next;
  }
  async function rejected(record, command, detail) {
    const receipt = inspectUploadReceipt({
      command,
      outcome: 'rejected',
      checkpoint: record.checkpoint,
      detail,
    });
    if (!receipt) throw new UploadHostError(500, 'Host receipt could not be validated.');
    await persist(record, receipt);
    return receipt;
  }
  const api = {
    list() {
      return run(() => ({
        workspaceId,
        threadId,
        capabilities,
        checkpoints: [...resources.values()].map((record) => record.checkpoint),
      }));
    },
    async checkpoint(input) {
      const requested = context(input);
      return run(() => resource(requested).checkpoint);
    },
    async lookup(input) {
      const original = inspectUploadCommand(input);
      if (!original) throw new UploadHostError(400, 'Invalid original upload command.');
      scope(original.context);
      return run(() => {
        const known = originals.get(original.commandId);
        if (known && uploadCommandKey(known.command) !== uploadCommandKey(original))
          throw new UploadHostError(409, 'Command ID belongs to a different original request.');
        return known ?? inspectUploadReceipt({ command: original, outcome: 'not-found' });
      });
    },
    command(input, inputBytes) {
      // Copy caller-owned bytes before entering the asynchronous serialized queue.
      let bytes;
      if (inputBytes !== undefined) {
        if (
          !(inputBytes instanceof Uint8Array) ||
          inputBytes.byteLength > uploadHostLimits.chunkBytes
        )
          return Promise.reject(new UploadHostError(413, 'Chunk exceeds its raw byte bound.'));
        bytes = Buffer.from(inputBytes);
      }
      const command = inspectUploadCommand(input);
      if (!command) return Promise.reject(new UploadHostError(400, 'Invalid upload command.'));
      return run(async () => {
        scope(command.context);
        if (command.operation === 'append') {
          if (!bytes || bytes.length !== command.byteLength || sha256(bytes) !== command.sha256)
            throw new UploadHostError(400, 'Chunk bytes do not match the original size/digest.');
        } else if (bytes !== undefined)
          throw new UploadHostError(400, 'Only append accepts raw chunk bytes.');
        const existing = originals.get(command.commandId);
        if (existing) {
          if (uploadCommandKey(existing.command) !== uploadCommandKey(command))
            throw new UploadHostError(409, 'Command ID belongs to a different original request.');
          return existing;
        }
        if (originals.size >= uploadHostLimits.receipts)
          throw new UploadHostError(429, 'Original receipt capacity reached; no automatic retry.');
        let record = resources.get(uploadContextKey(command.context));
        if (command.operation === 'begin') {
          if (record)
            return rejected(record, command, 'This exact upload resource already exists.');
          if (command.expectedRevision !== 0)
            throw new UploadHostError(409, 'A new upload must begin at revision zero.');
          if (command.file.sizeBytes > uploadHostLimits.fileBytes)
            throw new UploadHostError(413, 'File exceeds the local host byte bound.');
          if (resources.size >= uploadHostLimits.resources)
            throw new UploadHostError(
              429,
              'Resource capacity reached, including retained tombstones.',
            );
          if (
            [...resources.values()].some(
              ({ checkpoint }) =>
                checkpoint.context.uploadId === command.context.uploadId ||
                (checkpoint.context.attachmentId === command.context.attachmentId &&
                  checkpoint.context.version === command.context.version),
            )
          )
            throw new UploadHostError(
              409,
              'Upload session or immutable resource version already exists.',
            );
          const checkpoint = inspectUploadCheckpoint({
            ...command.file,
            context: command.context,
            revision: 1,
            state: 'uploading',
            access: 'available',
            receivedBytes: 0,
            sha256: command.sha256,
            capabilities,
          });
          if (!checkpoint)
            throw new UploadHostError(500, 'Host checkpoint could not be validated.');
          record = { name: `${randomUUID()}.record.json`, checkpoint, content: '', receipts: [] };
        } else {
          record = resource(command.context);
          if (record.checkpoint.access !== 'available')
            return rejected(record, command, 'Current resource access is unavailable.');
          if (record.checkpoint.revision !== command.expectedRevision)
            return rejected(
              record,
              command,
              'Upload revision changed; refresh the exact checkpoint.',
            );
          const prior = record.checkpoint;
          if (command.operation === 'append') {
            if (
              prior.state !== 'uploading' ||
              command.offset !== prior.receivedBytes ||
              command.offset + command.byteLength > prior.sizeBytes
            )
              return rejected(record, command, 'Chunk offset, state or file size changed.');
            const content = Buffer.concat([Buffer.from(record.content, 'base64'), bytes]);
            record = {
              ...record,
              content: content.toString('base64'),
              checkpoint: nextCheckpoint(record, { receivedBytes: content.length }),
            };
          } else if (command.operation === 'complete') {
            if (
              prior.state !== 'uploading' ||
              prior.receivedBytes !== prior.sizeBytes ||
              command.sha256 !== prior.sha256 ||
              sha256(Buffer.from(record.content, 'base64')) !== command.sha256
            )
              return rejected(
                record,
                command,
                'Complete requires every original byte and its digest.',
              );
            record = { ...record, checkpoint: nextCheckpoint(record, { state: 'ready' }) };
          } else if (command.operation === 'cancel') {
            if (prior.state !== 'uploading')
              return rejected(record, command, 'Upload cancellation is unavailable.');
            record = {
              ...record,
              content: '',
              checkpoint: nextCheckpoint(record, { state: 'cancelled' }),
            };
          } else {
            record = {
              ...record,
              content: '',
              checkpoint: nextCheckpoint(record, { state: 'removed', access: 'missing' }),
            };
          }
        }
        const receipt = inspectUploadReceipt({
          command,
          outcome: 'applied',
          checkpoint: record.checkpoint,
        });
        if (!receipt) throw new UploadHostError(500, 'Host receipt could not be validated.');
        await persist(record, receipt);
        return receipt;
      });
    },
    async setAccess(input) {
      const request = accessRequest(input);
      return run(async () => {
        scope(request.context);
        const record = resource(request.context);
        if (
          record.checkpoint.revision !== request.expectedRevision ||
          record.checkpoint.state === 'removed'
        )
          throw new UploadHostError(409, 'Access fixture scope/revision is obsolete.');
        const access = request.available ? 'available' : 'revoked';
        if (record.checkpoint.access === access) return record.checkpoint;
        const next = { ...record, checkpoint: nextCheckpoint(record, { access }) };
        await persist(next);
        return next.checkpoint;
      });
    },
    async content(input) {
      const requested = context(input);
      return run(() => {
        const record = resource(requested);
        if (record.checkpoint.access !== 'available')
          throw new UploadHostError(403, 'Original upload content is unavailable.');
        if (record.checkpoint.state !== 'ready')
          throw new UploadHostError(409, 'Original content requires a ready host checkpoint.');
        return { checkpoint: record.checkpoint, bytes: Buffer.from(record.content, 'base64') };
      });
    },
    async preview(input) {
      const requested = context(input),
        original = await api.content(requested);
      let text;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(original.bytes);
      } catch {
        throw new UploadHostError(415, 'Original content is not valid UTF-8 text.');
      }
      // Recheck after the awaited content operation so an intervening revocation wins.
      return run(() => {
        const current = resource(requested).checkpoint;
        if (current.access !== 'available' || current.revision !== original.checkpoint.revision)
          throw new UploadHostError(403, 'Preview access changed while reading.');
        return {
          checkpoint: current,
          text: text.slice(0, uploadHostLimits.previewCharacters),
          truncated: text.length > uploadHostLimits.previewCharacters,
        };
      });
    },
    diagnostics() {
      return { resources: resources.size, receipts: originals.size, committedWrites };
    },
    async close() {
      closing = true;
      await queue;
    },
  };
  return api;
}
