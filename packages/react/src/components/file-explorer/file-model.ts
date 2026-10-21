import { z } from 'zod';
import { boundedData } from '../../shared/bounded-data.js';

export interface WorkspaceFile {
  id: string;
  path: string;
  change?: 'added' | 'modified' | 'deleted';
  access?: 'available' | 'denied' | 'missing' | 'unknown';
  version?: string;
  sizeBytes?: number;
  /** Host-reported epoch milliseconds, displayed in UTC. */
  modifiedAt?: number;
  /** Lines changed in this file, as the host's diff counted them. */
  lines?: { added: number; removed: number };
}
export interface WorkspaceFileSnapshot {
  workspaceId: string;
  version: string;
}
export interface FileOpenRequest {
  workspaceId: string;
  snapshotVersion: string;
  fileId: string;
  path: string;
  fileVersion?: string;
}
export type WorkspaceFileSelection = FileOpenRequest;
export interface FilePage {
  pageIndex: number;
  pageSize: number;
  totalFiles?: number;
  hasNextPage?: boolean;
}
const id = z
  .string()
  .max(160)
  .refine(
    (value) =>
      Boolean(value.trim()) &&
      !['__proto__', 'constructor', 'prototype'].includes(value) &&
      !/[\p{Cc}\p{Surrogate}]/u.test(value),
  );
export function pathParts(path: string) {
  const normalized = path.replaceAll('\\', '/'),
    relative = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  const parts = relative.split('/');
  return path.length <= 1024 &&
    !/[\p{Cc}\p{Surrogate}]/u.test(path) &&
    !/^[a-z]:/i.test(relative) &&
    parts.length <= 13 &&
    parts.every((part) => Boolean(part.trim()) && !['.', '..'].includes(part))
    ? parts
    : undefined;
}
const path = z.string().refine((value) => Boolean(pathParts(value)));
const contextSchema = z.object({ workspaceId: id, version: id }).strict();
const fileSchema = z
  .object({
    id,
    path,
    change: z.enum(['added', 'modified', 'deleted']).optional(),
    access: z.enum(['available', 'denied', 'missing', 'unknown']).optional(),
    version: id.optional(),
    sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    modifiedAt: z.number().int().min(-8640000000000000).max(8640000000000000).optional(),
    lines: z
      .object({
        added: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        removed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      })
      .strict()
      .optional(),
  })
  .strict();
const pageSchema = z
  .object({
    pageIndex: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER - 1),
    pageSize: z.number().int().min(1).max(500),
    totalFiles: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    hasNextPage: z.boolean().optional(),
  })
  .strict();
const selectionSchema = z
  .object({ workspaceId: id, snapshotVersion: id, fileId: id, path, fileVersion: id.optional() })
  .strict();
export function inspectFileSelection(value: WorkspaceFileSelection | undefined) {
  if (!boundedData(value)) return undefined;
  const result = selectionSchema.safeParse(value);
  return result.success ? result.data : undefined;
}
export interface FileFolder {
  path: string;
  name: string;
  folders: Map<string, FileFolder>;
  files: WorkspaceFile[];
  count: number;
}
export function inspectFiles(
  files: readonly WorkspaceFile[],
  expandedPaths: readonly string[],
  context?: WorkspaceFileSnapshot,
  pagination?: FilePage,
  query = '',
) {
  if (
    !Array.isArray(files) ||
    files.length > 500 ||
    !Array.isArray(expandedPaths) ||
    expandedPaths.length > 500 ||
    !boundedData({ files, expandedPaths, context, pagination, query }, 500)
  )
    return undefined;
  const result = z
    .object({
      files: z.array(fileSchema),
      expandedPaths: z.array(z.string().max(1024)),
      context: contextSchema.optional(),
      pagination: pageSchema.optional(),
      query: z.string().max(200),
    })
    .safeParse({ files, expandedPaths, context, pagination, query });
  if (!result.success) return undefined;
  const data = result.data,
    byId = new Map(data.files.map((file) => [file.id, file]));
  const paths = data.files.map((file) => pathParts(file.path)!.join('/'));
  if (
    byId.size !== files.length ||
    new Set(paths).size !== paths.length ||
    new Set(expandedPaths).size !== expandedPaths.length
  )
    return undefined;
  const allFolders = new Set(
    paths.flatMap((path) =>
      path
        .split('/')
        .slice(0, -1)
        .map(
          (_, i) =>
            `/${path
              .split('/')
              .slice(0, i + 1)
              .join('/')}`,
        ),
    ),
  );
  if (
    allFolders.size > 500 ||
    paths.some((path) => allFolders.has(`/${path}`)) ||
    data.expandedPaths.some((value) => !value.startsWith('/') || !pathParts(value))
  )
    return undefined;
  if (data.pagination) {
    const { pageIndex, pageSize, totalFiles, hasNextPage } = data.pagination,
      start = pageIndex * pageSize;
    if (
      !Number.isSafeInteger(start) ||
      data.files.length > pageSize ||
      (totalFiles !== undefined &&
        (start > totalFiles ||
          (totalFiles > 0 && start >= totalFiles) ||
          data.files.length !== Math.min(pageSize, totalFiles - start) ||
          (hasNextPage !== undefined && hasNextPage !== start + pageSize < totalFiles)))
    )
      return undefined;
  }
  const filtered = data.files.filter((file) =>
    file.path.toLocaleLowerCase('en-US').includes(data.query.toLocaleLowerCase('en-US')),
  );
  const root: FileFolder = {
    path: '',
    name: '',
    folders: new Map(),
    files: [],
    count: filtered.length,
  };
  for (const file of filtered) {
    const parts = pathParts(file.path)!;
    let folder = root;
    for (const name of parts.slice(0, -1)) {
      const path = `${folder.path}/${name}`;
      if (!folder.folders.has(name))
        folder.folders.set(name, { path, name, folders: new Map(), files: [], count: 0 });
      folder = folder.folders.get(name)!;
      folder.count++;
    }
    folder.files.push(file);
  }
  const groups = new Map<string, WorkspaceFile[]>();
  for (const file of filtered) {
    const directory = pathParts(file.path)!.slice(0, -1).join('/');
    groups.set(directory, [...(groups.get(directory) ?? []), file]);
  }
  return {
    ...data,
    byId,
    allFolders,
    filtered,
    root,
    groups,
    obsoleteExpansion: data.expandedPaths.filter((value) => !allFolders.has(value)),
  };
}
export type FileModel = NonNullable<ReturnType<typeof inspectFiles>>;
export function fileRequest(context: WorkspaceFileSnapshot, file: WorkspaceFile): FileOpenRequest {
  return {
    workspaceId: context.workspaceId,
    snapshotVersion: context.version,
    fileId: file.id,
    path: file.path,
    ...(file.version === undefined ? {} : { fileVersion: file.version }),
  };
}
