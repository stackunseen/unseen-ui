import type { Buffer } from 'node:buffer';
import type {
  UploadCapabilities,
  UploadCheckpoint,
  UploadCommand,
  UploadContext,
  UploadReceipt,
} from '@ai-interaction/core/uploads';
export class UploadHostError extends Error {
  status: number;
  constructor(status: number, message: string);
}
export const uploadHostLimits: Readonly<{
  fileBytes: number;
  chunkBytes: number;
  resources: number;
  receipts: number;
  pendingOperations: number;
  recordBytes: number;
  previewCharacters: number;
}>;
export interface UploadHost {
  list(): Promise<{
    checkpoints: UploadCheckpoint[];
    capabilities: UploadCapabilities;
    workspaceId: string;
    threadId: string;
  }>;
  checkpoint(context: unknown): Promise<UploadCheckpoint>;
  command(command: unknown, bytes?: Uint8Array): Promise<UploadReceipt>;
  lookup(original: unknown): Promise<UploadReceipt>;
  setAccess(request: {
    context: UploadContext;
    expectedRevision: number;
    available: boolean;
  }): Promise<UploadCheckpoint>;
  preview(
    context: unknown,
  ): Promise<{ checkpoint: UploadCheckpoint; text: string; truncated: boolean }>;
  content(context: unknown): Promise<{ checkpoint: UploadCheckpoint; bytes: Buffer }>;
  diagnostics(): { resources: number; receipts: number; committedWrites: number };
  close(): Promise<void>;
}
export function createUploadHost(
  directory: string,
  options?: { workspaceId?: string; threadId?: string },
): Promise<UploadHost>;
export type { UploadCommand };
