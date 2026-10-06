import type {
  FileOpenRequest,
  FilePage,
  WorkspaceFile,
  WorkspaceFileSnapshot,
} from '@stackunseen/ui';
export class FileHostError extends Error {
  status: number;
  constructor(status: number, message: string);
}
export interface ReadOnlyFileHost {
  setAccess(value: boolean): void;
  window(
    pageIndex?: number,
    pageSize?: number,
  ): Promise<{ files: WorkspaceFile[]; context: WorkspaceFileSnapshot; pagination: FilePage }>;
  open(
    request: FileOpenRequest,
  ): Promise<{ request: FileOpenRequest; outcome: 'read'; text: string }>;
}
export function createFileHost(
  directory: string,
  allowedPaths: readonly string[],
  workspaceId?: string,
): Promise<ReadOnlyFileHost>;
