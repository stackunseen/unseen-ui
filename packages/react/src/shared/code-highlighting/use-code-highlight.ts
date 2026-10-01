'use client';
import { useEffect, useState } from 'react';
import type { CodeToken } from './code-tokens.js';
const aliases = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  css: 'css',
  html: 'html',
  python: 'python',
  py: 'python',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  sql: 'sql',
} as const;
type Language = (typeof aliases)[keyof typeof aliases];
function resolveLanguage(value?: string): Language | undefined {
  const label = value?.toLowerCase().trim();
  return label && Object.hasOwn(aliases, label)
    ? aliases[label as keyof typeof aliases]
    : undefined;
}
export function useCodeHighlight({
  code,
  language,
  streaming = false,
  highlight = true,
  revision,
}: {
  code: string;
  language?: string;
  streaming?: boolean;
  highlight?: boolean;
  revision?: string;
}) {
  const selected = resolveLanguage(language);
  const bounded =
    code.length <= 20000 &&
    code.split('\n').length <= 300 &&
    !code.split('\n').some((line) => line.length > 2000);
  const eligible = highlight && !streaming && Boolean(code) && Boolean(selected) && bounded;
  const [result, setResult] = useState<{
    code: string;
    language: Language;
    lines?: CodeToken[][];
    failed?: boolean;
    revision?: string;
  }>();
  useEffect(() => {
    if (!eligible || !selected) return;
    let active = true;
    void import('./highlight-engine.js')
      .then(({ tokenizeCode }) => tokenizeCode(code, selected, () => active))
      .then(
        (lines) => {
          if (active && lines) setResult({ code, language: selected, revision, lines });
        },
        () => {
          if (active) setResult({ code, language: selected, revision, failed: true });
        },
      );
    return () => {
      active = false;
    };
  }, [code, selected, eligible, revision]);
  const current =
    eligible &&
    result?.code === code &&
    result.language === selected &&
    result.revision === revision
      ? result
      : undefined;
  const state =
    !highlight || !code
      ? 'plain'
      : streaming
        ? 'streaming'
        : !selected
          ? 'unsupported'
          : !bounded
            ? 'limited'
            : current?.failed
              ? 'unavailable'
              : current?.lines
                ? 'highlighted'
                : 'loading';
  const notice = {
    unsupported: 'Syntax highlighting is not available for this language. Showing plain code.',
    limited: 'Code exceeds the syntax highlighting limit. Showing plain code.',
    unavailable: 'Syntax highlighting unavailable. Showing plain code.',
  }[state as 'unsupported' | 'limited' | 'unavailable'];
  return { lines: current?.lines, state, notice };
}
