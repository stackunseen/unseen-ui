import type { ReactNode } from 'react';

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wraps every case-insensitive whole-word occurrence of each query word in a <mark>, so "ai"
 * marks "AI" but not the inside of "maintain". Plain text in, React nodes out: nothing is
 * parsed as HTML, so search excerpts and titles from outside stay text.
 */
export function markMatches(text: string, query: string): ReactNode {
  const words = [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
  if (!text || words.length === 0) return text;
  const parts = text.split(
    new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
  );
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index}>{part}</mark> : part === '' ? null : part,
  );
}
