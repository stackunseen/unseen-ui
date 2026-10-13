import type { ReactNode } from 'react';

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wraps every case-insensitive occurrence of each query word in a <mark>. Plain text in,
 * React nodes out: nothing is parsed as HTML, so search excerpts and titles from outside stay
 * text.
 */
export function markMatches(text: string, query: string): ReactNode {
  const words = [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
  if (!text || words.length === 0) return text;
  const parts = text.split(new RegExp(`(${words.map(escape).join('|')})`, 'gi'));
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index}>{part}</mark> : part === '' ? null : part,
  );
}
