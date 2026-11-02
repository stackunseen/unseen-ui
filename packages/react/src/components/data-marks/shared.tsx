export { DataTable } from '../data-dots/shared.js';

/** A finite number, or null for a gap the application did not report. */
export const finite = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const plain = (value: number | null) =>
  value === null ? 'Not reported' : value.toLocaleString('en-US');

/** Default fills for slices without a swatch, in the order the library's charts use. */
export const swatches = [
  'var(--ai-primary, #18181b)',
  'var(--ai-secondary, #6366f1)',
  'var(--ai-success, #16a34a)',
  'var(--ai-warning, #d97706)',
  'var(--ai-muted, #71717a)',
];
