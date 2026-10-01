import type { Server } from 'node:http';
import type { UploadHost } from './host.mjs';
export function createUploadServer(
  host: UploadHost,
  options?: { assetsDirectory?: string },
): Server;
