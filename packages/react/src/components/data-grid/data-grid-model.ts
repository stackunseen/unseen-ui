import type { DataGridPagination, DataGridSort } from './types.js';

export function nextSort(current: DataGridSort | null | undefined, columnId: string) {
  if (current?.columnId !== columnId) return { columnId, direction: 'asc' as const };
  return current.direction === 'asc' ? { columnId, direction: 'desc' as const } : null;
}

export function changeSelection(
  selected: readonly string[],
  affectedIds: readonly string[],
  checked: boolean,
) {
  const next = new Set(selected);
  affectedIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
  return [...next];
}

export function validIds(ids: readonly string[]) {
  return ids.every((id) => id.trim().length > 0) && new Set(ids).size === ids.length;
}

export function pageState(page: DataGridPagination, rowCount: number) {
  const { pageIndex, pageSize, totalRows } = page;
  const start = pageIndex * pageSize;
  const known = totalRows !== undefined;
  const pageCount = known ? Math.ceil(totalRows / pageSize) : undefined;
  const valid =
    Number.isSafeInteger(pageIndex) &&
    pageIndex >= 0 &&
    Number.isSafeInteger(pageSize) &&
    pageSize > 0 &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(start + rowCount) &&
    rowCount <= pageSize &&
    (!known ||
      (Number.isSafeInteger(totalRows) &&
        totalRows >= 0 &&
        (totalRows === 0 ? pageIndex === 0 && rowCount === 0 : pageIndex < pageCount!) &&
        start + rowCount <= totalRows));
  return {
    valid,
    start,
    pageCount,
    hasNext:
      valid &&
      pageIndex < Number.MAX_SAFE_INTEGER &&
      Number.isSafeInteger((pageIndex + 1) * pageSize) &&
      (known ? pageIndex + 1 < pageCount! : page.hasNextPage === true),
  };
}
