import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { lstat, open, opendir, realpath } from 'node:fs/promises';

const hash = (value) => createHash('sha256').update(value).digest('hex');
export class FileHostError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
/** Read-only example broker. Hosts supply root/allowlist; browsers never choose a root. */
export async function createFileHost(directory, allowedPaths, workspaceId = 'demo-workspace') {
  const canonicalRoot = await realpath(resolve(directory)),
    allow = new Set(allowedPaths);
  let authorized = true,
    accessRevision = 1;
  function requireAccess() {
    if (!authorized) throw new FileHostError(403, 'Workspace file access denied.');
  }
  async function checkedPath(path) {
    const requested = join(canonicalRoot, path),
      stat = await lstat(requested);
    if (stat.isSymbolicLink())
      throw new FileHostError(403, 'Symbolic links are not readable by this demo.');
    const resolved = await realpath(requested),
      offset = relative(canonicalRoot, resolved);
    if (
      isAbsolute(offset) ||
      offset === '..' ||
      offset.startsWith('..\\') ||
      offset.startsWith('../')
    )
      throw new FileHostError(403, 'File is outside the demo workspace.');
    return { resolved, stat };
  }
  async function readBounded(path) {
    requireAccess();
    if (!allow.has(path)) throw new FileHostError(403, 'File is outside the host read allowlist.');
    const { resolved, stat } = await checkedPath(path);
    if (!stat.isFile() || stat.size > 65536)
      throw new FileHostError(413, 'File exceeds the demo text read limit.');
    const handle = await open(resolved, 'r');
    try {
      const current = await handle.stat();
      if (current.dev !== stat.dev || current.ino !== stat.ino || !current.isFile())
        throw new FileHostError(409, 'File identity changed before reading.');
      const buffer = Buffer.alloc(65537);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > 65536) throw new FileHostError(413, 'File exceeds the demo text read limit.');
      requireAccess();
      const bytes = buffer.subarray(0, length);
      let text;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        throw new FileHostError(415, 'File is not valid UTF-8 text.');
      }
      return {
        text,
        version: hash(bytes),
        sizeBytes: length,
        modifiedAt: Math.floor(current.mtimeMs),
      };
    } finally {
      await handle.close();
    }
  }
  async function snapshot() {
    requireAccess();
    const records = [];
    let folders = 0;
    async function walk(path = '', depth = 0) {
      if (depth > 12 || ++folders > 501)
        throw new FileHostError(413, 'Demo directory window exceeds its bounds.');
      const directory = await opendir(join(canonicalRoot, path));
      for await (const entry of directory) {
        requireAccess();
        if (entry.isSymbolicLink()) continue;
        const name = path ? `${path}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await checkedPath(name);
          await walk(name, depth + 1);
        } else if (entry.isFile()) {
          if (records.length >= 500 || name.length > 1024)
            throw new FileHostError(413, 'Demo file window exceeds its bounds.');
          const record = {
            id: hash(name).slice(0, 32),
            path: name,
            access: allow.has(name) ? 'available' : 'denied',
          };
          if (record.access === 'available') {
            try {
              Object.assign(record, await readBounded(name));
              delete record.text;
            } catch (error) {
              if (error instanceof FileHostError && error.status === 403) throw error;
              record.access = 'unknown';
            }
          }
          records.push(record);
        }
      }
    }
    await walk();
    records.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    requireAccess();
    return {
      files: records,
      context: { workspaceId, version: hash(JSON.stringify({ records, accessRevision })) },
    };
  }
  return {
    setAccess(value) {
      const next = value === true;
      if (next !== authorized) accessRevision++;
      authorized = next;
    },
    async window(pageIndex = 0, pageSize = 3) {
      requireAccess();
      if (
        !Number.isSafeInteger(pageIndex) ||
        pageIndex < 0 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 500
      )
        throw new FileHostError(400, 'Invalid file page.');
      const current = await snapshot(),
        start = pageIndex * pageSize;
      if (
        !Number.isSafeInteger(start) ||
        (current.files.length > 0 && start >= current.files.length) ||
        (current.files.length === 0 && start !== 0)
      )
        throw new FileHostError(400, 'File page is outside the current snapshot.');
      return {
        files: current.files.slice(start, start + pageSize),
        context: current.context,
        pagination: { pageIndex, pageSize, totalFiles: current.files.length },
      };
    },
    async open(request) {
      requireAccess();
      const policyRevision = accessRevision;
      if (
        !request ||
        typeof request !== 'object' ||
        Array.isArray(request) ||
        Object.keys(request).some(
          (key) =>
            !['workspaceId', 'snapshotVersion', 'fileId', 'path', 'fileVersion'].includes(key),
        ) ||
        ['workspaceId', 'snapshotVersion', 'fileId', 'path'].some(
          (key) => typeof request[key] !== 'string' || request[key].length > 1024,
        ) ||
        (request.fileVersion !== undefined && typeof request.fileVersion !== 'string')
      )
        throw new FileHostError(400, 'Invalid file opening request.');
      const current = await snapshot();
      if (
        request.workspaceId !== current.context.workspaceId ||
        request.snapshotVersion !== current.context.version
      )
        throw new FileHostError(409, 'File snapshot changed. Refresh before reading.');
      const record = current.files.find((file) => file.id === request.fileId);
      if (record && record.access !== 'available')
        throw new FileHostError(403, 'File is outside the host read allowlist.');
      if (!record || record.path !== request.path || record.version !== request.fileVersion)
        throw new FileHostError(409, 'File identity changed. Refresh before reading.');
      const data = await readBounded(record.path);
      if (data.version !== request.fileVersion)
        throw new FileHostError(409, 'File changed while the request was pending.');
      requireAccess();
      if (policyRevision !== accessRevision)
        throw new FileHostError(409, 'File access scope changed while reading.');
      return { request, outcome: 'read', text: data.text };
    },
  };
}
